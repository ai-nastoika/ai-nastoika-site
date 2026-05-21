import { Link } from "react-router";
import { ArrowRight, Sparkles, FlaskConical } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Decorative shapes */}
      <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-10" style={{ background: "var(--accent-light)" }} />
      <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full opacity-10" style={{ background: "var(--accent)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-6"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <Sparkles size={22} />
              Сообщество любителей настоек
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Место, где{" "}
              <span style={{ color: "var(--accent)" }}>настойка</span> — это
              <br />
              серьёзно и с удовольствием
            </h1>

            <p
              className="text-lg mb-8 max-w-lg"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
            >
              Для тех, кто любит настойки — не только попробовать, но и сделать своими руками.
              Рецепты, живые обсуждения, ИИ-инструменты и этикетки ручной работы.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/recipes"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-transform hover:scale-105"
                style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                Подобрать рецепт
                <ArrowRight size={22} />
              </Link>
              <Link
                to="/recipes"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-transform hover:scale-105"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Смотреть рецепты
              </Link>
            </div>
          </div>

          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src="/recipe-cherry.jpg"
                alt="Вишнёвая настойка"
                className="w-full h-auto object-cover"
              />
            </div>
            <div
              className="absolute -bottom-4 -left-4 rounded-xl p-4 shadow-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--surface)" }}
                >
                  <FlaskConical size={28} style={{ color: "var(--accent)" }} />
                </div>
                <div>
                  <div className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    300+ рецептов
                  </div>
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    с описаниями и советами
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
