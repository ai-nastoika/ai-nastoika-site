/**
 * Пересжимает уже загруженные фото в /uploads под те же пределы размера, что
 * теперь автоматически применяются к НОВЫМ загрузкам (см. api/lib/imageCompress.ts,
 * resizeUploadIfNeeded, и api/boot.ts). Существующие файлы этим правилом не были
 * затронуты — многие лежат в оригинальном размере с телефона, по нескольку
 * мегабайт, хотя показываются на странице от силы в несколько сотен пикселей.
 *
 * БЕЗОПАСНОСТЬ:
 *  - Без флага --apply ничего не меняет: только показывает отчёт (сколько файлов,
 *    насколько уменьшатся). Так и предлагается запускать первым делом.
 *  - Перед любым изменением файлов (--apply) сам делает полную резервную копию
 *    папки uploads рядом, с меткой времени, и печатает её путь.
 *  - Не трогает /uploads/labels (шаблоны этикеток — печатаются в оригинальном
 *    качестве) и любые файлы не-изображения (PDF-меню и т.п.).
 *  - Пропускает файлы, которые уже меньше целевого предела, — не пережимает то,
 *    что и так в порядке.
 *  - Один и тот же файл безопасно пересжать повторно (идемпотентно): если он уже
 *    в пределах, скрипт его не трогает.
 *
 * ЗАПУСК на сервере (из корня проекта, там же, где npm run build):
 *   npx tsx scripts/recompress-uploads.ts              — только отчёт, без изменений
 *   npx tsx scripts/recompress-uploads.ts --apply       — сделать бэкап и применить
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resizeUploadIfNeeded } from "../api/lib/imageCompress";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "..", "uploads");

// Те же пределы, что и в api/boot.ts для соответствующих маршрутов загрузки —
// специально держим их в одном месте по смыслу, чтобы не разъезжались.
const TARGETS: Record<string, number> = {
  recipes: 1600,
  places: 1600,
  "label-examples": 1600,
  trackers: 1400,
  avatars: 400,
  // menus — папка смешанная (PDF + фото меню); обрабатываем отдельно ниже,
  // пропуская PDF по расширению, с тем же пределом, что при загрузке.
  menus: 1800,
};

// labels — шаблоны этикеток для печати, сознательно не трогаем.
const SKIP_DIRS = new Set(["labels"]);

const IMAGE_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const apply = process.argv.includes("--apply");

type Row = { file: string; before: number; after: number; skipped?: string };

async function processDir(dirName: string, maxDimension: number): Promise<Row[]> {
  const dir = path.join(uploadsRoot, dirName);
  if (!fs.existsSync(dir)) return [];
  const rows: Row[] = [];

  for (const name of fs.readdirSync(dir)) {
    const ext = path.extname(name).toLowerCase();
    const mimeType = IMAGE_EXT[ext];
    const filePath = path.join(dir, name);
    if (!mimeType || !fs.statSync(filePath).isFile()) continue; // PDF и прочее — пропускаем молча

    const before = fs.statSync(filePath).size;
    const original = fs.readFileSync(filePath);
    let resized: Buffer;
    try {
      resized = await resizeUploadIfNeeded(original, mimeType, maxDimension);
    } catch (err) {
      rows.push({ file: `${dirName}/${name}`, before, after: before, skipped: `не удалось прочитать: ${(err as Error).message}` });
      continue;
    }

    // Пережимать имеет смысл только если реально стало меньше — на случай крошечных
    // файлов, где перекодирование иногда чуть увеличивает вес, оставляем как есть.
    if (resized.length >= before) {
      rows.push({ file: `${dirName}/${name}`, before, after: before, skipped: "уже компактный" });
      continue;
    }

    rows.push({ file: `${dirName}/${name}`, before, after: resized.length });
    if (apply) fs.writeFileSync(filePath, resized);
  }
  return rows;
}

function backupUploads(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.resolve(__dirname, "..", `uploads-backup-${stamp}`);
  fs.cpSync(uploadsRoot, dest, { recursive: true });
  return dest;
}

function fmt(bytes: number): string {
  return (bytes / 1024).toFixed(0) + " КБ";
}

async function main() {
  if (!fs.existsSync(uploadsRoot)) {
    console.error("Папка uploads не найдена рядом с проектом:", uploadsRoot);
    process.exit(1);
  }

  console.log(apply ? "Режим: ПРИМЕНИТЬ (файлы будут изменены)" : "Режим: ТОЛЬКО ОТЧЁТ (--apply ничего не менял)");
  console.log("Папки:", Object.keys(TARGETS).join(", "), "  (labels — пропущена: шаблоны для печати)\n");

  let backupPath: string | null = null;
  if (apply) {
    console.log("Делаю резервную копию uploads...");
    backupPath = backupUploads();
    console.log("Бэкап готов:", backupPath, "\n");
  }

  const dirs = fs.existsSync(uploadsRoot)
    ? fs.readdirSync(uploadsRoot).filter((d) => fs.statSync(path.join(uploadsRoot, d)).isDirectory())
    : [];
  const unknown = dirs.filter((d) => !SKIP_DIRS.has(d) && !(d in TARGETS));
  if (unknown.length) {
    console.log("Внимание: в uploads есть незнакомые папки, скрипт их не трогает:", unknown.join(", "), "\n");
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let touched = 0;

  for (const [dirName, maxDimension] of Object.entries(TARGETS)) {
    const rows = await processDir(dirName, maxDimension);
    if (rows.length === 0) continue;
    console.log(`── ${dirName}/ (лимит ${maxDimension}px) ──`);
    for (const r of rows) {
      totalBefore += r.before;
      totalAfter += r.after;
      if (r.skipped) {
        console.log(`  ${r.file}: ${fmt(r.before)} — пропущен (${r.skipped})`);
      } else {
        touched++;
        const pct = (100 * (1 - r.after / r.before)).toFixed(0);
        console.log(`  ${r.file}: ${fmt(r.before)} -> ${fmt(r.after)}  (-${pct}%)`);
      }
    }
    console.log();
  }

  console.log("═".repeat(60));
  console.log(`Файлов затронуто: ${touched}`);
  console.log(`Суммарно: ${fmt(totalBefore)} -> ${fmt(totalAfter)}` + (totalBefore > 0 ? `  (экономия ${(100 * (1 - totalAfter / totalBefore)).toFixed(0)}%)` : ""));
  if (!apply) {
    console.log("\nЭто был пробный прогон — ни один файл не изменён.");
    console.log("Проверьте цифры выше и, если всё устраивает, запустите:");
    console.log("  npx tsx scripts/recompress-uploads.ts --apply");
  } else {
    console.log("\nГотово. Резервная копия исходных файлов лежит здесь:");
    console.log(" ", backupPath);
    console.log("Если что-то пойдёт не так — папку можно вернуть на место вместо uploads.");
  }
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});
