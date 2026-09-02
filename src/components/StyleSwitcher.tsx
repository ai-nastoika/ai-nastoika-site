import { Palette, Type, Check, X, ZoomIn } from "lucide-react";
import { useState, useEffect } from "react";

const palettes = [
  {
    id: "warm-amber",
    name: "Тёплая янтарная",
    desc: "Крафт, уют, традиция",
    colors: ["#faf6f0", "#b87333", "#2c1810"],
  },
  {
    id: "dark-premium",
    name: "Тёмная премиум",
    desc: "Бар, роскошь, золото",
    colors: ["#30271c", "#e6bd52", "#f9f4ec"],
  },
  {
    id: "herbal",
    name: "Травяная свежесть",
    desc: "Природа, органика, травы",
    colors: ["#f4f7f2", "#5a7d4a", "#1a2e1a"],
  },
  {
    id: "modern",
    name: "Современная минимал",
    desc: "Чистота, контраст, яркость",
    colors: ["#fafafa", "#c41e3a", "#111111"],
  },
];

const fonts = [
  { id: "classic", name: "Классическая", heading: '"Playfair Display", Georgia', body: '"Inter", sans-serif', desc: "Изящный серифный акцент, чистый текст" },
  { id: "modern", name: "Современная", heading: '"Manrope", sans-serif', body: '"Manrope", sans-serif', desc: "Один геометричный гротеск везде — заголовки и текст" },
  { id: "craft", name: "Крафтовая", heading: '"Bitter", Georgia', body: '"Source Sans 3", sans-serif', desc: "Тёплый слэб-сериф — хенд-мейд характер" },
];

const scales = [
  { id: "0.9", label: "Компактный", desc: "Больше контента на экране", sample: "90%" },
  { id: "1", label: "Стандартный", desc: "Оптимально для большинства", sample: "100%" },
  { id: "1.125", label: "Крупный", desc: "Удобнее чтение", sample: "112%" },
  { id: "1.25", label: "Очень крупный", desc: "Максимальная доступность", sample: "125%" },
];

interface StyleSwitcherProps {
  activePalette: string;
  activeFont: string;
  activeScale: string;
  onPaletteChange: (p: string) => void;
  onFontChange: (f: string) => void;
  onScaleChange: (s: string) => void;
}

