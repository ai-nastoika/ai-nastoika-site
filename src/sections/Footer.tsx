import { Heart } from "lucide-react";
import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="py-12 print:hidden" style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div
              className="text-lg font-bold mb-1"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Ай, настойка
            </div>
            <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              ai-nastoika.ru
            </div>
          </div>

          <div className="flex items-center gap-6 text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            <Link to="/rules" className="transition-opacity hover:opacity-70">Правила</Link>
            <Link to="/feedback" className="transition-opacity hover:opacity-70">Обратная связь</Link>
            <Link to="/barmap" className="transition-opacity hover:opacity-70">Барная карта</Link>
          </div>
        </div>

        <div
          className="mt-8 pt-6 text-center text-base flex flex-col sm:flex-row items-center justify-center gap-2"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", borderTop: "1px solid var(--border)" }}
        >
          <span className="flex items-center gap-1">
            Сделано с <Heart size={28} style={{ color: "var(--accent)" }} /> для любителей настоек
          </span>
          <span className="hidden sm:inline">·</span>
          <span>© 2025 Ай, настойка</span>
        </div>

        <div
          className="mt-3 text-center text-base"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", opacity: 0.6 }}
        >
          Чрезмерное употребление алкоголя вредит вашему здоровью. Сайт предназначен для лиц, достигших 18 лет.
        </div>
      </div>
    </footer>
  );
}
