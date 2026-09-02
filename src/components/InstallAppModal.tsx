import { useState, type ReactNode } from "react";
import { X, Apple, Play, Share, PlusSquare, MoreVertical, Info } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Приложений в App Store / Google Play пока нет — значки в футере (см.
   Footer.tsx) имитируют магазинные бейджи, но ведут не на реальный листинг,
   а сюда: подробная инструкция по установке ярлыка сайта на экран "Домой".
   На деле это то же самое, что AddToHomeScreenPrompt.tsx (всплывающая
   подсказка при первом заходе) — просто развёрнутая версия по запросу,
   доступная в любой момент через футер, а не только один раз при заходе.
   ───────────────────────────────────────────────────────────────────────── */
export default function InstallAppModal({ open, onClose, initialPlatform }: { open: boolean; onClose: () => void; initialPlatform: "ios" | "android" }) {
  const [platform, setPlatform] = useState<"ios" | "android">(initialPlatform);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192x192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
            <div>
              <div className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Ай, настойка!
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Установка на телефон
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full shrink-0 transition-opacity hover:opacity-60"
            style={{ color: "var(--text-muted)" }}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* Честно предупреждаем, что это не листинг в сторе — иначе имитация
              бейджей была бы вводящей в заблуждение, а не просто заглушкой. */}
          <div
            className="flex items-start gap-2.5 rounded-xl p-3 mb-4 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}
          >
            <Info size={16} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
            <span>
              Приложения для App Store и Google Play сейчас в разработке. Пока вместо них — ярлык сайта
              на экране «Домой»: открывается на весь экран, без адресной строки браузера, и выглядит
              как обычное приложение.
            </span>
          </div>

          {/* Переключатель платформы — не завязан на определение устройства,
              потому что с футера открыть может кто угодно, хоть с десктопа. */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPlatform("ios")}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: platform === "ios" ? "var(--accent)" : "var(--surface)",
                color: platform === "ios" ? "#fff" : "var(--text-secondary)",
                border: platform === "ios" ? "none" : "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Apple size={16} /> iPhone
            </button>
            <button
              onClick={() => setPlatform("android")}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: platform === "android" ? "var(--accent)" : "var(--surface)",
                color: platform === "android" ? "#fff" : "var(--text-secondary)",
                border: platform === "android" ? "none" : "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Play size={16} /> Android
            </button>
          </div>

          {platform === "ios" ? (
            <ol className="space-y-3">
              <Step n={1} text={<>Откройте <b>ai-nastoika.ru</b> в браузере Safari — на iPhone это работает только в нём, не в Chrome и не в других браузерах.</>} />
              <Step n={2} text={<>Нажмите значок «Поделиться» <Share size={14} className="inline mx-0.5 mb-0.5" /> внизу экрана.</>} />
              <Step n={3} text={<>Прокрутите список действий вниз и выберите <PlusSquare size={14} className="inline mx-0.5 mb-0.5" /> «На экран «Домой»».</>} />
              <Step n={4} text={<>Нажмите «Добавить» в правом верхнем углу — готово.</>} />
            </ol>
          ) : (
            <ol className="space-y-3">
              <Step n={1} text={<>Откройте <b>ai-nastoika.ru</b> в браузере Chrome.</>} />
              <Step n={2} text={<>Нажмите на меню <MoreVertical size={14} className="inline mx-0.5 mb-0.5" /> (три точки) в правом верхнем углу.</>} />
              <Step n={3} text={<>Выберите «Добавить на главный экран» или «Установить приложение» — формулировка зависит от версии Chrome и устройства.</>} />
              <Step n={4} text={<>Подтвердите — готово. На некоторых устройствах Chrome предлагает это сам всплывающей плашкой снизу экрана.</>} />
            </ol>
          )}

          <p className="text-sm mt-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
            Значок можно в любой момент удалить как обычный ярлык — это не займёт лишнего места, ничего
            не устанавливается «по-настоящему» в системе.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)" }}
      >
        {n}
      </span>
      <span className="text-sm pt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
        {text}
      </span>
    </li>
  );
}
