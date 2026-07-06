// api/lib/labelEngine.ts
//
// v3 — работает с ассетами, пришедшими из БД (labelTemplates.zones), а не
// с фиксированной папкой на диске. Сама генерация (sharp + @napi-rs/canvas)
// не изменилась относительно того, что мы проверяли локально.

import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "node:path";
import fs from "node:fs/promises";

const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "Lora-Variable.ttf");

let fontRegistered = false;
function ensureFont() {
  if (!fontRegistered) {
    GlobalFonts.registerFromPath(FONT_PATH, "Lora");
    fontRegistered = true;
  }
}

export interface LabelField {
  x: number;
  y: number;
  width: number;
  height?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  font?: string;
  size?: number;
  color?: string;
  suffix?: string;
  pad_bottom?: number;
}

// Это форма, которую храним в labelTemplates.zones (json) для маска-базированных
// шаблонов. Для старых rect-шаблонов (imageShape/imageZoneScale) mask будет
// отсутствовать — в этом случае render() кидает понятную ошибку, чтобы админ
// знал, что шаблон нужно домигрировать через measure_template.py.
export interface LabelZones {
  mask?: {
    designMaskUrl: string;   // напр. /uploads/label-assets/3/design_mask.png
    frameOverlayUrl: string; // напр. /uploads/label-assets/3/frame_overlay.png
    designBbox: [number, number, number, number];
  };
  fields: Record<string, LabelField>;
}

function resolveLocalPath(urlOrPath: string): string {
  // Ожидаем, что статика лежит в <project>/uploads и отдаётся как /uploads/...
  // Поправьте PUBLIC_ROOT, если у вас другой корень раздачи статики.
  const PUBLIC_ROOT = process.cwd();
  return urlOrPath.startsWith("/") ? path.join(PUBLIC_ROOT, urlOrPath) : urlOrPath;
}

function renderTextLayer(
  width: number,
  height: number,
  fields: Record<string, LabelField>,
  values: Record<string, string>
): Buffer {
  ensureFont();
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  for (const [key, field] of Object.entries(fields)) {
    const raw = values[key];
    if (!raw) continue;
    const text = field.suffix ? `${raw}${field.suffix}` : raw;

    const w = field.width;
    const h = field.height ?? (field.size ?? 32) + 10;
    const align = field.align ?? "left";
    const valign = field.valign ?? "top";
    const color = field.color ?? "#5a4632";
    const padBottom = field.pad_bottom ?? 6;
    const fontName = field.font ?? "Lora";

    let size = field.size ?? 32;
    while (size > 14) {
      ctx.font = `${size}px "${fontName}"`;
      if (ctx.measureText(text).width <= w) break;
      size -= 1;
    }
    ctx.font = `${size}px "${fontName}"`;
    const textW = ctx.measureText(text).width;

    let tx = field.x;
    if (align === "center") tx = field.x + (w - textW) / 2;
    if (align === "right") tx = field.x + w - textW;

    let ty = field.y + size;
    if (valign === "middle") ty = field.y + (h + size) / 2 - size * 0.15;
    if (valign === "bottom") ty = field.y + h - padBottom;

    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, tx, ty);
  }

  return canvas.toBuffer("image/png");
}

export async function renderLabelFromZones(
  zones: LabelZones,
  artBuffer: Buffer,
  values: Record<string, string>
): Promise<Buffer> {
  if (!zones.mask) {
    throw new Error(
      "У этого шаблона нет zones.mask (design_mask/frame_overlay) — это старый rect-шаблон, " +
      "прогоните measure_template.py и загрузите design_mask.png/frame_overlay.png через тот же " +
      "механизм, что и обычную картинку шаблона, затем пропишите пути в zones.mask."
    );
  }

  const frameOverlayPath = resolveLocalPath(zones.mask.frameOverlayUrl);
  const designMaskPath = resolveLocalPath(zones.mask.designMaskUrl);

  const frameMeta = await sharp(frameOverlayPath).metadata();
  const { width = 0, height = 0 } = frameMeta;

  const [x0, y0, x1, y1] = zones.mask.designBbox;
  const bw = x1 - x0;
  const bh = y1 - y0;

  const artFitted = await sharp(artBuffer)
    .resize(bw, bh, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const artOnCanvas = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: artFitted, left: x0, top: y0 }])
    .png()
    .toBuffer();

  const maskedArt = await sharp(artOnCanvas)
    .composite([{ input: designMaskPath, blend: "dest-in" }])
    .png()
    .toBuffer();

  const textLayer = renderTextLayer(width, height, zones.fields, values);

  return sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      { input: maskedArt, left: 0, top: 0 },
      { input: frameOverlayPath, left: 0, top: 0 },
      { input: textLayer, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

/** Сохраняет готовый PNG в /uploads/labels и возвращает публичный URL */
export async function saveRenderedLabel(png: Buffer): Promise<string> {
  const UPLOADS_DIR = path.join(process.cwd(), "uploads", "labels");
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  await fs.writeFile(path.join(UPLOADS_DIR, filename), png);
  return `/uploads/labels/${filename}`;
}
