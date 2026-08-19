/* Система оценок "рюмками" — вместо звёзд/баллов. Три цвета: зелёная (отлично),
   жёлтая (нормально), красная (плохо). Ставится только вместе с отзывом —
   см. CommentSection.tsx, отдельного места поставить оценку без текста нет. */

export type RatingTier = "green" | "yellow" | "red";

export const RATING_COLORS: Record<RatingTier, string> = {
  green: "#16a34a",
  yellow: "#e8a640",
  red: "#dc2626",
};

export const RATING_LABELS: Record<RatingTier, string> = {
  green: "Отлично",
  yellow: "Нормально",
  red: "Плохо",
};

/* ── Одна иконка рюмки, SVG, заливка цветом или серым (не выбрано) ── */
export function ShotGlassIcon({ tier, size = 20, muted = false }: { tier: RatingTier; size?: number; muted?: boolean }) {
  const color = muted ? "var(--border)" : RATING_COLORS[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h12l-2 16H8L6 4z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
      <line x1="6" y1="4" x2="18" y2="4" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Выбор оценки при написании отзыва — три рюмки, кликабельные ── */
export function ShotGlassPicker({
  value,
  onChange,
}: {
  value: RatingTier | null;
  onChange: (tier: RatingTier) => void;
}) {
  const tiers: RatingTier[] = ["red", "yellow", "green"];
  return (
    <div className="flex items-center gap-2">
      {tiers.map((tier) => (
        <button
          key={tier}
          type="button"
          onClick={() => onChange(tier)}
          title={RATING_LABELS[tier]}
          className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all"
          style={{
            background: value === tier ? "var(--surface)" : "transparent",
            border: "1px solid " + (value === tier ? RATING_COLORS[tier] : "transparent"),
            opacity: value && value !== tier ? 0.5 : 1,
          }}
        >
          <ShotGlassIcon tier={tier} size={26} />
          <span className="text-xs" style={{ color: value === tier ? RATING_COLORS[tier] : "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            {RATING_LABELS[tier]}
          </span>
        </button>
      ))}
    </div>
  );
}

export type RatingSummary = { green: number; yellow: number; red: number };

function dominantTier(summary: RatingSummary): RatingTier | null {
  const total = summary.green + summary.yellow + summary.red;
  if (total === 0) return null;
  if (summary.green >= summary.yellow && summary.green >= summary.red) return "green";
  if (summary.red >= summary.yellow) return "red";
  return "yellow";
}

/* ── Компактный вид для карточек — одна рюмка доминирующего цвета + счётчик ── */
export function ShotGlassCompact({ summary }: { summary: RatingSummary }) {
  const total = summary.green + summary.yellow + summary.red;
  const dominant = dominantTier(summary);

  if (!dominant) {
    return (
      <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        <ShotGlassIcon tier="green" size={18} muted />
        Нет отзывов
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <ShotGlassIcon tier={dominant} size={20} />
      <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
        {total}
      </span>
    </span>
  );
}

/* ── Развёрнутый вид для детальной страницы — три рюмки с числами под каждой ── */
export function ShotGlassDetailed({ summary }: { summary: RatingSummary }) {
  const total = summary.green + summary.yellow + summary.red;
  const tiers: RatingTier[] = ["green", "yellow", "red"];

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        <ShotGlassIcon tier="green" size={22} muted />
        Пока нет отзывов с оценкой — будьте первым
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {tiers.map((tier) => (
        <div key={tier} className="flex flex-col items-center gap-1">
          <ShotGlassIcon tier={tier} size={26} muted={summary[tier] === 0} />
          <span className="text-sm font-semibold" style={{ color: summary[tier] > 0 ? "var(--text-primary)" : "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            {summary[tier]}
          </span>
        </div>
      ))}
      <span className="text-sm ml-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {total} {total === 1 ? "отзыв" : total < 5 ? "отзыва" : "отзывов"}
      </span>
    </div>
  );
}
