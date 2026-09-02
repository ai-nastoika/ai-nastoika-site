import { Link } from "react-router";
import { Tag, ArrowRight } from "lucide-react";

export default function LabelPreview() {
  return (
    <section className="py-16 sm:py-20" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* ── Картинка ── */}
          <div
            className="relative rounded-3xl overflow-hidden order-2 lg:order-1 shadow-xl"
            style={{ border: "1px solid var(--border)", height: 340 }}
          >
            <img
              src="/label-preview.jpg"
              alt="Этикетка, сгенерированная ИИ"
              className="w-full h-full object-cover"
            />
          </div>

          {/* ── Текст ── */}
          <div className="order-1 lg:order-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <Tag size={16} />
              Этикетка
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Своя этикетка за <span style={{ color: "var(--accent)" }}>пару минут</span>
            </h2>
            <p className="text-base sm:text-lg mb-7" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              Опишите стиль словами — от классики до киберпанка — и впишите текст: название, подпись,
              крепость, дату. ИИ нарисует готовую картинку прямо с вашими надписями — останется скачать
              и распечатать самому или отправить файл в типографию.
            </p>
            <Link
              to="/label"
              className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105"
              style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              Создать этикетку
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
