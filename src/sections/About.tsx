import { Link } from "react-router";
import { Info, ChevronRight } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-20" style={{ background: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div
              className="rounded-2xl overflow-hidden shadow-xl"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src="/recipe-label.jpg"
                alt="Этикетка ручной работы"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <Info size={22} />
              О проекте
            </div>

            <h2
              className="text-3xl sm:text-4xl font-bold mb-6"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Для тех, кто делает настойки — и для тех, кто только собирается
            </h2>

            <div className="space-y-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
              <p>
                «Ай, настойка» вырос из простой идеи: собрать в одном месте всё, что нужно настоящему энтузиасту. Рецепты — от проверенной классики до смелых экспериментов.
              </p>
              <p>
                Обсуждения, отзывы и рейтинги — живые, от таких же людей. Рейтинги мест с авторскими настойками в крупных городах — чтобы знать, куда пойти и что попробовать.
              </p>
              <p>
                ИИ здесь — <strong style={{ color: "var(--text-primary)" }}>инструмент, а не суть</strong>. Калькулятор вкуса поможет разобраться с новым сочетанием ингредиентов, расчёт крепости учтёт всё, что забывает ареометр.
              </p>
            </div>

            <Link
              to="/tools"
              className="inline-flex items-center gap-2 mt-8 text-base font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Узнать больше об инструментах
              <ChevronRight size={28} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
