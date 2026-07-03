import { useState, useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
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
  Star,
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
];

/* ═══════════════════════════════════════════════════════════════
   20 LABEL TEMPLATES — image-based
   ═══════════════════════════════════════════════════════════════ */
const TEMPLATES: Array<{ id: number; name: string; family: string; border: string; bg: string; decor: string; accent: string; image: string | null }> = [];

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
// Small canvas component for A4 preview
function A4LabelCanvas({ width, height, scale, paintFn }: {
  width: number; height: number; scale: number;
  paintFn: (canvas: HTMLCanvasElement, scale: number) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const canvas = document.createElement("canvas");
    paintFn(canvas, scale);
    // Wait for async image loads (bg image + user image)
    setTimeout(() => {
      setDataUrl(canvas.toDataURL("image/png"));
    }, 600);
  }, [paintFn, scale]);

  if (!dataUrl) {
    return <div style={{ width, height, background: "#f5f5f5", display: "block" }} />;
  }

  return (
    <img
      src={dataUrl}
      style={{ width, height, display: "block", pageBreakInside: "avoid" }}
      alt="этикетка"
    />
  );
}

function LabelConstructor({ editData }: { editData?: any }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateId, setTemplateId] = useState(1);
  const [labelText, setLabelText] = useState("");
  const [labelDate, setLabelDate] = useState("");
  const [labelStrength, setLabelStrength] = useState("");
  const [sizeIdx, setSizeIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [savedLabelId, setSavedLabelId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [imageShape, setImageShape] = useState<"rect" | "rounded" | "oval" | "circle">("rect");
  const [imageZoneScale, setImageZoneScale] = useState(1.0);
  const [showCropper, setShowCropper] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropScale, setCropScale] = useState(1);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const cropPinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Paste image from clipboard
  useEffect(() => {
    if (step !== 2) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (ev) => openCropperWithSrc(ev.target?.result as string);
          reader.readAsDataURL(file);
          break;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [step]);

  // Load image from file input — open cropper
  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setCropOffset({ x: 0, y: 0 });
      setCropScale(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  // Paste — also open cropper
  // (override paste handler to use cropper)

  function openCropperWithSrc(src: string) {
    setCropSrc(src);
    setCropOffset({ x: 0, y: 0 });
    setCropScale(1);
    setShowCropper(true);
  }

  function drawCropper() {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const S = 400; // crop canvas size
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, S, S);

    // Draw checkerboard background
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(0, 0, S, S);
    for (let r = 0; r < S / 20; r++) for (let c = 0; c < S / 20; c++) {
      if ((r + c) % 2 === 0) { ctx.fillStyle = "#f0f0f0"; ctx.fillRect(c*20, r*20, 20, 20); }
    }

    // Draw image with offset and scale
    const iw = img.naturalWidth * cropScale;
    const ih = img.naturalHeight * cropScale;
    const ix = (S - iw) / 2 + cropOffset.x;
    const iy = (S - ih) / 2 + cropOffset.y;
    ctx.drawImage(img, ix, iy, iw, ih);

    // Draw shape overlay (darken outside)
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    if (imageShape === "circle") {
      ctx.arc(S/2, S/2, S/2 - 4, 0, Math.PI*2);
    } else if (imageShape === "oval") {
      ctx.ellipse(S/2, S/2, S/2 - 4, S/2 - 4, 0, 0, Math.PI*2);
    } else if (imageShape === "rounded") {
      const r = S * 0.12;
      ctx.moveTo(4+r, 4); ctx.arcTo(S-4, 4, S-4, S-4, r);
      ctx.arcTo(S-4, S-4, 4, S-4, r); ctx.arcTo(4, S-4, 4, 4, r);
      ctx.arcTo(4, 4, S-4, 4, r); ctx.closePath();
    } else {
      ctx.rect(4, 4, S-8, S-8);
    }
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (imageShape === "circle") ctx.arc(S/2, S/2, S/2-4, 0, Math.PI*2);
    else if (imageShape === "oval") ctx.ellipse(S/2, S/2, S/2-4, S/2-4, 0, 0, Math.PI*2);
    else { ctx.rect(4, 4, S-8, S-8); }
    ctx.stroke();
  }

  function applyCrop() {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const S = 400;
    const out = document.createElement("canvas");
    out.width = S; out.height = S;
    const ctx = out.getContext("2d")!;

    // Clip shape
    ctx.beginPath();
    if (imageShape === "circle") ctx.arc(S/2, S/2, S/2, 0, Math.PI*2);
    else if (imageShape === "oval") ctx.ellipse(S/2, S/2, S/2, S/2, 0, 0, Math.PI*2);
    else if (imageShape === "rounded") {
      const r = S * 0.12;
      ctx.moveTo(r, 0); ctx.arcTo(S, 0, S, S, r); ctx.arcTo(S, S, 0, S, r);
      ctx.arcTo(0, S, 0, 0, r); ctx.arcTo(0, 0, S, 0, r); ctx.closePath();
    } else {
      ctx.rect(0, 0, S, S);
    }
    ctx.clip();

    const iw = img.naturalWidth * cropScale;
    const ih = img.naturalHeight * cropScale;
    const ix = (S - iw) / 2 + cropOffset.x;
    const iy = (S - ih) / 2 + cropOffset.y;
    ctx.drawImage(img, ix, iy, iw, ih);

    setUserImage(out.toDataURL("image/png"));
    setShowCropper(false);
  }

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Restore label state from editData prop (passed from profile)
  useEffect(() => {
    if (!editData) return;
    setTemplateId(editData.templateId || 1001);
    setLabelText(editData.labelText || "");
    setLabelDate(editData.labelDate || "");
    setLabelStrength(editData.labelStrength || "");
    setImageShape(editData.imageShape || "rect");
    setImageZoneScale(Number(editData.imageZoneScale) || 1);
    setSavedLabelId(editData.id);
    setStep(2);
  }, [editData]);

  // Redraw cropper when params change
  useEffect(() => {
    if (showCropper && cropImgRef.current?.complete) drawCropper();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropOffset, cropScale, imageShape, showCropper]);

  // Draw on canvas when data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || step !== 2) return;
    paintCanvas(canvas, 0.3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, labelText, labelDate, labelStrength, templateId, sizeIdx, userImage, imageShape, imageZoneScale]);

  useEffect(() => {
    const canvas = modalCanvasRef.current;
    if (!canvas || !showPreviewModal) return;
    paintCanvas(canvas, 0.65);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewModal, labelText, labelDate, labelStrength, templateId, userImage, imageShape, imageZoneScale]);

  /* Check if user came from recipe page */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("label-recipe-data");
      if (raw) {
        const data = JSON.parse(raw) as { title: string; slug: string };
        setLabelText(data.title);
        setLabelDate(""); setLabelStrength("");
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
  const { isLoggedIn } = useAuth();
  const { data: dbTemplates } = trpc.labelTemplate.list.useQuery();
  const { data: templateTypes } = trpc.labelTemplate.listTypes.useQuery();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const saveLabelMutation = trpc.savedLabels.save.useMutation({
    onSuccess: (data) => { setSavedLabelId(data.id); setIsSaving(false); },
    onError: () => setIsSaving(false),
  });
  const deleteLabelMutation = trpc.savedLabels.delete.useMutation({
    onSuccess: () => setSavedLabelId(null),
  });
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

  function paintCanvas(canvas: HTMLCanvasElement, sc: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const CW = Math.round(1086 * sc);
    const CH = Math.round(1448 * sc);
    canvas.width = CW;
    canvas.height = CH;
    ctx.clearRect(0, 0, CW, CH);

    function drawZones() {
      const zones = (tpl as any).zones as Array<{id: string, x: number, y: number, w: number, h: number, fontSize: number, align: string}> | null;
      if (zones && zones.length > 0) {
        zones.forEach(zone => {
          const zx = Math.round(zone.x * sc);
          const zy = Math.round(zone.y * sc);
          const zw = Math.round(zone.w * sc);
          const fs = Math.round(zone.fontSize * sc);
          const zh = Math.round(zone.h * sc);
          ctx.font = "bold " + fs + "px serif";
          ctx.fillStyle = tpl.accent || "#8B4513";
          ctx.textAlign = (zone.align as CanvasTextAlign) || "center";
          ctx.textBaseline = "middle";
          const text = zone.id === "title" ? (labelText || "")
            : zone.id === "date" ? labelDate
            : zone.id === "strength" ? labelStrength
            : "";
          if (text) {
            const tx = zone.align === "center" ? zx + zw / 2 : zone.align === "right" ? zx + zw : zx;
            const words = text.split(" ");
            let line = "";
            const lines: string[] = [];
            words.forEach(word => {
              const test = line + word + " ";
              if (ctx.measureText(test).width > zw && line) { lines.push(line.trim()); line = word + " "; }
              else { line = test; }
            });
            lines.push(line.trim());
            let lineY = zy + (zh - lines.length * fs * 1.3) / 2 + fs * 0.7;
            lines.forEach(l => { ctx.fillText(l, tx, lineY, zw); lineY += fs * 1.3; });
          }
        });
      } else {
        // Default zones — same coordinates for all templates without custom zones
        const defaultZones = [
          { id: "title",    x: 190, y: 1090, w: 706, h: 80,  fontSize: 72, align: "center" },
          { id: "date",     x: 270, y: 1240, w: 200, h: 60,  fontSize: 52, align: "center" },
          { id: "strength", x: 580, y: 1240, w: 200, h: 60,  fontSize: 52, align: "center" },
        ];
        defaultZones.forEach(zone => {
          const zx = Math.round(zone.x * sc);
          const zy = Math.round(zone.y * sc);
          const zw = Math.round(zone.w * sc);
          const fs = Math.round(zone.fontSize * sc);
          const zh = Math.round(zone.h * sc);
          ctx.font = "bold " + fs + "px serif";
          ctx.fillStyle = tpl.accent || "#8B4513";
          ctx.textAlign = zone.align as CanvasTextAlign;
          ctx.textBaseline = "middle";
          const text = zone.id === "title" ? (labelText || "")
            : zone.id === "date" ? labelDate
            : zone.id === "strength" ? labelStrength
            : "";
          if (text) {
            const tx = zone.align === "center" ? zx + zw / 2 : zx;
            const words = text.split(" ");
            let line = "";
            const lines: string[] = [];
            words.forEach(word => {
              const test = line + word + " ";
              if (ctx.measureText(test).width > zw && line) { lines.push(line.trim()); line = word + " "; }
              else { line = test; }
            });
            lines.push(line.trim());
            let lineY = zy + (zh - lines.length * fs * 1.3) / 2 + fs * 0.7;
            lines.forEach(l => { ctx.fillText(l, tx, lineY, zw); lineY += fs * 1.3; });
          }
        });
      }
    }

  // Find image zone dimensions
  const imgZone = ((tpl as any).zones as any[] | null)?.find((z: any) => z.id === "image");

  function applyShapeClip(zx: number, zy: number, zw: number, zh: number) {
    ctx.beginPath();
    if (imageShape === "circle") {
      const r = Math.min(zw, zh) / 2;
      ctx.arc(zx + zw / 2, zy + zh / 2, r, 0, Math.PI * 2);
    } else if (imageShape === "oval") {
      ctx.ellipse(zx + zw / 2, zy + zh / 2, zw / 2, zh / 2, 0, 0, Math.PI * 2);
    } else if (imageShape === "rounded") {
      const r = Math.min(zw, zh) * 0.12;
      ctx.moveTo(zx + r, zy);
      ctx.arcTo(zx + zw, zy, zx + zw, zy + zh, r);
      ctx.arcTo(zx + zw, zy + zh, zx, zy + zh, r);
      ctx.arcTo(zx, zy + zh, zx, zy, r);
      ctx.arcTo(zx, zy, zx + zw, zy, r);
      ctx.closePath();
    } else {
      ctx.rect(zx, zy, zw, zh);
    }
    ctx.clip();
  }

  function drawUserImage(preloaded: HTMLImageElement | null) {
    if (!imgZone) return;
    // Apply imageZoneScale symmetrically from center
    const baseW = imgZone.w * sc;
    const baseH = imgZone.h * sc;
    const baseCX = imgZone.x * sc + baseW / 2;
    const baseCY = imgZone.y * sc + baseH / 2;
    const scaledW = baseW * imageZoneScale;
    const scaledH = baseH * imageZoneScale;
    const zx = Math.round(baseCX - scaledW / 2);
    const zy = Math.round(baseCY - scaledH / 2);
    const zw = Math.round(scaledW);
    const zh = Math.round(scaledH);
    if (preloaded) {
      ctx.save();
      applyShapeClip(zx, zy, zw, zh);
      const ratio = Math.min(zw / preloaded.width, zh / preloaded.height);
      const dw = Math.round(preloaded.width * ratio);
      const dh = Math.round(preloaded.height * ratio);
      const dx = zx + Math.round((zw - dw) / 2);
      const dy = zy + Math.round((zh - dh) / 2);
      ctx.drawImage(preloaded, dx, dy, dw, dh);
      ctx.restore();
    } else {
      // No placeholder - templates with images don't need it
    }
  }

  function doRender(preloadedUser: HTMLImageElement | null) {
    if (tpl.image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { ctx.drawImage(img, 0, 0, CW, CH); drawUserImage(preloadedUser); drawZones(); };
      img.onerror = () => { ctx.fillStyle = tpl.bg || "#faf6f0"; ctx.fillRect(0, 0, CW, CH); drawUserImage(preloadedUser); drawZones(); };
      img.src = tpl.image;
    } else {
      ctx.fillStyle = tpl.bg || "#faf6f0";
      ctx.fillRect(0, 0, CW, CH);
      drawUserImage(preloadedUser);
      drawZones();
    }
  }

  if (userImage) {
    const uImg = new Image();
    uImg.onload = () => doRender(uImg);
    uImg.src = userImage;
  } else {
    doRender(null);
  }
  }

  function handlePrint() {
    setQuantity(1);
    setStep(3);
  }

  function handleSaveLabel() {
    setIsSaving(true);
    // Generate tiny preview (scale 0.08 = ~87x116px, ~15KB base64)
    const canvas = document.createElement("canvas");
    paintCanvas(canvas, 0.15);
    setTimeout(() => {
      const previewUrl = canvas.toDataURL("image/jpeg", 0.6);
      saveLabelMutation.mutate({
        id: savedLabelId ?? undefined,
        templateId,
        labelText,
        labelDate,
        labelStrength,
        imageShape,
        imageZoneScale: String(imageZoneScale),
        previewUrl,
      });
    }, 700);
  }

  function doDownload() {
    const canvas = document.createElement("canvas");
    paintCanvas(canvas, 1.0);
    setTimeout(() => {
      const link = document.createElement("a");
      link.download = (labelText || "этикетка") + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }, 500);
  }

  function handleDownload() {
    const emptyFields = [];
    if (!labelText.trim()) emptyFields.push("Название напитка");
    if (!labelDate.trim()) emptyFields.push("Дата");
    if (!labelStrength.trim()) emptyFields.push("Крепость");
    if (emptyFields.length > 0) {
      setShowEmptyWarning(true);
    } else {
      doDownload();
    }
  }

  /* Step 1: Choose template */
  // Render template card helper
  function TemplateCard({ t }: { t: typeof allTemplates[0] }) {
    return (
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
        <div
          className="mx-auto mb-2 rounded flex items-center justify-center text-center overflow-hidden"
          style={{
            width: 72, height: 90,
            border: t.border,
            background: t.image ? undefined : t.bg,
            fontFamily: getFontFamily(t.family),
            color: t.accent,
            fontSize: 8, fontWeight: "bold", lineHeight: 1.2,
          }}
        >
          {t.image ? (
            <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <div><div style={{ fontSize: 14, marginBottom: 4 }}>Aa</div><div style={{ fontSize: 7, opacity: 0.7 }}>{t.name}</div></div>
          )}
        </div>
        <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
          {t.name}
        </div>
      </button>
    );
  }

  if (step === 1) {
    // Templates with types — grouped view
    const hasTypes = templateTypes && templateTypes.length > 0;
    const typedTemplates = allTemplates.filter(t => (t as any).typeId);
    const untypedTemplates = allTemplates.filter(t => !(t as any).typeId);

    // If type selected — show templates of that type
    if (selectedTypeId !== null) {
      const typeTemplates = allTemplates.filter(t => (t as any).typeId === selectedTypeId);
      const currentType = templateTypes?.find(t => t.id === selectedTypeId);
      return (
        <div>
          <button
            onClick={() => setSelectedTypeId(null)}
            className="inline-flex items-center gap-2 text-sm mb-5 px-4 py-2 rounded-xl transition-all hover:opacity-80"
            style={{ color: "var(--accent)", fontFamily: "var(--font-body)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            ← Все типы
          </button>
          <p className="text-base mb-5 font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            {currentType?.name}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {typeTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
          </div>
        </div>
      );
    }

    // Show types as cards
    return (
      <div>
        <p className="text-base mb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          Выберите тип этикетки. Затем выберите конкретный шаблон.
        </p>
        {hasTypes ? (
          <div>
            {/* Types grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {templateTypes!.map(type => {
                const baseTemplate = allTemplates.find(t => (t as any).typeId === type.id && (t as any).isBase === 1)
                  ?? allTemplates.find(t => (t as any).typeId === type.id);
                const count = allTemplates.filter(t => (t as any).typeId === type.id).length;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTypeId(type.id)}
                    className="rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02]"
                    style={{ border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", background: "var(--bg-card)" }}
                  >
                    <div className="w-full overflow-hidden" style={{ height: 140, background: "var(--bg-secondary)" }}>
                      {baseTemplate?.image ? (
                        <img src={baseTemplate.image} alt={type.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--text-muted)", fontSize: 32 }}>🏷️</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-sm" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{type.name}</div>
                      {type.description && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{type.description}</div>}
                      <div className="text-xs mt-1" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{count} шаблон{count === 1 ? "" : count < 5 ? "а" : "ов"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Templates without type */}
            {untypedTemplates.length > 0 && (
              <div>
                <p className="text-sm mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Другие шаблоны</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {untypedTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {allTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
          </div>
        )}
      </div>
    );
  }

  /* Step 2: Edit text + preview */
  if (step === 2) {
    return (
      <div>
        {/* Empty fields warning modal */}
        {showEmptyWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full" style={{ background: "var(--bg-card)" }}>
              <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Не все поля заполнены
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                {[
                  !labelText.trim() && "• Название напитка",
                  !labelDate.trim() && "• Дата",
                  !labelStrength.trim() && "• Крепость",
                ].filter(Boolean).map((item, i) => (
                  <div key={i}>{item}</div>
                ))}
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Скачать пустую этикетку или вернуться и заполнить?
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEmptyWarning(false); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                >
                  Заполнить
                </button>
                <button
                  onClick={() => { setShowEmptyWarning(false); doDownload(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
                >
                  Скачать как есть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Cropper Modal */}
        {showCropper && cropSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: "var(--bg-card)", maxWidth: 480, width: "100%" }}>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Настройте расположение фото
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Тяните фото · Два пальца — масштаб
              </div>
              <canvas
                ref={cropCanvasRef}
                width={400} height={400}
                style={{ borderRadius: 12, cursor: "grab", maxWidth: "100%", touchAction: "none" }}
                onMouseDown={(e) => {
                  cropDragRef.current = { startX: e.clientX, startY: e.clientY, ox: cropOffset.x, oy: cropOffset.y };
                }}
                onMouseMove={(e) => {
                  if (!cropDragRef.current) return;
                  const dx = e.clientX - cropDragRef.current.startX;
                  const dy = e.clientY - cropDragRef.current.startY;
                  setCropOffset({ x: cropDragRef.current.ox + dx, y: cropDragRef.current.oy + dy });
                }}
                onMouseUp={() => { cropDragRef.current = null; }}
                onMouseLeave={() => { cropDragRef.current = null; }}
                onWheel={(e) => {
                  e.preventDefault();
                  setCropScale(s => Math.max(0.1, Math.min(5, s - e.deltaY * 0.0003)));
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (e.touches.length === 1) {
                    cropDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, ox: cropOffset.x, oy: cropOffset.y };
                    cropPinchRef.current = null;
                  } else if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    cropPinchRef.current = { dist, scale: cropScale };
                    cropDragRef.current = null;
                  }
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  if (e.touches.length === 1 && cropDragRef.current) {
                    const dx = e.touches[0].clientX - cropDragRef.current.startX;
                    const dy = e.touches[0].clientY - cropDragRef.current.startY;
                    setCropOffset({ x: cropDragRef.current.ox + dx, y: cropDragRef.current.oy + dy });
                  } else if (e.touches.length === 2 && cropPinchRef.current) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const ratio = dist / cropPinchRef.current.dist;
                    setCropScale(Math.max(0.1, Math.min(5, cropPinchRef.current.scale * ratio)));
                  }
                }}
                onTouchEnd={() => { cropDragRef.current = null; cropPinchRef.current = null; }}
              />
              <img ref={cropImgRef} src={cropSrc} style={{ display: "none" }}
                onLoad={() => {
                  // Auto-fit
                  const img = cropImgRef.current!;
                  const S = 400;
                  const fit = Math.max(S / img.naturalWidth, S / img.naturalHeight);
                  setCropScale(fit);
                  drawCropper();
                }}
              />
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowCropper(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Отмена
                </button>
                <button onClick={applyCrop} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  Применить
                </button>
              </div>
            </div>
          </div>
        )}

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
              <canvas
                ref={modalCanvasRef}
                className="rounded-xl"
                style={{
                  maxWidth: "70vw",
                  maxHeight: "70vh",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                }}
              />
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

        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Дата
                </label>
                <input
                  type="text"
                  value={labelDate}
                  onChange={(e) => setLabelDate(e.target.value)}
                  placeholder="Например: 2025"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Крепость
                </label>
                <input
                  type="text"
                  value={labelStrength}
                  onChange={(e) => setLabelStrength(e.target.value)}
                  placeholder="Например: 40"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>
            </div>

            {/* Image upload */}
            {(tpl as any).zones?.some((z: any) => z.id === "image") && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Фото / иллюстрация
                </label>
                <div className="flex gap-2 items-center">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm text-left transition-all"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
                  >
                    {userImage ? "✓ Фото загружено" : "📁 Выбрать файл или Ctrl+V"}
                  </button>
                  {userImage && (
                    <button onClick={() => setUserImage(null)} className="text-sm px-3 py-2 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                      ✕
                    </button>
                  )}
                </div>
                {/* Shape selector */}
                <div className="flex gap-2 mt-2">
                  {([
                    { id: "rect",    label: "⬛ Квадрат"  },
                    { id: "rounded", label: "▢ Скруглён"  },
                    { id: "oval",    label: "⬭ Овал"      },
                    { id: "circle",  label: "⬤ Круг"      },
                  ] as const).map(s => (
                    <button key={s.id} onClick={() => setImageShape(s.id)}
                      className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                      style={{ background: imageShape === s.id ? "var(--accent)" : "var(--bg-secondary)", color: imageShape === s.id ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-body)", border: "none" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {/* Zone size slider */}
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      Размер зоны
                    </label>
                    <span className="text-xs font-medium" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                      {Math.round(imageZoneScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50} max={150} step={1}
                    value={Math.round(imageZoneScale * 100)}
                    onChange={(e) => setImageZoneScale(Number(e.target.value) / 100)}
                    className="w-full"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    <span>50%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                </div>
              </div>
            )}

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

            <div className="flex gap-3 flex-wrap">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={handleSaveLabel}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-all hover:scale-105"
                    style={{
                      background: savedLabelId ? "var(--accent)" : "var(--bg-secondary)",
                      color: savedLabelId ? "#fff" : "var(--text-secondary)",
                      border: savedLabelId ? "none" : "1px solid var(--border)",
                      fontFamily: "var(--font-body)"
                    }}
                  >
                    <Star size={20} fill={savedLabelId ? "#fff" : "none"} />
                    {isSaving ? "Сохраняю..." : savedLabelId ? "Обновить" : "В избранное"}
                  </button>
                  {savedLabelId && (
                    <button
                      onClick={() => deleteLabelMutation.mutate({ id: savedLabelId })}
                      className="px-3 py-3 rounded-xl text-sm transition-all hover:opacity-70"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                      title="Удалить из избранного"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => window.location.href = "/#/login"}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-all hover:opacity-80"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  <Star size={20} />
                  Войдите чтобы сохранить
                </button>
              )}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <Download size={22} />
                Скачать PNG
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                🖨️ На А4
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 24, minHeight: 400 }}>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Нажмите на этикетку для увеличения
            </p>
            <canvas
              ref={canvasRef}
              onClick={() => setShowPreviewModal(true)}
              className="cursor-zoom-in hover:scale-[1.02] transition-transform rounded-lg"
              style={{
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                maxWidth: "100%",
                maxHeight: 480,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* Step 3: Print layout */
  const maxQ = sz.perA4;

  // A4 preview: 210x297mm at 3px/mm = 630x891px display
  const A4_W = 630;
  const A4_H = 891;
  const PX_PER_MM = 3;
  const labelW = sz.w * PX_PER_MM;
  const labelH = sz.h * PX_PER_MM;
  const cols = Math.floor((A4_W - 20) / (labelW + 8));
  const rows = Math.floor((A4_H - 20) / (labelH + 8));
  const maxFit = cols * rows;
  const printQty = Math.min(quantity, maxFit);
  const labelScale = labelW / 1086;

  return (
    <div>
      <button
        onClick={() => setStep(2)}
        className="inline-flex items-center gap-2 text-sm mb-5 px-4 py-2 rounded-xl transition-all hover:opacity-80"
        style={{ color: "var(--accent)", fontFamily: "var(--font-body)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        ← Назад к редактированию
      </button>

      {/* Quantity selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Сколько этикеток на листе А4 (макс. {maxFit})
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxFit }, (_, i) => i + 1).map((q) => (
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

      {/* A4 sheet preview */}
      <div className="mb-5 overflow-auto">
        <div
          style={{
            width: A4_W,
            height: A4_H,
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            position: "relative",
            flexShrink: 0,
            margin: "0 auto",
          }}
        >
          {/* A4 border */}
          <div style={{ position: "absolute", inset: 0, border: "1px solid #ddd", pointerEvents: "none" }} />
          {/* Labels grid — centered on A4 */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${labelW}px)`,
            gap: 8,
          }}>
            {Array.from({ length: printQty }, (_, i) => (
              <A4LabelCanvas
                key={i}
                width={labelW}
                height={labelH}
                scale={labelScale}
                paintFn={paintCanvas}
              />
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={() => {
          // Generate A4 canvas with all labels and open print dialog
          const A4_PX_W = 2480; // A4 at 300dpi
          const A4_PX_H = 3508;
          const margin = 120;
          const gap = 40;
          const labW = Math.floor((A4_PX_W - margin * 2 - gap * (cols - 1)) / cols);
          const labH = Math.floor(labW * (1448 / 1086));
          const labScale = labW / 1086;

          const a4 = document.createElement("canvas");
          a4.width = A4_PX_W;
          a4.height = A4_PX_H;
          const ctx = a4.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, A4_PX_W, A4_PX_H);

          // Draw each label
          const totalW = labW * cols + gap * (cols - 1);
          const startX = Math.round((A4_PX_W - totalW) / 2);
          const totalH = labH * Math.ceil(printQty / cols) + gap * (Math.ceil(printQty / cols) - 1);
          const startY = Math.round((A4_PX_H - totalH) / 2);

          let drawn = 0;
          const drawNext = () => {
            if (drawn >= printQty) {
              // All drawn — open print
              const img = document.createElement("img");
              img.src = a4.toDataURL("image/png");
              img.style.cssText = "width:100%;height:auto;";
              const win = window.open("", "_blank");
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><style>
                body{margin:0;padding:0;}
                img{display:block;width:100%;height:auto;}
                @media print{@page{size:A4 portrait;margin:0;}}
              </style></head><body>`);
              win.document.write(img.outerHTML);
              win.document.write(`</body></html>`);
              win.document.close();
              setTimeout(() => win.print(), 500);
              return;
            }
            const col = drawn % cols;
            const row = Math.floor(drawn / cols);
            const x = startX + col * (labW + gap);
            const y = startY + row * (labH + gap);

            const tempCanvas = document.createElement("canvas");
            paintCanvas(tempCanvas, labScale);
            setTimeout(() => {
              ctx.drawImage(tempCanvas, x, y, labW, labH);
              drawn++;
              drawNext();
            }, 650);
          };
          drawNext();
        }}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
      >
        <Download size={22} />
        Печать {printQty} этикет{printQty === 1 ? "ки" : printQty < 5 ? "ки" : "ок"} на А4
      </button>
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
    content: null, // replaced dynamically
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
  const [editLabelData, setEditLabelData] = useState<any>(null);
  const navigate = useNavigate();

  /* Auto-select label tab when coming from recipe page or profile */
  useEffect(() => {
    const hash = window.location.hash;
    const savedEdit = sessionStorage.getItem("edit-label");
    if (savedEdit) {
      sessionStorage.removeItem("edit-label");
      try {
        const data = JSON.parse(savedEdit);
        setEditLabelData(data);
        setActiveTool("label");
      } catch {}
    } else if (hash.includes("?label") || hash.includes("label")) {
      setActiveTool("label");
      if (hash !== "#/tools") window.location.hash = "#/tools";
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
                      {tool.id === "label" ? <LabelConstructor editData={editLabelData} /> : tool.content}
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
