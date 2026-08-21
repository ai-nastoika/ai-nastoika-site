/* Печать этикетки на A4 — общая логика для страницы генератора (там ориентация
   известна заранее) и галереи сохранённых этикеток в личном кабинете (там её
   никто не запоминал, поэтому автоматически определяем по факту пропорций
   самой картинки). Раскладка (сколько копий на листе) считается от печатной
   области, а не жёстко зашита — иначе широкие/горизонтальные этикетки вылезают
   за край. Изображение вписывается целиком (contain-fit), без обрезки. */

export type LabelOrientation = "vertical" | "square" | "horizontal";

const ORIENTATION_PRINT_SIZE: Record<LabelOrientation, { w: number; h: number }> = {
  vertical: { w: 90, h: 120 },
  square: { w: 100, h: 100 },
  horizontal: { w: 120, h: 90 },
};

/* Если ориентация не передана явно — определяем по факту соотношения сторон
   загруженной картинки, выбирая ближайший из трёх вариантов. */
function detectOrientation(img: HTMLImageElement): LabelOrientation {
  const ratio = img.width / img.height; // >1 = шире, чем выше
  const candidates: [LabelOrientation, number][] = [
    ["vertical", ORIENTATION_PRINT_SIZE.vertical.w / ORIENTATION_PRINT_SIZE.vertical.h],
    ["square", 1],
    ["horizontal", ORIENTATION_PRINT_SIZE.horizontal.w / ORIENTATION_PRINT_SIZE.horizontal.h],
  ];
  let best: LabelOrientation = "vertical";
  let bestDiff = Infinity;
  for (const [key, targetRatio] of candidates) {
    const diff = Math.abs(ratio - targetRatio);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = key;
    }
  }
  return best;
}

export function printLabelOnA4(imageSrc: string, orientation?: LabelOrientation) {
  const img = new Image();
  img.onload = () => {
    const size = ORIENTATION_PRINT_SIZE[orientation ?? detectOrientation(img)];

    const DPI = 300;
    const MM_TO_PX = DPI / 25.4;
    const PAGE_W_MM = 210;
    const PAGE_H_MM = 297;
    const MARGIN_MM = 10;
    const GAP_MM = 6;

    const A4_PX_W = Math.round(PAGE_W_MM * MM_TO_PX);
    const A4_PX_H = Math.round(PAGE_H_MM * MM_TO_PX);
    const margin = Math.round(MARGIN_MM * MM_TO_PX);
    const gap = Math.round(GAP_MM * MM_TO_PX);
    const labW = Math.round(size.w * MM_TO_PX);
    const labH = Math.round(size.h * MM_TO_PX);

    const usableW = A4_PX_W - margin * 2;
    const usableH = A4_PX_H - margin * 2;
    const cols = Math.max(1, Math.floor((usableW + gap) / (labW + gap)));
    const rows = Math.max(1, Math.floor((usableH + gap) / (labH + gap)));
    const totalCount = cols * rows;

    const a4 = document.createElement("canvas");
    a4.width = A4_PX_W;
    a4.height = A4_PX_H;
    const ctx = a4.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, A4_PX_W, A4_PX_H);

    const totalW = labW * cols + gap * (cols - 1);
    const totalH = labH * rows + gap * (rows - 1);
    const startX = Math.round((A4_PX_W - totalW) / 2);
    const startY = Math.round((A4_PX_H - totalH) / 2);

    // contain-fit — вписываем картинку целиком, ничего не обрезаем
    const scale = Math.min(labW / img.width, labH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    for (let i = 0; i < totalCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const boxX = startX + col * (labW + gap);
      const boxY = startY + row * (labH + gap);
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, labW, labH);
      const dx = boxX + (labW - drawW) / 2;
      const dy = boxY + (labH - drawH) / 2;
      ctx.drawImage(img, dx, dy, drawW, drawH);
    }

    const printImg = document.createElement("img");
    printImg.src = a4.toDataURL("image/png");
    printImg.style.cssText = `width:${PAGE_W_MM}mm;height:${PAGE_H_MM}mm;display:block;`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Печать этикетки</title><style>
      * { box-sizing: border-box; }
      html, body { margin:0; padding:0; width:${PAGE_W_MM}mm; }
      img { display:block; }
      .no-print{display:flex;gap:8px;justify-content:center;padding:12px;background:#fff;border-bottom:1px solid #e5e5e5;}
      .no-print button{font:inherit;font-size:16px;padding:10px 20px;border-radius:10px;border:none;cursor:pointer;}
      .btn-close{background:#f0f0f0;color:#333;}
      .btn-print{background:#8B4513;color:#fff;}
      @media print{
        .no-print{display:none !important;}
        @page{size:A4 portrait;margin:0;}
        html, body { width:${PAGE_W_MM}mm; height:${PAGE_H_MM}mm; }
      }
    </style></head><body>
    <div class="no-print">
      <button class="btn-close" onclick="window.close()">← Закрыть и вернуться на сайт</button>
      <button class="btn-print" onclick="window.print()">Печать</button>
    </div>`);
    win.document.write(printImg.outerHTML);
    win.document.write(`</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };
  img.src = imageSrc;
}
