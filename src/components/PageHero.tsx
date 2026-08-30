import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

/* ─────────────────────────────────────────────────────────────────────────
   Единая шапка для всех страниц-разделов сайта — раньше у каждой страницы
   была своя версия: где-то заголовок слева, где-то по центру, разные
   размеры шрифта, разный стиль кнопки "назад" (или её отсутствие). Теперь
   один источник правды — меняем стиль здесь, а не в 10 местах.
   ───────────────────────────────────────────────────────────────────────── */
export default function PageHero({
  icon: Icon,
  badgeText,
  title,
  subtitle,
  maxWidth = "max-w-7xl",
  backTo,
  backLabel = "Назад",
}: {
  icon: typeof ArrowLeft;
  badgeText: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Ширина внутреннего контейнера — уже для текстовых/юридических страниц. */
  maxWidth?: string;
  /** Явный путь вместо перехода "назад по истории" — например, для страниц,
      на которые могут попасть напрямую (из письма, поиска), где браузерного
      "назад" в истории может не быть вовсе. */
  backTo?: string;
  backLabel?: string;
}) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 relative`}>
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={18} /> {backLabel}
        </button>
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
          style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
        >
          <Icon size={22} />
          {badgeText}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg max-w-xl" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
