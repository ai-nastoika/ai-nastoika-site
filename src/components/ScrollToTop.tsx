import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const [visible, setVisible] = useState(false);

  // Скролл наверх при смене маршрута
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  // Показывать кнопку при прокрутке
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
      style={{
        background: "var(--accent)",
        color: "#fff",
        border: "2px solid rgba(255,255,255,0.2)",
      }}
      title="Наверх"
    >
      <ArrowUp size={20} />
    </button>
  );
}
