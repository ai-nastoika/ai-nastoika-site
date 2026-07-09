import { Link } from "react-router";
import { MapPin, ArrowRight } from "lucide-react";

/* Единая иконка-стопка — линейная (stroke), используется и здесь, и на самой карте (BarMap.tsx) */
function GlassIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8" />
      <path d="M8 3c0 4 .5 6 1.5 7a2.7 2.7 0 0 0 5 0c1-1 1.5-3 1.5-7" />
      <path d="M12 14v6" />
      <path d="M9 20h6" />
    </svg>
  );
}

export default function BarMapPreview() {
  const pins = [
    { top: "22%", left: "58%" },
    { top: "48%", left: "78%" },
    { top: "65%", left: "35%" },
    { top: "32%", left: "18%" },
  ];

  return (
    <section className="py-16 sm:py-20" style={{ background: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* ── Текст ── */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4"
              style={{ background: "var(--bg-card)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <MapPin size={16} />
              Барная карта
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Где найти <span style={{ color: "var(--accent)" }}>настоящие настойки</span>
            </h2>
            <p className="text-base sm:text-lg mb-7" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              Бары и заведения с авторскими настойками в вашем городе — на интерактивной карте, с отзывами и рекомендациями сообщества.
            </p>
            <Link
              to="/barmap"
              className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105"
              style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Смотреть карту
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* ── Карта (отдельный выраженный блок) ── */}
          <Link
            to="/barmap"
            className="group relative block rounded-3xl overflow-hidden transition-all hover:shadow-2xl"
            style={{ border: "2px solid var(--border)", height: 340, background: "var(--bg-card)" }}
          >
            <svg viewBox="0 0 600 340" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
              <rect width="600" height="340" fill="var(--bg-card)" />

              {/* мягкая подложка-акцент для глубины */}
              <circle cx="470" cy="60" r="180" fill="var(--accent-light)" opacity="0.18" />
              <circle cx="90" cy="300" r="160" fill="var(--accent-light)" opacity="0.14" />

              {/* сетка улиц — контрастнее, чем раньше */}
              {[...Array(8)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 42 + 18} x2="600" y2={i * 42 + 18} stroke="var(--border)" strokeWidth="1.5" opacity="0.7" />
              ))}
              {[...Array(11)].map((_, i) => (
                <line key={`v${i}`} x1={i * 55 + 20} y1="0" x2={i * 55 + 20} y2="340" stroke="var(--border)" strokeWidth="1.5" opacity="0.7" />
              ))}

              {/* стилизованная река */}
              <path
                d="M0,120 C120,90 180,150 260,130 C360,105 400,170 480,150 C520,140 560,110 600,100 L600,160 C560,175 520,200 480,210 C400,230 360,165 260,190 C180,210 120,150 0,180 Z"
                fill="var(--accent-light)"
                opacity="0.35"
              />

              <text x="30" y="45" fill="var(--text-muted)" fontSize="13" fontFamily="var(--font-body)" opacity="0.6" fontWeight="600">
                Москва
              </text>
            </svg>

            {/* лёгкое затемнение справа для контраста пинов */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.08) 100%)" }} />

            {/* Пины со стопочкой — та же иконка, что и на полной карте */}
            {pins.map((pos, i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center transition-transform group-hover:-translate-y-1.5"
                style={{
                  top: pos.top,
                  left: pos.left,
                  width: 38,
                  height: 38,
                  borderRadius: "50% 50% 50% 0",
                  background: "var(--accent)",
                  transform: "translate(-50%, -100%) rotate(-45deg)",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
                  border: "2.5px solid #fff",
                }}
              >
                <div style={{ transform: "rotate(45deg)" }}>
                  <GlassIcon color="#fff" size={16} />
                </div>
              </div>
            ))}

            {/* Подпись поверх карты */}
            <div
              className="absolute bottom-4 left-4 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
              style={{ background: "var(--bg-card)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <MapPin size={14} /> Открыть барную карту
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
