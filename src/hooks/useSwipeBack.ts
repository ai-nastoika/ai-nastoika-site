import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";

const SWIPE_THRESHOLD = 100; // px to trigger back
const EDGE_ZONE = 36; // px from left edge
const VELOCITY_THRESHOLD = 0.4; // px/ms

export function useSwipeBack(enabled = true) {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isSwiping, setIsSwiping] = useState(false);
  const touchRef = useRef<{ startX: number; startY: number; startTime: number; currentX: number } | null>(null);

  // CRITICAL FIX: Reset whenever route changes so indicators never "stick" between pages
  useEffect(() => {
    setProgress(0);
    setIsSwiping(false);
    touchRef.current = null;
  }, [location.pathname, location.search]);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      // Only start if touching near left edge
      if (t.clientX > EDGE_ZONE) return;

      touchRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
        currentX: t.clientX,
      };
      setIsSwiping(true);
      setProgress(0);
    },
    [enabled]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchRef.current || !enabled) return;
      const t = e.touches[0];
      touchRef.current.currentX = t.clientX;

      const dx = t.clientX - touchRef.current.startX;
      const dy = t.clientY - touchRef.current.startY;

      // If scrolling vertically more than horizontally, cancel
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 20) {
        touchRef.current = null;
        setIsSwiping(false);
        setProgress(0);
        return;
      }

      // Only rightward swipes
      if (dx > 0) {
        const p = Math.min(dx / SWIPE_THRESHOLD, 1);
        setProgress(p);
      }
    },
    [enabled]
  );

  const onTouchEnd = useCallback(() => {
    if (!touchRef.current) {
      setIsSwiping(false);
      setProgress(0);
      return;
    }

    const dx = touchRef.current.currentX - touchRef.current.startX;
    const dt = Date.now() - touchRef.current.startTime;
    const velocity = dx / dt;

    touchRef.current = null;

    // Trigger if crossed threshold OR fast flick
    if (dx >= SWIPE_THRESHOLD || (velocity > VELOCITY_THRESHOLD && dx > 50)) {
      // Reset state immediately for seamless feel, then navigate
      setProgress(0);
      setIsSwiping(false);
      navigate(-1);
    } else {
      // Snap back
      setProgress(0);
      setIsSwiping(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Only on touch devices
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice || !enabled) return;

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, enabled]);

  return { progress, isSwiping };
}
