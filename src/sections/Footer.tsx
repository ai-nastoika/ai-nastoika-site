import { useState } from "react";
import { Heart, Apple, Play } from "lucide-react";
import { Link } from "react-router";
import InstallAppModal from "@/components/InstallAppModal";

export default function Footer() {
  const [installModal, setInstallModal] = useState<"ios" | "android" | null>(null);

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
            <Link to="/privacy" className="transition-opacity hover:opacity-70">Конфиденциальность</Link>
            <Link to="/offer" className="transition-opacity hover:opacity-70">Оферта</Link>
            <Link to="/feedback" className="transition-opacity hover:opacity-70">Обратная связь</Link>
            <Link to="/barmap" className="transition-opacity hover:opacity-70">Барная карта</Link>
          </div>
        </div>

        {/* ── Значки сторов — приложений ещё нет, ведут на инструкцию по установке
            ярлыка на экран "Домой" (см. InstallAppModal.tsx). Не настоящий листинг. ── */}
        <div className="mt-8 flex items-center justify-center md:justify-start gap-3">
          <button
            onClick={() => setInstallModal("ios")}
            className="flex items-center gap-2 rounded-xl px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: "#000" }}
            aria-label="Установить на iPhone"
          >
            <Apple size={22} style={{ color: "#fff" }} />
            <span className="text-left leading-none">
              <span className="block text-[10px]" style={{ color: "#d4d4d4", fontFamily: "var(--font-body)" }}>Загрузите в</span>
              <span className="block text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--font-body)" }}>App Store</span>
            </span>
          </button>
          <button
            onClick={() => setInstallModal("android")}
            className="flex items-center gap-2 rounded-xl px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: "#000" }}
            aria-label="Установить на Android"
          >
            <Play size={20} style={{ color: "#fff" }} />
            <span className="text-left leading-none">
              <span className="block text-[10px]" style={{ color: "#d4d4d4", fontFamily: "var(--font-body)" }}>Доступно в</span>
              <span className="block text-sm font-semibold" style={{ color: "#fff", fontFamily: "var(--font-body)" }}>Google Play</span>
            </span>
          </button>
        </div>

        <div
          className="mt-8 pt-6 text-center text-base flex flex-col sm:flex-row items-center justify-center gap-2"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", borderTop: "1px solid var(--border)" }}
        >
          <span className="flex items-center gap-1">
            Сделано с <Heart size={28} style={{ color: "var(--accent)" }} /> для любителей настоек
          </span>
          <span className="hidden sm:inline">·</span>
          <span>© {new Date().getFullYear()} Ай, настойка</span>
        </div>

        <div
          className="mt-3 text-center text-base"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", opacity: 0.6 }}
        >
          Чрезмерное употребление алкоголя вредит вашему здоровью. Сайт предназначен для лиц, достигших 18 лет.
        </div>
      </div>

      <InstallAppModal
        open={installModal !== null}
        onClose={() => setInstallModal(null)}
        initialPlatform={installModal ?? "ios"}
      />
    </footer>
  );
}
