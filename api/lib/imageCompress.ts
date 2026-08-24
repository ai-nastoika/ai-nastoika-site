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
