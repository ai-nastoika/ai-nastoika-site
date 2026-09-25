/**
 * Пересжимает уже загруженные фото в /uploads под те же правила, что теперь
 * автоматически применяются к НОВЫМ загрузкам (см. api/lib/imageCompress.ts,
 * resizeUploadIfNeeded, и api/boot.ts). Существующие файлы этим правилом раньше
 * не были затронуты — многие лежат в оригинальном размере с телефона, по
 * нескольку мегабайт, хотя показываются на странице от силы в несколько сотен
 * пикселей. Отдельно: многие PNG (в частности почти все картинки, которые
 * рисует ИИ-парсер рецептов, recipe-ai-*.png) хранятся в формате без потерь,
 * хотя это обычные фотографии без единого прозрачного пикселя — такие теперь
 * конвертируются в JPEG, что даёт основную экономию (обычно 90%+ веса).
 *
 * ВАЖНО ПРО ПЕРЕИМЕНОВАНИЕ: когда формат меняется (PNG -> JPEG), у файла
 * меняется и расширение — старое имя перестаёт существовать. Путь к файлу
 * хранится в базе данных (recipes.hero_image, places.image и т.д.), поэтому
 * скрипт сам находит все строки, ссылающиеся на старый путь, и переписывает
 * их на новый — иначе рецепт остался бы с битой картинкой.
 *
 * БЕЗОПАСНОСТЬ:
 *  - Без флага --apply ничего не меняет: ни файлы, ни базу. Только отчёт —
 *    что будет сделано, включая сколько строк в базе будет переписано.
 *  - Перед любым изменением файлов (--apply) сам делает полную резервную
 *    копию папки uploads рядом, с меткой времени, и печатает её путь.
 *  - Не трогает /uploads/labels (шаблоны этикеток — печатаются в оригинальном
 *    качестве) и любые файлы не-изображения (PDF-меню и т.п.).
 *  - Пропускает файлы, которые уже в пределах нормы, — не пережимает то, что
 *    и так в порядке. Безопасно перезапускать повторно.
 *  - Использует то же подключение к базе, что и сам сайт (api/queries/connection,
 *    переменная DATABASE_URL из .env — подтягивается автоматически при импорте).
 *
 * ЗАПУСК на сервере (из корня проекта, там же, где npm run build):
 *   npx tsx scripts/recompress-uploads.ts              — только отчёт, без изменений
 *   npx tsx scripts/recompress-uploads.ts --apply       — сделать бэкап и применить
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq, sql } from "drizzle-orm";
import { resizeUploadIfNeeded } from "../api/lib/imageCompress";
import { getDb } from "../api/queries/connection";
import { recipes, places, placeSubmissions, labelExamples, users, infusionStages } from "../db/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "..", "uploads");

const TARGETS: Record<string, number> = {
  recipes: 1600,
  places: 1600,
  "label-examples": 1600,
  trackers: 1400,
  avatars: 400,
};

// labels — шаблоны этикеток для печати, сознательно не трогаем. menus — папка со
// смешанным содержимым (PDF + изредка фото меню, путь хранится в JSON-массиве
// places.menu_files, а не простой колонкой) — в эту версию скрипта не входит.
const SKIP_DIRS = new Set(["labels", "menus"]);

const IMAGE_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function extForMime(mimeType: string): string {
  return mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg";
}

const apply = process.argv.includes("--apply");

// Какие колонки в базе хранят путь к файлу из каждой папки — при переименовании
// (смене расширения) именно тут ищем и переписываем ссылки. Простые varchar-поля,
// один путь = одна строка в колонке (не JSON-массивы вроде places.menuFiles).
const DB_REFS: Record<string, { table: unknown; name: string; column: string }[]> = {
  recipes: [{ table: recipes, name: "recipes", column: "heroImage" }],
  places: [
    { table: places, name: "places", column: "image" },
    { table: placeSubmissions, name: "place_submissions", column: "image" },
  ],
  "label-examples": [{ table: labelExamples, name: "label_examples", column: "imageUrl" }],
  trackers: [{ table: infusionStages, name: "infusion_stages", column: "photoUrl" }],
  avatars: [{ table: users, name: "users", column: "avatar" }],
};

/** Считает (dry-run) или переписывает (apply) все строки, где column == oldPath. */
async function updateDbRefs(dirName: string, oldPath: string, newPath: string): Promise<string[]> {
  const refs = DB_REFS[dirName] ?? [];
  const notes: string[] = [];
  const db = getDb();
  for (const { table, name, column } of refs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = table as any;
    const col = t[column];
    if (apply) {
      const [result] = await db.update(t).set({ [column]: newPath }).where(eq(col, oldPath));
      const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
      if (affected > 0) notes.push(`${name}.${column}: обновлено строк ${affected}`);
    } else {
      const [{ value }] = await db
        .select({ value: sql<number>`count(*)` })
        .from(t)
        .where(eq(col, oldPath));
      if (Number(value) > 0) notes.push(`${name}.${column}: будет обновлено строк ${Number(value)}`);
    }
  }
  return notes;
}

