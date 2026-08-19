import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Type,
  Palette,
  Shapes,
  Wand2,
  LogIn,
  Wallet,
  RotateCcw,
  Printer,
} from "lucide-react";

/* Физические размеры этикетки для печати — тот же принцип, что в конструкторе
   этикеток (ToolsPage.tsx, LABEL_SIZES): сколько копий помещается на A4. */
const LABEL_SIZES = [
  { name: "90 × 120 мм", w: 90, h: 120, perA4: 4, cols: 2 },
  { name: "60 × 80 мм", w: 60, h: 80, perA4: 9, cols: 3 },
];

/* ═══════════════════════════════════════════════════════════════
   LABEL GENERATOR PAGE — только генерация ИИ, без загрузки своих фото.
   Текст встраивается моделью прямо в промпт (не CSS-наложением) — см.
   api/labelGeneratorRouter.ts. Печать — реальная раскладка на A4 с нужным
   числом копий по физическому размеру, тем же способом, что в конструкторе
   этикеток (canvas → отдельное окно → печать), а не window.print() всей страницы.
   ═══════════════════════════════════════════════════════════════ */
export default function LabelGeneratorPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState("");
  const [elements, setElements] = useState("");
  const [bottleType, setBottleType] = useState<"standard" | "wine" | "mini" | "gift">("standard");

  const [labelTitle, setLabelTitle] = useState("");
  const [labelSubtitle, setLabelSubtitle] = useState("");
  const [labelAbv, setLabelAbv] = useState("");
  const [labelDate, setLabelDate] = useState("");

  const [sizeIdx, setSizeIdx] = useState(0);

  const { data: limitInfo, refetch: refetchLimit } = trpc.labelGenerator.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const generate = trpc.labelGenerator.generate.useMutation({
    onSuccess: () => refetchLimit(),
    onError: () => refetchLimit(),
  });

  const generatedImage = generate.data
    ? generate.data.image.imageUrl ?? (generate.data.image.imageBase64 ? `data:image/png;base64,${generate.data.image.imageBase64}` : "")
    : "";

  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 15;
  const limitReached = limitInfo ? !limitInfo.allowed : false;

  function handleGenerate() {
    if (!description.trim() || !labelTitle.trim() || generate.isPending || limitReached) return;
    generate.mutate({
      description: description.trim(),
      style,
      colors,
      elements,
      bottleType,
      title: labelTitle.trim(),
      subtitle: labelSubtitle,
      abv: labelAbv,
      date: labelDate,
    });
  }

  function handleReset() {
    setDescription("");
    setStyle("");
    setColors("");
    setElements("");
    setBottleType("standard");
    setLabelTitle("");
    setLabelSubtitle("");
    setLabelAbv("");
    setLabelDate("");
    generate.reset();
  }

  /* ── Печать: рисуем нужное число копий на canvas в размере A4 (300dpi),
     вписывая картинку в физический размер этикетки с обрезкой по центру
     (cover-fit, на случай если пропорции ИИ-картинки не точно совпали
     с выбранным размером), открываем отдельное окно и печатаем только его. ── */
  function handlePrint() {
    if (!generatedImage) return;
    const size = LABEL_SIZES[sizeIdx];

    const img = new Image();
    img.onload = () => {
      const DPI = 300;
      const MM_TO_PX = DPI / 25.4;
      const A4_PX_W = Math.round(210 * MM_TO_PX);
      const A4_PX_H = Math.round(297 * MM_TO_PX);
      const margin = Math.round(10 * MM_TO_PX);
      const gap = Math.round(4 * MM_TO_PX);
      const labW = Math.round(size.w * MM_TO_PX);
      const labH = Math.round(size.h * MM_TO_PX);
      const cols = size.cols;
      const rows = Math.ceil(size.perA4 / cols);

      const a4 = document.createElement("canvas");
      a4.width = A4_PX_W;
      a4.height = A4_PX_H;
      const ctx = a4.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, A4_PX_W, A4_PX_H);

      const totalW = labW * cols + gap * (cols - 1);
      const totalH = labH * rows + gap * (rows - 1);
      const startX = Math.max(margin, Math.round((A4_PX_W - totalW) / 2));
      const startY = Math.max(margin, Math.round((A4_PX_H - totalH) / 2));

      const imgRatio = img.width / img.height;
      const boxRatio = labW / labH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }

      for (let i = 0; i < size.perA4; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (labW + gap);
        const y = startY + row * (labH + gap);
        ctx.drawImage(img, sx, sy, sw, sh, x, y, labW, labH);
      }

      const printImg = document.createElement("img");
      printImg.src = a4.toDataURL("image/png");
      printImg.style.cssText = "width:100%;height:auto;display:block;";

      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head><title>Печать этикетки</title><style>
        body{margin:0;padding:0;}
        img{display:block;width:100%;height:auto;}
        @media print{@page{size:A4 portrait;margin:0;}}
      </style></head><body>`);
      win.document.write(printImg.outerHTML);
      win.document.write(`</body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 500);
    };
    img.src = generatedImage;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={18} /> Назад
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Сгенерировать <span style={{ color: "var(--accent)" }}>этикетку</span> с ИИ
        </h1>
        <p className="text-base mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Опишите пожелания одной формой — ИИ нарисует готовую печатную этикетку с вашим текстом.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 grid lg:grid-cols-2 gap-8">
        {/* ─── Левая колонка: форма ─── */}
        <div className="space-y-6">
          {/* Design wishes */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Пожелания к дизайну
            </h3>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Wand2 size={16} /> Опишите этикетку своими словами
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Например: винтажная этикетка с золотыми виноградными лозами, тёмно-бордовый фон..."
                  className="w-full rounded-lg px-4 py-3 text-base outline-none resize-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: 90, fontFamily: "var(--font-body)" }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Без лишних деталей — чем короче и яснее, тем меньше риск, что ИИ что-то испортит.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    <Shapes size={16} /> Стиль
                  </label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="винтаж, минимализм..."
                    className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    <Palette size={16} /> Цвета
                  </label>
                  <input
                    type="text"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="бордо и золото..."
                    className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Sparkles size={16} /> Элементы декора
                </label>
                <input
                  type="text"
                  value={elements}
                  onChange={(e) => setElements(e.target.value)}
                  placeholder="виноград, ягоды, цветы..."
                  className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Тип бутылки (влияет на пропорции этикетки)</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { k: "standard", l: "Стандартная 0.5л" },
                    { k: "wine", l: "Винная 0.75л" },
                    { k: "mini", l: "Мини 0.25л" },
                    { k: "gift", l: "Подарочная" },
                  ] as const).map((b) => (
                    <button
                      key={b.k}
                      onClick={() => setBottleType(b.k)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: bottleType === b.k ? "var(--accent)" : "var(--surface)",
                        color: bottleType === b.k ? "#fff" : "var(--text-secondary)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {b.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Label text — уходит в промпт */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Текст на этикетке
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              ИИ встроит эти надписи прямо в изображение при генерации.
            </p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Type size={16} /> Название напитка *
                </label>
                <input
                  type="text"
                  value={labelTitle}
                  onChange={(e) => setLabelTitle(e.target.value)}
                  placeholder="Вишнёвка бабушкина"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Подпись / описание</label>
                <input
                  type="text"
                  value={labelSubtitle}
                  onChange={(e) => setLabelSubtitle(e.target.value)}
                  placeholder="Домашний рецепт"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Крепость</label>
                  <input
                    type="text"
                    value={labelAbv}
                    onChange={(e) => setLabelAbv(e.target.value)}
                    placeholder="25%"
                    className="w-full rounded-lg px-3 py-2 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Дата</label>
                  <input
                    type="text"
                    value={labelDate}
                    onChange={(e) => setLabelDate(e.target.value)}
                    placeholder="2026"
                    className="w-full rounded-lg px-3 py-2 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Generate */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {!isLoggedIn ? (
              <div className="text-center py-4">
                <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                  Генерация этикетки требует входа в аккаунт.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  <LogIn size={16} /> Войти
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    Сгенерировать
                  </h3>
                  {limitInfo && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      <Wallet size={12} /> Баланс: {balanceRub} ₽ · {costRub} ₽ за генерацию
                    </span>
                  )}
                </div>

                {limitReached ? (
                  <div className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    На балансе меньше {costRub} ₽ — генерация изображений без бесплатного лимита, дороже обычных запросов.{" "}
                    <Link to="/profile?tab=history" className="underline font-medium" style={{ color: "var(--accent)" }}>
                      Пополнить баланс
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!description.trim() || !labelTitle.trim() || generate.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                  >
                    <Sparkles size={22} />
                    {generate.isPending ? "Генерирую..." : `Сгенерировать (${costRub} ₽)`}
                  </button>
                )}
                {!labelTitle.trim() && !limitReached && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Заполните название напитка выше.</p>
                )}

                {generate.isPending && <div className="mt-3"><BottleThinkingIndicator label="Рисую этикетку..." /></div>}

                {generate.error && (
                  <p className="text-sm mt-3" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
                    {generate.error.message}
                  </p>
                )}
              </>
            )}
          </div>

          {(description || labelTitle || generatedImage) && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <RotateCcw size={16} /> Начать заново
            </button>
          )}
        </div>

        {/* ─── Правая колонка: результат + печать ─── */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="flex flex-col items-center justify-center rounded-2xl p-8" style={{ background: "var(--bg-secondary)" }}>
            {generatedImage ? (
              <img
                src={generatedImage}
                alt="Сгенерированная этикетка"
                className="max-w-full rounded-lg"
                style={{ maxHeight: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-lg w-full"
                style={{ height: 320, background: "var(--bg-card)", border: "1px dashed var(--border)" }}
              >
                <p className="text-sm text-center px-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Здесь появится готовая этикетка после генерации
                </p>
              </div>
            )}

            {generatedImage && (
              <div className="w-full mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Размер для печати
                </label>
                <div className="flex gap-2 mb-4">
                  {LABEL_SIZES.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setSizeIdx(i)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: sizeIdx === i ? "var(--accent)" : "var(--surface)",
                        color: sizeIdx === i ? "#fff" : "var(--text-secondary)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {s.name} · {s.perA4}/лист
                    </button>
                  ))}
                </div>
                <button
                  onClick={handlePrint}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                >
                  <Printer size={20} /> Печать ({LABEL_SIZES[sizeIdx].perA4} шт. на листе A4)
                </button>
                <a
                  href={generatedImage}
                  download="label.png"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium mt-2 transition-all hover:opacity-70"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  <Download size={16} /> Скачать изображение
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
