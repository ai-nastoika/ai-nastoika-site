import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Type,
  Palette,
  Shapes,
  ImagePlus,
  Check,
  Copy,
  Wand2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   LABEL GENERATOR PAGE — AI-powered unique label creation
   ═══════════════════════════════════════════════════════════════ */
export default function LabelGeneratorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  /* Step 1: Design description */
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState("");
  const [elements, setElements] = useState("");
  const [bottleType, setBottleType] = useState("standard");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  /* Step 2: Upload or generate */
  const [generatedImage, setGeneratedImage] = useState("");
  const [uploadedImage, setUploadedImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Step 3: Add text */
  const [labelTitle, setLabelTitle] = useState("");
  const [labelSubtitle, setLabelSubtitle] = useState("");
  const [labelAbv, setLabelAbv] = useState("");
  const [labelDate, setLabelDate] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("serif");
  const [textPosition, setTextPosition] = useState<"center" | "top" | "bottom">("center");

  const finalImage = generatedImage || uploadedImage;

  /* ── Generate prompt from description ── */
  function handleGeneratePrompt() {
    const parts: string[] = [];
    parts.push("Blank bottle label template");
    if (style) parts.push(`${style} style`);
    if (colors) parts.push(`color palette: ${colors}`);
    if (elements) parts.push(`with ${elements}`);
    parts.push("rectangular vertical format, empty center area for custom text, ornate decorative border frame, premium alcohol beverage label aesthetic, high resolution, clean design");

    const fullPrompt = parts.join(", ");
    setGeneratedPrompt(fullPrompt);
    setStep(2);
  }

  /* ── Simulate AI generation ── */
  function handleSimulateGeneration() {
    /* In production this calls backend AI image generation API */
    /* For demo — cycle through template images */
    const demos = [
      "/labels/template-01-classic.jpg",
      "/labels/template-04-deco.jpg",
      "/labels/template-05-folk.jpg",
    ];
    setGeneratedImage(demos[Math.floor(Math.random() * demos.length)]);
  }

  /* ── Handle file upload ── */
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* ── Copy prompt to clipboard ── */
  function copyPrompt() {
    navigator.clipboard.writeText(generatedPrompt);
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={18} /> Назад
        </button>

        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
        >
          Сгенерировать <span style={{ color: "var(--accent)" }}>этикетку</span> с ИИ
        </h1>
        <p className="text-base mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Опишите желаемый дизайн — ИИ создаст уникальную этикетку. Или загрузите своё изображение.
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex gap-2">
          {[
            { n: 1, label: "Описание" },
            { n: 2, label: "Изображение" },
            { n: 3, label: "Текст" },
            { n: 4, label: "Готово" },
          ].map((s) => (
            <div
              key={s.n}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center transition-all"
              style={{
                background: step >= s.n ? "var(--accent)" : "var(--surface)",
                color: step >= s.n ? "#fff" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {s.n}. {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* ─── STEP 1: Description ─── */}
        {step === 1 && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Wand2 size={16} /> Опишите этикетку своими словами
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Например: винтажная этикетка с золотыми виноградными лозами, тёмно-бордовый фон, золотые буквы, как на старинном вине..."
                  className="w-full rounded-lg px-4 py-3 text-base outline-none resize-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: 100, fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Shapes size={16} /> Стиль (необязательно)
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="винтаж, хохлома, минимализм, ар-деко, готика..."
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Palette size={16} /> Цвета (необязательно)
                </label>
                <input
                  type="text"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  placeholder="бордо и золото, чёрно-белый, тёплые earthy tones..."
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Sparkles size={16} /> Элементы (необязательно)
                </label>
                <input
                  type="text"
                  value={elements}
                  onChange={(e) => setElements(e.target.value)}
                  placeholder="виноград, ягоды, цветы, геометрия, звёзды, волны..."
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
                  Тип бутылки
                </label>
                <div className="flex gap-2">
                  {[
                    { k: "standard", l: "Стандартная 0.5л" },
                    { k: "wine", l: "Винная 0.75л" },
                    { k: "mini", l: "Мини 0.25л" },
                    { k: "gift", l: "Подарочная" },
                  ].map((b) => (
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

              <button
                onClick={handleGeneratePrompt}
                disabled={!description.trim()}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <Sparkles size={22} />
                Создать промпт для ИИ
              </button>
            </div>

            {/* Help sidebar */}
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <h4 className="text-base font-bold mb-3" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                  Примеры описаний
                </h4>
                <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                  <button
                    onClick={() => { setDescription("Русская хохлома, чёрный лаковый фон с красными ягодами и золотыми листьями, традиционный орнамент по краям, центр свободен для текста"); setStyle("хохлома"); setColors("чёрный, красный, золотой"); }}
                    className="block w-full text-left p-2 rounded hover:opacity-70 transition-all"
                    style={{ background: "var(--surface)" }}
                  >
                    «Русская хохлома, чёрный лак с красными ягодами и золотыми листьями...»
                  </button>
                  <button
                    onClick={() => { setDescription("Минималистичная этикетка, белый фон, тонкая чёрная рамка, небольшие геометрические акценты в углах, современный шрифт"); setStyle("минимализм"); setColors("белый, чёрный"); }}
                    className="block w-full text-left p-2 rounded hover:opacity-70 transition-all"
                    style={{ background: "var(--surface)" }}
                  >
                    «Минималистичная: белый фон, тонкая чёрная рамка, геометрия...»
                  </button>
                  <button
                    onClick={() => { setDescription("Тёмно-синяя этикетка в стиле ар-деко, золотые геометрические узоры, солнечные лучи в углах, шикарная золотая рамка, премиальный вид"); setStyle("ар-деко"); setColors("тёмно-синий, золотой"); }}
                    className="block w-full text-left p-2 rounded hover:opacity-70 transition-all"
                    style={{ background: "var(--surface)" }}
                  >
                    «Ар-деко: тёмно-синий фон, золотые геометрические узоры...»
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <p className="text-sm" style={{ color: "#166534", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                  <strong>Совет:</strong> чем подробнее описание — тем точнее результат. Укажите стиль, цвета, элементы декора. ИИ додумает недостающие детали.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Image generation ─── */}
        {step === 2 && (
          <div className="space-y-5">
            {/* Generated prompt */}
            <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                  Промпт для генерации (на английском)
                </h3>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-1 text-sm px-3 py-1 rounded-lg transition-all hover:opacity-70"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
                >
                  <Copy size={14} /> Копировать
                </button>
              </div>
              <p
                className="text-sm p-3 rounded-lg"
                style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "monospace", lineHeight: 1.6 }}
              >
                {generatedPrompt}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Отправьте этот промпт в Midjourney, DALL-E, Kandinsky или ChatGPT с генерацией изображений.
              </p>
            </div>

            {/* Upload result */}
            <div
              className="rounded-xl p-6 text-center transition-all cursor-pointer"
              style={{ background: "var(--bg-card)", border: "2px dashed var(--border)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <ImagePlus size={48} className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
              <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Загрузить сгенерированную этикетку
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Нажмите или перетащите изображение сюда
              </p>
            </div>

            {/* OR separator */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>или</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* Demo generation */}
            <button
              onClick={handleSimulateGeneration}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
              style={{ background: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <Sparkles size={22} />
              Использовать демо-шаблон (без генерации)
            </button>

            {/* Preview uploaded/generated */}
            {finalImage && (
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Предпросмотр:</p>
                <img src={finalImage} alt="Label" className="mx-auto rounded-lg max-h-[300px] object-contain" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }} />
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                ← Назад
              </button>
              <button
                onClick={() => finalImage && setStep(3)}
                disabled={!finalImage}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                Добавить текст →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Add text ─── */}
        {step === 3 && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Type size={16} /> Название напитка
                </label>
                <input
                  type="text"
                  value={labelTitle}
                  onChange={(e) => setLabelTitle(e.target.value)}
                  placeholder="Вишнёвка бабушкина"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>
                  Подпись / описание
                </label>
                <input
                  type="text"
                  value={labelSubtitle}
                  onChange={(e) => setLabelSubtitle(e.target.value)}
                  placeholder="Домашний рецепт · Крепость 25%"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
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
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Дата</label>
                  <input
                    type="text"
                    value={labelDate}
                    onChange={(e) => setLabelDate(e.target.value)}
                    placeholder="2025"
                    className="w-full rounded-lg px-3 py-2 text-base outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
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
                      style={{
                        background: c,
                        border: textColor === c ? "3px solid var(--accent)" : "2px solid var(--border)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Шрифт</label>
                <div className="flex gap-2">
                  {[
                    { k: "serif", l: "С засечками" },
                    { k: "sans", l: "Без засечек" },
                    { k: "mono", l: "Моноширинный" },
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
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Позиция текста</label>
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

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  ← Назад
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!labelTitle.trim()}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                >
                  <Download size={22} />
                  Готово →
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div className="flex items-center justify-center" style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 24 }}>
              <LabelPreview
                image={finalImage}
                title={labelTitle}
                subtitle={labelSubtitle}
                abv={labelAbv}
                date={labelDate}
                textColor={textColor}
                fontFamily={fontFamily}
                textPosition={textPosition}
              />
            </div>
          </div>
        )}

        {/* ─── STEP 4: Download/Print ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <Check size={48} className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Этикетка готова!
              </h2>
            </div>

            {/* Final preview */}
            <div className="flex justify-center">
              <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <LabelPreview
                  image={finalImage}
                  title={labelTitle}
                  subtitle={labelSubtitle}
                  abv={labelAbv}
                  date={labelDate}
                  textColor={textColor}
                  fontFamily={fontFamily}
                  textPosition={textPosition}
                  large
                />
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <Download size={22} />
                Печать
              </button>
              <button
                onClick={() => { setStep(1); setGeneratedImage(""); setUploadedImage(""); setLabelTitle(""); setLabelSubtitle(""); }}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                Создать новую
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Label Preview Component
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
      }}
    >
      {image && (
        <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
      )}
      <div className={`absolute inset-0 flex flex-col items-center ${posClass} px-3`} style={{ zIndex: 1, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
        {title && (
          <div style={{ color: textColor, fontFamily: ff, fontSize: large ? 22 : 16, fontWeight: "bold", lineHeight: 1.2, wordBreak: "break-word" }}>
            {title}
          </div>
        )}
        {subtitle && (
          <div className="mt-1" style={{ color: textColor, fontFamily: '"Inter", sans-serif', fontSize: large ? 13 : 10, opacity: 0.9, lineHeight: 1.3, wordBreak: "break-word" }}>
            {subtitle}
          </div>
        )}
        {(abv || date) && (
          <div className="flex gap-2 mt-2" style={{ color: textColor, fontFamily: '"Inter", sans-serif', fontSize: large ? 11 : 9, opacity: 0.75 }}>
            {abv && <span>{abv}</span>}
            {abv && date && <span>·</span>}
            {date && <span>{date}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
