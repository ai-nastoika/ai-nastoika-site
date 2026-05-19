import { useState } from "react";
import {
  Wand2,
  Calculator,
  Tag,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
  Download,
  Wine,
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
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const alcoholMl = volume * (initialAbv / 100);
    const totalVolume = volume + water + sugar * 0.6;
    const finalAbv = (alcoholMl / totalVolume) * 100;
    setResult(parseFloat(finalAbv.toFixed(1)));
  };

  const reset = () => {
    setVolume(1000);
    setInitialAbv(40);
    setSugar(100);
    setWater(0);
    setResult(null);
  };

  const adjust = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, step: number) => {
    setter(Math.max(0, value + step));
  };

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
          className="mt-6 rounded-xl p-6 text-center"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <div className="text-base opacity-80 mb-1" style={{ fontFamily: "var(--font-body)" }}>
            Итоговая крепость напитка
          </div>
          <div className="text-5xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {result}%
          </div>
          <div className="text-base opacity-80 mt-2" style={{ fontFamily: "var(--font-body)" }}>
            Общий объём: {Math.round(volume + water + sugar * 0.6)} мл
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: Label Constructor
   ============================================================ */
function LabelConstructor() {
  const [labelText, setLabelText] = useState("Вишнёвая настойка");
  const [subtitle, setSubtitle] = useState("Домашний рецепт · 2025");
  const [style, setStyle] = useState<"vintage" | "minimal" | "craft">("vintage");

  const styleConfig = {
    vintage: {
      border: "double 4px var(--accent)",
      bg: "linear-gradient(135deg, #f5efe6 0%, #faf6f0 100%)",
      font: "var(--font-heading)",
      subFont: "italic",
      decor: true,
    },
    minimal: {
      border: "2px solid var(--text-primary)",
      bg: "var(--bg-card)",
      font: "var(--font-body)",
      subFont: "normal",
      decor: false,
    },
    craft: {
      border: "3px dashed var(--accent)",
      bg: "repeating-linear-gradient(45deg, #faf6f0, #faf6f0 10px, #f5efe6 10px, #f5efe6 20px)",
      font: '"Courier New", monospace',
      subFont: "normal",
      decor: true,
    },
  };

  const s = styleConfig[style];

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              Стиль этикетки
            </label>
            <div className="flex gap-2">
              {(["vintage", "minimal", "craft"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStyle(st)}
                  className="flex-1 rounded-lg py-2 text-base font-medium transition-all capitalize"
                  style={{
                    background: style === st ? "var(--accent)" : "var(--surface)",
                    color: style === st ? "#fff" : "var(--text-secondary)",
                    border: style === st ? "none" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {st === "vintage" ? "Винтаж" : st === "minimal" ? "Минимал" : "Крафт"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              Название
            </label>
            <input
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              Подпись
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
            style={{
              background: "var(--accent)",
              color: "#fff",
              fontFamily: "var(--font-body)",
            }}
          >
            <Download size={28} />
            Скачать этикетку
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center">
          <div
            className="w-full max-w-[240px] aspect-[3/4] rounded-lg flex flex-col items-center justify-center p-6 text-center transition-all"
            style={{
              background: s.bg,
              border: s.border,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            {s.decor && (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ border: "2px solid var(--accent)", color: "var(--accent)" }}
              >
                <Wine size={28} />
              </div>
            )}
            <div
              className="text-lg font-bold leading-tight"
              style={{ color: "var(--text-primary)", fontFamily: s.font }}
            >
              {labelText}
            </div>
            {s.decor && <div className="w-16 h-px my-3" style={{ background: "var(--accent)" }} />}
            <div
              className="text-base"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-body)",
                fontStyle: s.subFont as React.CSSProperties["fontStyle"],
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>
      </div>
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
    title: "Этикетки своими руками",
    desc: "Создайте авторскую этикетку для своей настойки: выберите стиль, добавьте название и состав.",
    badge: null,
    color: "var(--accent)",
    content: <LabelConstructor />,
  },
];

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState("taste");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Sparkles size={22} />
            Все инструменты в одном месте
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold mb-3"
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
