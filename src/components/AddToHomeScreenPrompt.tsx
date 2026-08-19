import { useState, useEffect } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";

const DISMISS_KEY = "ai-nastoika-a2hs-dismissed-at";
const SNOOZE_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isRecentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  // Уже установлено/запущено как приложение — баннер не нужен
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function AddToHomeScreenPrompt() {
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || isRecentlyDismissed()) return;

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isAndroid = /android/i.test(ua);

    if (isIos) {
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform("android");
      // На Android ждём системное событие — без него кнопка "Установить" не сработает
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  // На Android показываем баннер только когда реально есть системное предложение —
  // иначе кнопка "Установить" будет нажиматься в пустоту
  if (dismissed || !platform || (platform === "android" && !deferredPrompt)) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 rounded-2xl p-4 shadow-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full transition-opacity hover:opacity-60"
        style={{ color: "var(--text-muted)" }}
        aria-label="Закрыть"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <img src="/icons/icon-192x192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="min-w-0">
          <div className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Добавить «Ай, настойка!» на экран
          </div>

          {platform === "ios" ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
              Нажмите <Share size={14} className="inline mx-0.5 mb-0.5" /> «Поделиться» внизу экрана Safari,
              затем <PlusSquare size={14} className="inline mx-0.5 mb-0.5" /> «На экран «Домой»».
            </p>
          ) : (
            <>
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Быстрый доступ с главного экрана, как приложение — без установки из магазина.
              </p>
              <button
                onClick={handleAndroidInstall}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                <Download size={16} /> Установить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
