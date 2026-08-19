import { useState, useRef } from "react";
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
  ImagePlus,
  Wand2,
  LogIn,
  Wallet,
  RotateCcw,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   LABEL GENERATOR PAGE — одна страница вместо мастера из 4 шагов.
   Все пожелания (стиль/цвета/элементы/текст) собираются сразу,
   промпт строится и уходит в ИИ на бэкенде (api/labelGeneratorRouter.ts).
   Текст на этикетке — отдельный слой поверх картинки (LabelPreview),
   редактируется мгновенно без повторной (платной) генерации.
   ═══════════════════════════════════════════════════════════════ */
export default function LabelGeneratorPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  /* Design wishes — намеренно без сильной детализации */
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState("");
  const [elements, setElements] = useState("");
  const [bottleType, setBottleType] = useState<"standard" | "wine" | "mini" | "gift">("standard");

  /* Image — сгенерированное или загруженное */
  const [uploadedImage, setUploadedImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Label text overlay */
  const [labelTitle, setLabelTitle] = useState("");
  const [labelSubtitle, setLabelSubtitle] = useState("");
  const [labelAbv, setLabelAbv] = useState("");
  const [labelDate, setLabelDate] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("serif");
  const [textPosition, setTextPosition] = useState<"center" | "top" | "bottom">("center");

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
  const finalImage = generatedImage || uploadedImage;

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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleReset() {
    setDescription("");
    setStyle("");
    setColors("");
    setElements("");
    setBottleType("standard");
    setUploadedImage("");
    setLabelTitle("");
    setLabelSubtitle("");
    setLabelAbv("");
    setLabelDate("");
    generate.reset();
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
          Опишите пожелания одной формой — ИИ создаст фон этикетки, текст добавляется отдельно и меняется мгновенно.
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
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Тип бутылки</label>
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

          {/* Generate / upload */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {!isLoggedIn ? (
              <div className="text-center py-4">
                <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                  Генерация фона этикетки требует входа в аккаунт.
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
                    Сгенерировать фон
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
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mb-3"
                    style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                  >
                    <Sparkles size={22} />
                    {generate.isPending ? "Генерирую..." : `Сгенерировать (${costRub} ₽)`}
                  </button>
                )}

                {generate.isPending && <div className="mb-3"><BottleThinkingIndicator label="Рисую фон этикетки..." /></div>}

                {generate.error && (
                  <p className="text-sm mb-3" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
                    {generate.error.message}
                  </p>
                )}
              </>
            )}

            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>или</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            <div
              className="rounded-xl p-5 text-center transition-all cursor-pointer"
              style={{ background: "var(--bg-primary)", border: "2px dashed var(--border)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <ImagePlus size={32} className="mx-auto mb-2" style={{ color: "var(--accent)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                Загрузить своё изображение
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Бесплатно, без ИИ
              </p>
            </div>
          </div>

          {/* Label text */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Текст на этикетке
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Эти надписи ИИ встроит прямо в изображение при генерации — точнее, чем накладывать текст поверх готовой картинки.
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
                  placeholder="Домашний рецепт · Крепость 25%"
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

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Цвет текста</label>
                <div className="flex gap-2">
                  {["#ffffff", "#000000", "#f5efe6", "#8B4513", "#b8860b", "#9b2226"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      className="w-8 h-8 rounded-full transition-all hover:scale-110"
                      style={{ background: c, border: textColor === c ? "3px solid var(--accent)" : "2px solid var(--border)" }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Шрифт</label>
                  <div className="flex gap-2">
                    {[
                      { k: "serif", l: "С засечками" },
                      { k: "sans", l: "Без засечек" },
                      { k: "mono", l: "Моно" },
                    ].map((f) => (
                      <button
                        key={f.k}
                        onClick={() => setFontFamily(f.k)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: fontFamily === f.k ? "var(--accent)" : "var(--surface)",
                          color: fontFamily === f.k ? "#fff" : "var(--text-secondary)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {f.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Позиция</label>
                  <div className="flex gap-2">
                    {[
                      { k: "center", l: "Центр" },
                      { k: "top", l: "Сверху" },
                      { k: "bottom", l: "Снизу" },
                    ].map((p) => (
                      <button
                        key={p.k}
                        onClick={() => setTextPosition(p.k as typeof textPosition)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: textPosition === p.k ? "var(--accent)" : "var(--surface)",
                          color: textPosition === p.k ? "#fff" : "var(--text-secondary)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <RotateCcw size={16} /> Начать заново
          </button>
        </div>

        {/* ─── Правая колонка: живой предпросмотр ─── */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="flex flex-col items-center justify-center rounded-2xl p-8" style={{ background: "var(--bg-secondary)" }}>
            <LabelPreview
              image={finalImage}
              title={labelTitle}
              subtitle={labelSubtitle}
              abv={labelAbv}
              date={labelDate}
              textColor={textColor}
              fontFamily={fontFamily}
              textPosition={textPosition}
              overlayText={!generatedImage}
              large
            />
            {!finalImage && (
              <p className="text-sm mt-4 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Здесь появится предпросмотр — сгенерируйте фон или загрузите своё изображение
              </p>
            )}
            {!generatedImage && uploadedImage && (
              <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                На своём фото текст накладывается поверх (справа) — на ИИ-генерации текст встроен в саму картинку.
              </p>
            )}
            {generatedImage && (
              <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Текст уже встроен в изображение. Чтобы изменить надписи — поправьте поля слева и сгенерируйте заново (спишется ещё раз).
              </p>
            )}
            {finalImage && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium mt-6 transition-all hover:scale-105"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <Download size={20} /> Печать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Label Preview Component (без изменений)
   ═══════════════════════════════════════════ */
function LabelPreview({
  image,
  title,
  subtitle,
  abv,
  date,
  textColor,
  fontFamily,
  textPosition,
  overlayText = true,
  large = false,
}: {
  image: string;
  title: string;
  subtitle: string;
  abv: string;
  date: string;
  textColor: string;
  fontFamily: string;
  textPosition: string;
  overlayText?: boolean;
  large?: boolean;
}) {
  const h = large ? 280 : 220;
  const w = Math.round(h * 0.75);
  const ff = fontFamily === "serif" ? '"Playfair Display", Georgia, serif' : fontFamily === "mono" ? '"Courier New", monospace' : '"Inter", sans-serif';

  const posClass = textPosition === "top" ? "justify-start pt-6" : textPosition === "bottom" ? "justify-end pb-6" : "justify-center";

  return (
    <div
      className="relative flex flex-col items-center text-center overflow-hidden"
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        background: image ? undefined : "var(--bg-card)",
        border: image ? undefined : "1px dashed var(--border)",
      }}
    >
      {image && (
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
      )}
      {overlayText && (
        <div className={`absolute inset-0 flex flex-col items-center ${posClass} px-3`} style={{ zIndex: 1, textShadow: image ? "0 1px 6px rgba(0,0,0,0.6)" : "none" }}>
          {title && (
            <div style={{ color: image ? textColor : "var(--text-primary)", fontFamily: ff, fontSize: large ? 22 : 16, fontWeight: "bold", lineHeight: 1.2, wordBreak: "break-word" }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div className="mt-1" style={{ color: image ? textColor : "var(--text-secondary)", fontFamily: '"Inter", sans-serif', fontSize: large ? 13 : 10, opacity: 0.9, lineHeight: 1.3, wordBreak: "break-word" }}>
              {subtitle}
            </div>
          )}
          {(abv || date) && (
            <div className="flex gap-2 mt-2" style={{ color: image ? textColor : "var(--text-muted)", fontFamily: '"Inter", sans-serif', fontSize: large ? 11 : 9, opacity: 0.75 }}>
              {abv && <span>{abv}</span>}
              {abv && date && <span>·</span>}
              {date && <span>{date}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
