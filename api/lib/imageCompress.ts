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