type Row = { file: string; before: number; after: number; renamedTo?: string; dbNotes?: string[]; skipped?: string };

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
    let result: { buffer: Buffer; mimeType: string };
    try {
      result = await resizeUploadIfNeeded(original, mimeType, maxDimension);
    } catch (err) {
      rows.push({ file: `${dirName}/${name}`, before, after: before, skipped: `не удалось прочитать: ${(err as Error).message}` });
      continue;
    }

    if (result.buffer.length >= before && result.mimeType === mimeType) {
      rows.push({ file: `${dirName}/${name}`, before, after: before, skipped: "уже компактный" });
      continue;
    }

    const newExt = extForMime(result.mimeType);
    const row: Row = { file: `${dirName}/${name}`, before, after: result.buffer.length };

    if (newExt !== ext) {
      const newName = path.basename(name, ext) + newExt;
      const oldPublicPath = `/uploads/${dirName}/${name}`;
      const newPublicPath = `/uploads/${dirName}/${newName}`;
      row.renamedTo = `${dirName}/${newName}`;
      row.dbNotes = await updateDbRefs(dirName, oldPublicPath, newPublicPath);
      if (apply) {
        fs.writeFileSync(path.join(dir, newName), result.buffer);
        fs.unlinkSync(filePath);
      }
    } else if (apply) {
      fs.writeFileSync(filePath, result.buffer);
    }

    rows.push(row);
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
  if (!process.env.DATABASE_URL) {
    console.error("Не найдена переменная DATABASE_URL (нужна для переписывания ссылок в базе при смене формата файла).");
    console.error("Убедитесь, что в корне проекта есть .env с DATABASE_URL, и запускайте скрипт из корня проекта.");
    process.exit(1);
  }

  console.log(apply ? "Режим: ПРИМЕНИТЬ (файлы и, где нужно, ссылки в базе будут изменены)" : "Режим: ТОЛЬКО ОТЧЁТ (--apply ничего не менял)");
  console.log("Папки:", Object.keys(TARGETS).join(", "), "  (labels и menus — пропущены, см. комментарий в начале файла)\n");

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
  let renamed = 0;

  for (const [dirName, maxDimension] of Object.entries(TARGETS)) {
    const rows = await processDir(dirName, maxDimension);
    if (rows.length === 0) continue;
    console.log(`── ${dirName}/ (лимит ${maxDimension}px) ──`);
    for (const r of rows) {
      totalBefore += r.before;
      totalAfter += r.after;
      if (r.skipped) {
        console.log(`  ${r.file}: ${fmt(r.before)} — пропущен (${r.skipped})`);
        continue;
      }
      touched++;
      const pct = (100 * (1 - r.after / r.before)).toFixed(0);
      if (r.renamedTo) {
        renamed++;
        console.log(`  ${r.file}: ${fmt(r.before)} -> ${fmt(r.after)}  (-${pct}%)  ${apply ? "переименован в" : "будет переименован в"} ${r.renamedTo}`);
        if (r.dbNotes && r.dbNotes.length) {
          for (const note of r.dbNotes) console.log(`      ${note}`);
        } else {
          console.log(`      ссылок в базе не найдено (возможно, файл больше не используется)`);
        }
      } else {
        console.log(`  ${r.file}: ${fmt(r.before)} -> ${fmt(r.after)}  (-${pct}%)`);
      }
    }
    console.log();
  }

  console.log("═".repeat(60));
  console.log(`Файлов затронуто: ${touched}${renamed ? ` (из них переименовано из-за смены формата: ${renamed})` : ""}`);
  console.log(`Суммарно: ${fmt(totalBefore)} -> ${fmt(totalAfter)}` + (totalBefore > 0 ? `  (экономия ${(100 * (1 - totalAfter / totalBefore)).toFixed(0)}%)` : ""));
  if (!apply) {
    console.log("\nЭто был пробный прогон — ни один файл и ни одна строка в базе не изменены.");
    console.log("Проверьте цифры выше и, если всё устраивает, запустите:");
    console.log("  npx tsx scripts/recompress-uploads.ts --apply");
  } else {
    console.log("\nГотово. Резервная копия исходных файлов лежит здесь:");
    console.log(" ", backupPath);
    console.log("Если что-то пойдёт не так — папку можно вернуть на место вместо uploads");
    console.log("(для переименованных файлов проверьте также, что путь в базе указывает на нужный файл).");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});
