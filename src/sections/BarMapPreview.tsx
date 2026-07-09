import { Link } from "react-router";
import { MapPin, Wine, ArrowRight } from "lucide-react";

export default function BarMapPreview() {
  return (
    <section className="py-16 sm:py-20" style={{ background: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/barmap"
          className="group relative block rounded-3xl overflow-hidden transition-all hover:shadow-2xl"
          style={{ border: "1px solid var(--border)", height: 360 }}
        >
          {/* Декоративная стилизованная карта (не интерактивная) */}
          <svg viewBox="0 0 1000 360" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            <rect width="1000" height="360" fill="var(--bg-card)" />
            {[...Array(9)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 45 + 20} x2="1000" y2={i * 45 + 20} stroke="var(--border)" strokeWidth="1" opacity="0.5" />
            ))}
            {[...Array(18)].map((_, i) => (
              <line key={`v${i}`} x1={i * 60 + 20} y1="0" x2={i * 60 + 20} y2="360" stroke="var(--border)" strokeWidth="1" opacity="0.5" />
            ))}
            <path d="M0,110 Q250,70 500,120 T1000,90 L1000,150 Q750,190 500,150 T0,180 Z" fill="var(--surface)" opacity="0.6" />
            <path d="M0,250 Q350,210 600,270 T1000,230 L1000,300 Q650,330 350,270 T0,310 Z" fill="var(--surface)" opacity="0.4" />
          </svg>

          {/* Затемнение для читаемости текста */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, var(--bg-secondary) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.15) 100%)" }}
          />

          {/* Несколько декоративных пинов */}
          {[
            { top: "28%", left: "62%" },
            { top: "55%", left: "78%" },
            { top: "68%", left: "40%" },
            { top: "38%", left: "22%" },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute flex items-center justify-center transition-transform group-hover:-translate-y-1"
              style={{
                top: pos.top,
                left: pos.left,
                width: 34,
                height: 34,
                borderRadius: "50% 50% 50% 0",
                background: "var(--accent)",
                transform: "translate(-50%, -100%) rotate(-45deg)",
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              }}
            >
              <Wine size={18} color="#fff" style={{ transform: "rotate(45deg)" }} />
            </div>
          ))}

          {/* Текстовый блок */}
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-6 sm:px-10 max-w-md">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4 w-fit"
              style={{ background: "var(--bg-card)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <MapPin size={16} />
              Барная карта
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Где найти <span style={{ color: "var(--accent)" }}>настоящие настойки</span>
            </h2>
            <p className="text-base sm:text-lg mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              Бары и заведения с авторскими настойками в вашем городе — на интерактивной карте, с отзывами и рекомендациями сообщества.
            </p>
            <span
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all group-hover:gap-3 w-fit"
              style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Смотреть карту <ArrowRight size={18} />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
