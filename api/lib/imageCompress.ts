import sharp from "sharp";

/* Сжимает фото до ~1 МБ перед отправкой в /images/edits — оплата идёт за
   токены, а токены считаются от размера входного изображения (см. переписку
   про стоимость: вход ~4.8 тыс. токенов на несжатое телефонное фото).
   Телефонные снимки часто весят 5-10 МБ при разрешении 4000+ px по стороне —
   сжимать почти всегда есть что, без заметной потери качества для задачи
   (ИИ читает сцену/детали, а не печатает фото 1:1). */

const MAX_BYTES = 1024 * 1024; // 1 МБ — целевой потолок
const MAX_DIMENSION = 2048; // ужимаем сторону заранее — это даёт основной выигрыш в размере

async function encode(buffer: Buffer, quality: number): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // авто-поворот по EXIF — иначе фото с телефона может лечь на бок после сжатия
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

export async function compressImageIfNeeded(buffer: Buffer, originalMimeType: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  if (buffer.length <= MAX_BYTES) {
    return { buffer, filename: "photo.jpg", mimeType: originalMimeType || "image/jpeg" };
  }

  let quality = 85;
  let output = await encode(buffer, quality);
  while (output.length > MAX_BYTES && quality > 35) {
    quality -= 10;
    output = await encode(buffer, quality);
  }

  // Сжатие всегда кодирует в JPEG (см. encode()), независимо от исходного формата.
  return { buffer: output, filename: "photo.jpg", mimeType: "image/jpeg" };
}

/* Обрезка фото под нужную ориентацию этикетки — тот же смысл, что ORIENTATIONS
   в labelGeneratorRouter.ts для генерации "с нуля", но здесь размер выхода
   /images/edits определяется по входному фото автоматически (см. imageClient.ts),
   поэтому чтобы реально управлять пропорцией результата, обрезаем САМО фото
   перед отправкой, а не просим модель через текст (текстовая просьба про
   пропорцию не гарантирует реальный размер выходного файла). position:"attention" —
   умная обрезка sharp, старается не срезать самую "интересную" часть кадра
   (например саму бутылку), а не просто резать по центру. */
const ORIENTATION_TARGETS: Record<"vertical" | "square" | "horizontal", { width: number; height: number }> = {
  vertical: { width: 1000, height: 1500 },
  square: { width: 1200, height: 1200 },
  horizontal: { width: 1500, height: 1000 },
};

/* Сжатие обычных загрузок из админки/кабинета (фото рецепта, заведения, трекера,
   аватар, пример этикетки) — в отличие от compressImageIfNeeded() выше (готовит фото
   для отправки в ИИ, всегда на выходе JPEG), здесь формат СОХРАНЯЕТСЯ: PNG остаётся
   PNG (не теряет прозрачность), WebP остаётся WebP, JPEG просто перекодируется бережнее.
   Раньше все эти эндпоинты просто писали файл на диск как есть — фото с телефона
   4000+ px и 3-5 МБ уходило пользователям сайта без единого изменения.
   maxDimension настраивается под контекст показа (аватар/иконка — меньше, фото
   заведения — больше); quality одинаково щадящий для JPEG/WebP. */
export async function resizeUploadIfNeeded(
  buffer: Buffer,
  mimeType: string,
  maxDimension: number
): Promise<Buffer> {
  const img = sharp(buffer).rotate(); // авто-поворот по EXIF, как и в encode() выше
  const meta = await img.metadata();
  const needsResize = (meta.width ?? 0) > maxDimension || (meta.height ?? 0) > maxDimension;
  const resized = needsResize ? img.resize(maxDimension, maxDimension, { fit: "inside", withoutEnlargement: true }) : img;

  if (mimeType === "image/png") return resized.png({ compressionLevel: 9 }).toBuffer();
  if (mimeType === "image/webp") return resized.webp({ quality: 85 }).toBuffer();
  return resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

export async function cropToOrientation(
  buffer: Buffer,
  orientation: "vertical" | "square" | "horizontal"
): Promise<Buffer> {
  const target = ORIENTATION_TARGETS[orientation];
  return sharp(buffer)
    .rotate()
    .resize(target.width, target.height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 90 })
    .toBuffer();
}