export default function StyleSwitcher({
  activePalette,
  activeFont,
  activeScale,
  onPaletteChange,
  onFontChange,
  onScaleChange,
}: StyleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"palette" | "font" | "scale">("palette");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("style-switcher-seen")) {
      const timer = setTimeout(() => setShowHint(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismissHint() {
    localStorage.setItem("style-switcher-seen", "1");
    setShowHint(false);
  }

  function openPanel() {
    dismissHint();
    setIsOpen(true);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <div className="relative">
          {showHint && (
            <div
              className="absolute bottom-full right-0 mb-3 w-56 rounded-xl p-3 shadow-xl text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}
            >
              <button
                onClick={dismissHint}
                className="absolute top-1.5 right-1.5 p-1 rounded-full transition-opacity hover:opacity-60"
                style={{ color: "var(--text-muted)" }}
                aria-label="Закрыть"
              >
                <X size={14} />
              </button>
              <span className="font-medium">Знали, что можно настроить сайт под себя?</span> Цвет, шрифт и размер текста — нажмите «Стиль».
            </div>
          )}
          <button
            onClick={openPanel}
            className="flex items-center gap-2 rounded-full px-5 py-3 font-medium shadow-xl transition-transform hover:scale-105"
            style={{
              background: "var(--accent)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              boxShadow: showHint ? "0 0 0 6px rgba(184, 115, 51, 0.25)" : undefined,
              animation: showHint ? "style-switcher-pulse 1.8s ease-in-out infinite" : undefined,
            }}
          >
            <Palette size={22} />
            <span>Стиль</span>
          </button>
          {showHint && (
            <style>{`
              @keyframes style-switcher-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(184, 115, 51, 0.4); }
                50% { box-shadow: 0 0 0 10px rgba(184, 115, 51, 0); }
              }
            `}</style>
          )}
        </div>
      ) : (
        <div
          className="w-80 rounded-2xl shadow-2xl overflow-hidden theme-transition"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            >
              Настройка стиля
            </span>
            <button onClick={() => setIsOpen(false)} style={{ color: "var(--text-muted)" }}>
              <X size={22} />
            </button>
          </div>

          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            <button
              onClick={() => setTab("palette")}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-base transition-colors"
              style={{
                borderBottom: tab === "palette" ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === "palette" ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Palette size={28} />
              Цвет
            </button>
            <button
              onClick={() => setTab("font")}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-base transition-colors"
              style={{
                borderBottom: tab === "font" ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === "font" ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Type size={28} />
              Шрифт
            </button>
            <button
              onClick={() => setTab("scale")}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-base transition-colors"
              style={{
                borderBottom: tab === "scale" ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === "scale" ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              <ZoomIn size={28} />
              Масштаб
            </button>
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">
            {tab === "palette" ? (
              <div className="space-y-3">
                {palettes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPaletteChange(p.id)}
                    className="w-full flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-[1.02]"
                    style={{
                      background: activePalette === p.id ? "var(--surface-hover)" : "transparent",
                      border: activePalette === p.id ? "2px solid var(--accent)" : "2px solid var(--border)",
                    }}
                  >
                    <div className="flex rounded-lg overflow-hidden shadow-sm" style={{ width: 48, height: 48, flexShrink: 0 }}>
                      <div style={{ background: p.colors[0], flex: 1 }} />
                      <div style={{ background: p.colors[1], flex: 1 }} />
                      <div style={{ background: p.colors[2], flex: 1 }} />
                    </div>
                    <div className="text-left">
                      <div
                        className="text-base font-medium"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                      >
                        {p.name}
                      </div>
                      <div
                        className="text-base mt-0.5"
                        style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                      >
                        {p.desc}
                      </div>
                    </div>
                    {activePalette === p.id && (
                      <Check size={22} style={{ color: "var(--accent)", marginLeft: "auto" }} />
                    )}
                  </button>
                ))}
              </div>
            ) : tab === "font" ? (
              <div className="space-y-3">
                {fonts.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onFontChange(f.id)}
                    className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.02]"
                    style={{
                      background: activeFont === f.id ? "var(--surface-hover)" : "transparent",
                      border: activeFont === f.id ? "2px solid var(--accent)" : "2px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className="text-base font-medium"
                          style={{ color: "var(--text-primary)", fontFamily: f.heading }}
                        >
                          {f.name}
                        </div>
                        <div
                          className="text-lg font-bold mt-0.5"
                          style={{ color: "var(--accent)", fontFamily: f.heading }}
                        >
                          0123456789
                        </div>
                        <div
                          className="text-base mt-0.5"
                          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                        >
                          {f.desc}
                        </div>
                      </div>
                      {activeFont === f.id && (
                        <Check size={22} style={{ color: "var(--accent)" }} />
                      )}
                    </div>
                    <div
                      className="mt-2 text-base p-2 rounded-lg"
                      style={{ background: "var(--surface)", color: "var(--text-secondary)", fontFamily: f.body }}
                    >
                      Аа Бб Вв Гг — {f.name.toLowerCase()} типографика
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {scales.map((s) => {
                  const isActive = activeScale === s.id;
                  const scaleNum = parseFloat(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onScaleChange(s.id)}
                      className="w-full text-left rounded-xl p-3 transition-all hover:scale-[1.02]"
                      style={{
                        background: isActive ? "var(--surface-hover)" : "transparent",
                        border: isActive ? "2px solid var(--accent)" : "2px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Preview box with scaled text */}
                          <div
                            className="flex items-center justify-center rounded-lg font-medium"
                            style={{
                              width: 48,
                              height: 48,
                              flexShrink: 0,
                              background: isActive ? "var(--accent)" : "var(--surface)",
                              color: isActive ? "#fff" : "var(--text-primary)",
                              fontSize: `${1 * scaleNum}rem`,
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            Аа
                          </div>
                          <div>
                            <div
                              className="font-medium"
                              style={{
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-body)",
                                fontSize: `${1 * scaleNum}rem`,
                              }}
                            >
                              {s.label}
                            </div>
                            <div
                              className="mt-0.5"
                              style={{
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-body)",
                                fontSize: `${0.875 * scaleNum}rem`,
                              }}
                            >
                              {s.desc}
                            </div>
                          </div>
                        </div>
                        {isActive && <Check size={22} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
