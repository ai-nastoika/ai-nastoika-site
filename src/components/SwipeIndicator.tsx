import { ArrowLeft } from "lucide-react";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function SwipeIndicator() {
  const { progress, isSwiping } = useSwipeBack(true);

  // Don't render on desktop (no touch)
  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  if (!isTouchDevice) return null;

  return (
    <>
      {/* Subtle edge shadow — thin and soft */}
      <div
        className="fixed top-0 bottom-0 left-0 z-[60] pointer-events-none"
        style={{
          width: `${progress * 36 + 2}px`,
          opacity: isSwiping ? 0.25 + progress * 0.35 : 0,
          background: `linear-gradient(to right, rgba(0,0,0,0.1), transparent)`,
          transition: "opacity 0.06s ease-out",
        }}
      />

      {/* Small arrow following finger */}
      <div
        className="fixed top-1/2 z-[61] pointer-events-none"
        style={{
          left: `${progress * 56 + 4}px`,
          transform: `translateY(-50%) scale(${0.4 + progress * 0.6})`,
          opacity: isSwiping ? 0.7 + progress * 0.3 : 0,
          transition: "opacity 0.06s ease-out, transform 0.04s linear",
        }}
      >
        <div
          className="flex items-center justify-center rounded-full w-9 h-9"
          style={{
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <ArrowLeft size={18} style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </>
  );
}
