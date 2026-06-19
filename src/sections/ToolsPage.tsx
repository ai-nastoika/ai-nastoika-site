import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import QRCode from "qrcode";
import {
  Wand2,
  Calculator,
  Tag,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
  Download,
  ArrowLeft,
} from "lucide-react";

/* ============================================================
   SUB-COMPONENT: AI Taste Calculator
   ============================================================ */
function TasteCalculator() {
  const [ingredients, setIngredients] = useState("");
  const [result, setResult] = useState<null | {
    recipe: string;
    taste: string;
    color: string;
  }>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!ingredients.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setResult({
        recipe: `${ingredients} — настойка на водке, 21 день. Сахар: 150 г/л, лимонная цедра: 10 г.`,
        taste: "Сладковатый, с лёгкой кислинкой и ярким ароматом. Послевкусие — тёплое, пряное.",
        color: "Янтарно-рубиновый, прозрачный.",
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div>
      <div className="mb-6">
        <label
          className="block text-base font-medium mb-2"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          Опишите идею или перечислите ингредиенты
        </label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Например: вишня, ваниль, корица..."
          className="w-full rounded-xl p-4 text-base outline-none resize-none"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body)",
            minHeight: 100,
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !ingredients.trim()}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
      >
        {loading ? (
          <>
            <Sparkles size={22} className="animate-spin" />
            Думаю...
          </>
        ) : (
          <>
            <Wand2 size={22} />
            Составить рецептуру
          </>
        )}
      </button>

      {result && (
        <div
          className="mt-6 rounded-xl p-5 space-y-3"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={28} style={{ color: "var(--accent)" }} />
            <span
              className="text-base font-semibold"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Результат ИИ
            </span>
          </div>
          <div>
            <div className="text-base font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Рецептура
            </div>
            <div className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              {result.recipe}
            </div>
          </div>
          <div>
            <div className="text-base font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Вкусовой профиль
            </div>
            <div className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              {result.taste}
            </div>
          </div>
          <div>
            <div className="text-base font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Цвет напитка
            </div>
            <div className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              {result.color}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: ABV Calculator
   ============================================================ */
function AbvCalculator() {
  const [volume, setVolume] = useState(1000);
  const [initialAbv, setInitialAbv] = useState(40);
  const [sugar, setSugar] = useState(100);
  const [water, setWater] = useState(0);
  const [infusionIngredients, setInfusionIngredients] = useState("");
  const [infusionDays, setInfusionDays] = useState(21);
  const [result, setResult] = useState<{
    abv: number;
    totalVolume: number;
    days: number;
    ingredients: string;
  } | null>(null);

  const calculate = () => {
    const alcoholMl = volume * (initialAbv / 100);
    const totalVolume = volume + water + sugar * 0.6;
    const finalAbv = (alcoholMl / totalVolume) * 100;
    setResult({
      abv: parseFloat(finalAbv.toFixed(1)),
      totalVolume: Math.round(totalVolume),
      days: infusionDays,
      ingredients: infusionIngredients.trim(),
    });
  };

  const reset = () => {
    setVolume(1000);
    setInitialAbv(40);
    setSugar(100);
    setWater(0);
    setInfusionIngredients("");
    setInfusionDays(21);
    setResult(null);
  };

  const adjust = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, step: number) => {
    setter(Math.max(0, value + step));
  };

  const dayOptions = [3, 7, 10, 14, 21, 30, 45, 60, 90];

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Volume */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Объём спирта (мл)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setVolume, volume, -100)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setVolume, volume, 100)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Initial ABV */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Крепость спирта (%)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setInitialAbv, initialAbv, -1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={initialAbv}
              onChange={(e) => setInitialAbv(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setInitialAbv, initialAbv, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Sugar */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Сахар (г)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setSugar, sugar, -10)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={sugar}
              onChange={(e) => setSugar(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setSugar, sugar, 10)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Water */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Добавлено воды (мл)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setWater, water, -50)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={water}
              onChange={(e) => setWater(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setWater, water, 50)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Infusion period */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Срок настаивания
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {dayOptions.map((d) => (
              <button
                key={d}
                onClick={() => setInfusionDays(d)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: infusionDays === d ? "var(--accent)" : "var(--surface)",
                  color: infusionDays === d ? "#fff" : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {d} дн
              </button>
            ))}
          </div>
        </div>

        {/* Infusion ingredients */}
        <div
          className="rounded-xl p-4 sm:col-span-2"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Ингредиенты для настаивания
          </label>
          <textarea
            value={infusionIngredients}
            onChange={(e) => setInfusionIngredients(e.target.value)}
            placeholder="Например: вишня 500г, ваниль 1 стручок, корица 2 палочки..."
            className="w-full mt-2 rounded-lg px-4 py-2.5 text-base outline-none resize-none"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              minHeight: 60,
            }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={calculate}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105"
          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <Calculator size={22} />
          Рассчитать
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-medium transition-all hover:scale-105"
          style={{
            background: "var(--surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
          }}
        >
          <RotateCcw size={28} />
          Сброс
        </button>
      </div>

      {result !== null && (
        <div
          className="mt-6 rounded-xl p-6 space-y-3"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <div className="text-center">
            <div className="text-base opacity-80 mb-1" style={{ fontFamily: "var(--font-body)" }}>
              Итоговая крепость напитка
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {result.abv}%
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
            <div>
              <div className="text-sm opacity-70" style={{ fontFamily: "var(--font-body)" }}>Общий объём</div>
              <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>{result.totalVolume} мл</div>
            </div>
            <div>
              <div className="text-sm opacity-70" style={{ fontFamily: "var(--font-body)" }}>Срок настаивания</div>
              <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>{result.days} дней</div>
            </div>
            <div>
              <div className="text-sm opacity-70" style={{ fontFamily: "var(--font-body)" }}>Содержание сахара</div>
              <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>{sugar} г</div>
            </div>
          </div>

          {result.ingredients && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
              <div className="text-sm opacity-70 mb-1" style={{ fontFamily: "var(--font-body)" }}>Ингредиенты для настаивания</div>
              <div className="text-base" style={{ fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                {result.ingredients}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LABEL SIZES: standard bottle label sizes (mm)
   ═══════════════════════════════════════════════════════════════ */
const LABEL_SIZES = [
  { name: "90 × 120 мм", w: 90, h: 120, perA4: 4, layout: "2×2", desc: "Универсальная" },
  { name: "120 × 80 мм", w: 120, h: 80, perA4: 4, layout: "2×2", desc: "Горизонтальная" },
  { name: "80 × 130 мм", w: 80, h: 130, perA4: 4, layout: "2×2", desc: "Вертикальная" },
  { name: "100 × 140 мм", w: 100, h: 140, perA4: 2, layout: "1×2", desc: "Винная" },
  { name: "90 × 90 мм", w: 90, h: 90, perA4: 6, layout: "2×3", desc: "Квадратная" },
  { name: "70 × 90 мм", w: 70, h: 90, perA4: 6, layout: "2×3", desc: "Мини" },
  { name: "60 × 80 мм", w: 60, h: 80, perA4: 9, layout: "3×3", desc: "Микро" },
  { name: "Ø 75 мм", w: 75, h: 75, perA4: 6, layout: "2×3", desc: "Круглая", round: true },
];

/* ═══════════════════════════════════════════════════════════════
   20 LABEL TEMPLATES — image-based
   ═══════════════════════════════════════════════════════════════ */
const TEMPLATES = [
  { id: 1,  name: "Классика",        family: "serif",    border: "3px solid #8B4513", bg: "linear-gradient(135deg,#f5efe6,#faf6f0)", decor: "ornament", accent: "#8B4513", image: "/labels/template-01-classic.jpg" },
  { id: 2,  name: "Минимализм",      family: "sans",     border: "2px solid #2d2d2d", bg: "#ffffff", decor: "none", accent: "#2d2d2d", image: "/labels/template-02-minimal.jpg" },
  { id: 3,  name: "Крафт",           family: "mono",     border: "2px dashed #5a4a3a", bg: "repeating-linear-gradient(45deg,#faf6f0,#faf6f0 10px,#f0ebe0 10px,#f0ebe0 20px)", decor: "stamp", accent: "#5a4a3a", image: "/labels/template-03-craft.jpg" },
  { id: 4,  name: "Ар-деко",         family: "serif",    border: "2px solid #c9a227", bg: "linear-gradient(135deg,#0f0f23,#1a1a3e)", decor: "deco", accent: "#c9a227", image: "/labels/template-04-deco.jpg" },
  { id: 5,  name: "Хохлома",         family: "serif",    border: "3px solid #c9a227", bg: "#1a1a1a", decor: "folk", accent: "#e63946", image: "/labels/template-05-folk.jpg" },
  { id: 6,  name: "Винтаж золото",   family: "serif",    border: "4px double #b8860b", bg: "linear-gradient(180deg,#1a1a2e,#16213e)", decor: "gold", accent: "#b8860b", image: null },
  { id: 7,  name: "Современный",     family: "sans",     border: "none", bg: "linear-gradient(135deg,#667eea,#764ba2)", decor: "gradient", accent: "#ffffff", image: null },
  { id: 8,  name: "Рустик",          family: "serif",    border: "3px solid #6b4423", bg: "#f4e8d0", decor: "rope", accent: "#6b4423", image: null },
  { id: 9,  name: "Скандинавия",     family: "sans",     border: "2px solid #3d5a80", bg: "#f0f4f8", decor: "nordic", accent: "#3d5a80", image: null },
  { id: 10, name: "Бохо",            family: "cursive",  border: "2px solid #d4a373", bg: "linear-gradient(135deg,#faedcd,#fefae0)", decor: "floral", accent: "#d4a373", image: null },
  { id: 11, name: "Индустриальный",  family: "mono",     border: "2px solid #495057", bg: "#e9ecef", decor: "grid", accent: "#495057", image: null },
  { id: 12, name: "Пастель",         family: "sans",     border: "2px solid #f4a261", bg: "linear-gradient(135deg,#ffe5d9,#ffd7ba)", decor: "soft", accent: "#f4a261", image: null },
  { id: 13, name: "Готика",          family: "serif",    border: "3px solid #2b2d42", bg: "linear-gradient(180deg,#2b2d42,#1a1a2e)", decor: "gothic", accent: "#c9a227", image: null },
  { id: 14, name: "Тропики",         family: "sans",     border: "2px solid #2a9d8f", bg: "linear-gradient(135deg,#e9f5db,#d8f3dc)", decor: "leaf", accent: "#2a9d8f", image: null },
  { id: 15, name: "Мрамор",          family: "serif",    border: "2px solid #adb5bd", bg: "linear-gradient(135deg,#f8f9fa,#e9ecef 50%,#dee2e6 50%,#ced4da)", decor: "marble", accent: "#495057", image: null },
  { id: 16, name: "Французский",     family: "serif",    border: "2px solid #9b2226", bg: "linear-gradient(135deg,#fff0f3,#ffe5ec)", decor: "fleur", accent: "#9b2226", image: null },
  { id: 17, name: "Морской",         family: "sans",     border: "2px solid #0077b6", bg: "linear-gradient(180deg,#caf0f8,#90e0ef)", decor: "wave", accent: "#0077b6", image: null },
  { id: 18, name: "Лесной",          family: "serif",    border: "2px solid #386641", bg: "linear-gradient(135deg,#d8f3dc,#b7e4c7)", decor: "tree", accent: "#386641", image: null },
  { id: 19, name: "Премьер",         family: "sans",     border: "2px solid #212529", bg: "linear-gradient(135deg,#f8f9fa,#ffffff)", decor: "foil", accent: "#212529", image: null },
  { id: 20, name: "Космос",          family: "sans",     border: "2px solid #7209b7", bg: "linear-gradient(180deg,#10002b,#240046,#3c096c)", decor: "stars", accent: "#e0aaff", image: null },
];

function getFontFamily(family: string) {
  switch (family) {
    case "serif": return '"Playfair Display", Georgia, serif';
    case "sans": return '"Inter", system-ui, sans-serif';
    case "mono": return '"Courier New", monospace';
    case "cursive": return '"Georgia", serif';
    default: return '"Inter", sans-serif';
  }
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENT: Label Constructor
   ═══════════════════════════════════════════════════════════════ */
function LabelConstructor() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateId, setTemplateId] = useState(1);
  const [labelText, setLabelText] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sizeIdx, setSizeIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  /* Check if user came from recipe page */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("label-recipe-data");
      if (raw) {
        const data = JSON.parse(raw) as { title: string; slug: string };
        setLabelText(data.title);
        setSubtitle("Сканируй для рецепта");
        QRCode.toDataURL(`${window.location.origin}/#/recipe/${data.slug}`, {
          width: 120,
          margin: 1,
          color: { dark: "#5a3a1a", light: "#ffffff" },
        }).then((url: string) => setQrDataUrl(url));
        localStorage.removeItem("label-recipe-data");
      }
    } catch { /* ignore */ }
  }, []);

  // Шаблоны из БД (добавляются к захардкоженным)
  const { data: dbTemplates } = trpc.labelTemplate.list.useQuery();
  const allTemplates = [
    ...TEMPLATES,
    ...(dbTemplates ?? [])
      .filter(t => t.isActive === 1)
      .map(t => ({
        id: t.id + 1000,
        name: t.name,
        family: t.fontFamily ?? "serif",
        border: t.border ?? "2px solid #8B4513",
        bg: t.bg ?? "linear-gradient(135deg,#faf6f0,#f5efe6)",
        decor: "none",
        accent: t.accent ?? "#8B4513",
        image: t.image ?? null,
        zones: t.zones ?? null,
      })),
  ];

  const tpl = allTemplates.find((t) => t.id === templateId) ?? allTemplates[0];
  const sz = LABEL_SIZES[sizeIdx];

  const scale = Math.min(1, 340 / Math.max(sz.w, sz.h));
  const prevW = Math.round(sz.w * scale);
  const prevH = Math.round(sz.h * scale);

  function handlePrint() {
    setQuantity(1);
    setStep(3);
  }

  /* Step 1: Choose template */
  if (step === 1) {
    return (
      <div>
        <p className="text-base mb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          Выберите шаблон из коллекции. Затем вы сможете вписать своё название и подпись.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {allTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTemplateId(t.id); setStep(2); }}
              className="rounded-xl p-3 text-center transition-all hover:scale-[1.03]"
              style={{
                background: t.bg,
                border: t.id === templateId ? `2px solid ${t.accent}` : "1px solid var(--border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {/* Mini preview */}
              <div
                className="mx-auto mb-2 rounded flex items-center justify-center text-center overflow-hidden"
                style={{
                  width: 72,
                  height: 90,
                  border: t.border,
                  background: t.image ? undefined : t.bg,
                  fontFamily: getFontFamily(t.family),
                  color: t.accent,
                  fontSize: 8,
                  fontWeight: "bold",
                  lineHeight: 1.2,
                }}
              >
                {t.image ? (
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                ) : (
                  <div>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>Aa</div>
                    <div style={{ fontSize: 7, opacity: 0.7 }}>{t.name}</div>
                  </div>
                )}
              </div>
              <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                {t.id}. {t.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* Step 2: Edit text + preview */
  if (step === 2) {
    return (
      <div>
        {/* Full-screen preview modal */}
        {showPreviewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setShowPreviewModal(false)}
          >
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute -top-10 right-0 text-white text-sm opacity-70 hover:opacity-100"
                style={{ fontFamily: "var(--font-body)" }}
              >
                ✕ Закрыть
              </button>
              <div
                className="relative flex flex-col items-center justify-center text-center"
                style={{
                  width: sz.round ? "70vmin" : "min(70vw, 70vh * 0.75)",
                  height: sz.round ? "70vmin" : "min(70vh, 70vw * 1.33)",
                  background: tpl.image ? "#000" : tpl.bg,
                  border: tpl.border,
                  borderRadius: sz.round ? "50%" : 8,
                  boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                  padding: "5%",
                  overflow: "hidden",
                }}
              >
                {tpl.image && (
                  <img src={tpl.image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }} />
                )}
                <div className="relative" style={{ zIndex: 1, textShadow: tpl.image ? "0 1px 4px rgba(0,0,0,0.7)" : "none" }}>
                  <div
                    className="font-bold leading-tight"
                    style={{
                      color: tpl.image ? "#fff" : tpl.accent,
                      fontFamily: getFontFamily(tpl.family),
                      fontSize: "clamp(20px, 5vh, 48px)",
                      wordBreak: "break-word",
                    }}
                  >
                    {labelText || "Название"}
                  </div>
                  {subtitle && (
                    <div
                      className="mt-2"
                      style={{
                        color: tpl.image ? "rgba(255,255,255,0.85)" : tpl.accent,
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(12px, 3vh, 28px)",
                        opacity: 0.85,
                        wordBreak: "break-word",
                      }}
                    >
                      {subtitle}
                    </div>
                  )}
                </div>
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    className="absolute rounded"
                    style={{
                      width: Math.round(prevH * 2.5 * 0.22),
                      height: Math.round(prevH * 2.5 * 0.22),
                      bottom: 12,
                      right: 12,
                      zIndex: 2,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-2 text-sm mb-5 px-4 py-2 rounded-xl transition-all hover:opacity-80"
          style={{ color: "var(--accent)", fontFamily: "var(--font-body)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={16} />
          Назад к шаблонам
        </button>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Название напитка
              </label>
              <input
                type="text"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                placeholder="Например: Вишнёвка бабушкина"
                className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Подпись / описание
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Например: Домашний рецепт · 2025 · 25%"
                className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
              />
            </div>

            {/* Size selector */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Размер этикетки
              </label>
              <div className="flex flex-wrap gap-2">
                {LABEL_SIZES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSizeIdx(i)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: sizeIdx === i ? "var(--accent)" : "var(--surface)",
                      color: sizeIdx === i ? "#fff" : "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                    }}
                    title={`${s.desc} — ${s.layout} на листе А4`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                На листе А4 поместится: <strong>{sz.perA4} шт</strong> ({sz.layout})
              </p>
            </div>

            <button
              onClick={handlePrint}
              disabled={!labelText.trim()}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
            >
              <Download size={22} />
              Скачать для печати
            </button>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 16 }}>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Нажмите на этикетку для увеличения
            </p>
            <div
              className="relative flex flex-col items-center justify-center text-center transition-all cursor-zoom-in hover:scale-[1.02]"
              onClick={() => setShowPreviewModal(true)}
              style={{
                width: prevW,
                height: prevH,
                background: tpl.image ? "#000" : tpl.bg,
                border: tpl.border,
                borderRadius: sz.round ? "50%" : 4,
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                padding: 8,
                overflow: "hidden",
              }}
            >
              {tpl.image && (
                <img
                  src={tpl.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ zIndex: 0 }}
                />
              )}
              <div className="relative" style={{ zIndex: 1, textShadow: tpl.image ? "0 1px 4px rgba(0,0,0,0.7)" : "none" }}>
                <div
                  className="font-bold leading-tight"
                  style={{
                    color: tpl.image ? "#fff" : tpl.accent,
                    fontFamily: getFontFamily(tpl.family),
                    fontSize: Math.max(10, Math.round(prevH * 0.15)),
                    wordBreak: "break-word",
                  }}
                >
                  {labelText || "Название"}
                </div>
                {subtitle && (
                  <div
                    className="mt-1"
                    style={{
                      color: tpl.image ? "rgba(255,255,255,0.85)" : tpl.accent,
                      fontFamily: "var(--font-body)",
                      fontSize: Math.max(7, Math.round(prevH * 0.08)),
                      opacity: 0.85,
                      wordBreak: "break-word",
                      textShadow: tpl.image ? "0 1px 3px rgba(0,0,0,0.7)" : "none",
                    }}
                  >
                    {subtitle}
                  </div>
                )}
              </div>

              {/* QR code on label */}
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR"
                  className="absolute rounded"
                  style={{
                    width: Math.max(20, Math.round(prevH * 0.22)),
                    height: Math.max(20, Math.round(prevH * 0.22)),
                    bottom: 4,
                    right: 4,
                    zIndex: 2,
                    border: "1px solid rgba(255,255,255,0.5)",
                    background: "#fff",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Step 3: Print layout */
  const maxQ = sz.perA4;
  const gridCols = Math.ceil(Math.sqrt(quantity * (Number(sz.w) / Number(sz.h))));
  const ratioStr = String(sz.w) + " / " + String(sz.h);
  return (
    <div>
      <button
        onClick={() => setStep(2)}
        className="text-sm mb-4 transition-opacity hover:opacity-70"
        style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
      >
        ← Назад к редактированию
      </button>

      {/* Quantity selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Сколько этикеток на листе А4 (макс. {maxQ})
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxQ }, (_, i) => i + 1).map((q) => (
            <button
              key={q}
              onClick={() => setQuantity(q)}
              className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
              style={{
                background: quantity === q ? "var(--accent)" : "var(--surface)",
                color: quantity === q ? "#fff" : "var(--text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Print preview */}
      <div
        className="mb-5 p-4 sm:p-6 overflow-auto"
        style={{ background: "#fff", border: "1px dashed var(--border)", borderRadius: 4 }}
      >
        <div
          style={{
            width: 210,
            minHeight: 297,
            margin: "0 auto",
            background: "#fff",
            display: "grid",
            gridTemplateColumns: "repeat(" + gridCols + ", 1fr)",
            gap: 4,
            padding: 8,
          }}
        >
          {Array.from({ length: quantity }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center text-center"
              style={{
                aspectRatio: ratioStr,
                background: tpl.bg,
                border: tpl.border,
                borderRadius: sz.round ? "50%" : 2,
                padding: "4px 2px",
                overflow: "hidden",
                pageBreakInside: "avoid",
              }}
            >
              <div
                style={{
                  color: tpl.accent,
                  fontFamily: getFontFamily(tpl.family),
                  fontSize: "min(10px, 1.8vw)",
                  fontWeight: "bold",
                  lineHeight: 1.15,
                  wordBreak: "break-word",
                }}
              >
                {labelText}
              </div>
              {subtitle && (
                <div
                  style={{
                    color: tpl.accent,
                    fontFamily: "var(--font-body)",
                    fontSize: "min(7px, 1.2vw)",
                    opacity: 0.7,
                    marginTop: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
      >
        <Download size={22} />
        Печать {quantity} этикет{quantity === 1 ? "ки" : quantity < 5 ? "ки" : "ок"} на А4
      </button>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          body > div:last-child { display: block !important; }
          body > div:last-child > * { display: none !important; }
          body > div:last-child > div:nth-child(3) {
            display: block !important;
            position: fixed;
            top: 0; left: 0;
            width: 210mm; height: 297mm;
            margin: 0; padding: 0;
          }
          body > div:last-child > div:nth-child(3) > div {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            gap: 5mm !important;
          }
          body > div:last-child > div:nth-child(3) > div > div {
            page-break-inside: avoid !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   MAIN: Tools Page
   ============================================================ */
const tools = [
  {
    id: "taste",
    num: "01",
    icon: Wand2,
    title: "Калькулятор вкуса с ИИ",
    desc: "Опишите идею или выберите ингредиенты — ИИ составит рецептуру, расскажет о вкусовом профиле и предложит варианты.",
    badge: "Главный инструмент",
    color: "var(--accent)",
    content: <TasteCalculator />,
  },
  {
    id: "abv",
    num: "02",
    icon: Calculator,
    title: "Расчёт крепости",
    desc: "Точный расчёт крепости напитка с учётом всех параметров, которые обычно игнорирует ареометр.",
    badge: null,
    color: "var(--accent)",
    content: <AbvCalculator />,
  },
  {
    id: "label",
    num: "03",
    icon: Tag,
    title: "Моя этикетка",
    desc: "Выберите готовый шаблон из коллекции, впишите название напитка и подпись — скачайте для печати на А4.",
    badge: "Популярное",
    color: "var(--accent)",
    content: <LabelConstructor />,
  },
  {
    id: "generate",
    num: "04",
    icon: Sparkles,
    title: "Сгенерировать этикетку",
    desc: "ИИ создаст уникальную этикетку по вашему описанию. Укажите стиль, цвета, элементы — или доверьтесь ИИ.",
    badge: "ИИ",
    color: "var(--accent)",
    content: <LabelGeneratorPromo />,
  },
];

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENT: Label Generator Promo (inside Tools page)
   ═══════════════════════════════════════════════════════════════ */
function LabelGeneratorPromo() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-3" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
          Уникальная этикетка за 3 шага
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>1</div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              Опишите желаемый дизайн — стиль (винтаж, минимализм, хохлома), цветовая гамма, элементы (цветы, геометрия, орнаменты). Или просто дайте ИИ свободу.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>2</div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              ИИ генерирует уникальную этикетку. Вы получаете готовое изображение, которое можно редактировать — добавить текст, название, крепость, дату.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>3</div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              Скачайте в нужном размере и распечатайте на А4. Можно разместить до 6-9 этикеток на одном листе.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Что умеет ИИ-генератор
        </h3>
        <ul className="text-base space-y-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          <li>• Создаёт уникальный дизайн по текстовому описанию</li>
          <li>• Поддерживает любой стиль: от русской хохломы до киберпанка</li>
          <li>• Добавляет орнаменты, рамки, фоны, текстуры</li>
          <li>• Создаёт этикетки с пустым центром для вашего текста</li>
          <li>• Адаптирует дизайн под размер бутылки</li>
        </ul>
      </div>

      <a
        href="/#/tools/generate-label"
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
      >
        <Sparkles size={22} />
        Перейти к генерации
      </a>

      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        Генерация этикеток — платная услуга. Стоимость: от 15 рублей за этикетку. Для генерации требуется авторизация.
      </p>
    </div>
  );
}

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState("taste");
  const navigate = useNavigate();

  /* Auto-select label tab when coming from recipe page */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("?label") || hash.includes("label")) {
      setActiveTool("label");
      window.location.hash = "#/tools";
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={18} /> Назад
          </button>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Sparkles size={22} />
            Все инструменты в одном месте
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Инструменты <span style={{ color: "var(--accent)" }}>проекта</span>
          </h1>
          <p
            className="text-lg max-w-xl"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
          >
            Базовые инструменты бесплатны. Без регистрации — 2 пробных запроса к ИИ.
            После регистрации — 5 запросов в день.
          </p>
        </div>
      </section>

      {/* ===== Tab Navigation ===== */}
      <section className="sticky top-16 z-30 py-4" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium whitespace-nowrap transition-all hover:scale-[1.02]"
                style={{
                  background: activeTool === tool.id ? "var(--accent)" : "var(--bg-card)",
                  color: activeTool === tool.id ? "#fff" : "var(--text-secondary)",
                  border: activeTool === tool.id ? "none" : "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <tool.icon size={28} />
                <span className="hidden sm:inline">{tool.title.split(" ").slice(0, 2).join(" ")}</span>
                <span className="sm:hidden">{tool.num}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tool Content ===== */}
      <section className="py-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {tools.map((tool) => {
            if (tool.id !== activeTool) return null;
            return (
              <div key={tool.id}>
                <div
                  className="rounded-2xl overflow-hidden mb-6"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: "var(--surface)" }}
                      >
                        <tool.icon size={28} style={{ color: "var(--accent)" }} />
                      </div>
                      <div>
                        {tool.badge && (
                          <div
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mb-1"
                            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                          >
                            <Sparkles size={10} />
                            {tool.badge}
                          </div>
                        )}
                        <h2
                          className="text-xl font-bold"
                          style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                        >
                          {tool.title}
                        </h2>
                      </div>
                    </div>
                    <p
                      className="text-base mb-6"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                    >
                      {tool.desc}
                    </p>

                    <div
                      className="rounded-xl p-5"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    >
                      {tool.content}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    Без регистрации — 2 пробных запроса. После регистрации — 5 запросов/день к базовой модели.
                    Для продвинутых моделей — оплата за запрос, без подписки.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
