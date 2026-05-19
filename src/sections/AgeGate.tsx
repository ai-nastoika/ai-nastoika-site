import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const confirmed = localStorage.getItem("age-confirmed");
    if (!confirmed) setShow(true);
  }, []);

  const confirm = (ok: boolean) => {
    if (ok) {
      localStorage.setItem("age-confirmed", "true");
      setShow(false);
    } else {
      window.location.href = "https://www.google.com";
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center theme-transition"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <AlertTriangle size={48} style={{ color: "var(--accent)" }} className="mx-auto mb-4" />
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
        >
          Вам уже есть 18 лет?
        </h2>
        <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Этот сайт посвящён приготовлению домашних алкогольных напитков.
          <br />
          Вход разрешён только лицам, достигшим 18 лет.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => confirm(true)}
            className="flex-1 rounded-xl py-3 font-medium text-white transition-transform hover:scale-105"
            style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            Мне есть 18 лет — войти
          </button>
          <button
            onClick={() => confirm(false)}
            className="flex-1 rounded-xl py-3 font-medium transition-transform hover:scale-105"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-body)",
            }}
          >
            Мне нет 18 лет
          </button>
        </div>
        <p className="text-base mt-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Чрезмерное употребление алкоголя вредит вашему здоровью.
        </p>
      </div>
    </div>
  );
}
