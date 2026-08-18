/* Индикатор "ИИ думает" — три фирменные бутылочки подпрыгивают по очереди,
   как точки в мессенджерах, только брендированные. Используется во всех
   местах с ИИ-диалогом: TasteCalculator, RecipeAiConsult, InfusionTracker. */
export default function BottleThinkingIndicator({ label = "Думаю над ответом..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-end gap-1" style={{ height: 28 }}>
        <img src="/bottle-red.png" alt="" className="bottle-bounce" style={{ width: 18, animationDelay: "0ms" }} />
        <img src="/bottle-orange.png" alt="" className="bottle-bounce" style={{ width: 14, animationDelay: "150ms" }} />
        <img src="/bottle-green.png" alt="" className="bottle-bounce" style={{ width: 17, animationDelay: "300ms" }} />
      </div>
      <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {label}
      </span>
      <style>{`
        @keyframes bottle-bounce-kf {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        .bottle-bounce {
          display: block;
          animation: bottle-bounce-kf 1.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
