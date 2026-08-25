import { useEffect, useState } from 'react';

/**
 * Показывается после нажатия «Я перевёл(а)» в табе «Перевести напрямую».
 * Три бутылочки подпрыгивают вразнобой, следом всплывает текст.
 *
 * Использование:
 *   const [thanksVisible, setThanksVisible] = useState(false);
 *   ...
 *   <button onClick={() => setThanksVisible(true)}>Я перевёл(а)</button>
 *   {thanksVisible && (
 *     <DonationThanksAnimation onClose={() => setThanksVisible(false)} />
 *   )}
 *
 * ThanksContent экспортируется отдельно — без своего fixed-оверлея,
 * чтобы её можно было вставить как один из "экранов" внутри уже открытого
 * модального окна (см. DonateModal), не плодя вложенные overlay друг в друге.
 */

interface DonationThanksAnimationProps {
  onClose: () => void;
}

export function DonationThanksAnimation({ onClose }: DonationThanksAnimationProps) {
  return (
    <div className="donation-thanks-overlay" onClick={onClose}>
      <div className="donation-thanks-card" onClick={(e) => e.stopPropagation()}>
        <ThanksContent onClose={onClose} />
      </div>
      <ThanksStyles />
      <style>{`
        .donation-thanks-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: donationFadeIn 0.2s ease-out;
        }

        .donation-thanks-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 16px;
          padding: 40px 32px 32px;
          max-width: 340px;
          width: 90%;
          text-align: center;
          box-sizing: border-box;
        }

        @keyframes donationFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .donation-thanks-overlay {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/** Только содержимое (бутылочки + текст + кнопка) — без своего оверлея/карточки. */
export function ThanksContent({ onClose }: { onClose: () => void }) {
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="donation-thanks-bottles">
        <Bottle delay={0} />
        <Bottle delay={0.12} tall />
        <Bottle delay={0.24} />
      </div>

      <p className={`donation-thanks-text ${textVisible ? 'is-visible' : ''}`}>
        Спасибо!
      </p>
      <p className={`donation-thanks-subtext ${textVisible ? 'is-visible' : ''}`}>
        Ваша поддержка помогает проекту жить и настаиваться дальше
      </p>

      <button className="donation-thanks-close" onClick={onClose}>
        Закрыть
      </button>
      <ThanksStyles />
    </>
  );
}

function ThanksStyles() {
  return (
    <style>{`
      .donation-thanks-bottles {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 18px;
        height: 72px;
        margin-bottom: 8px;
      }

      .donation-thanks-text {
        font-size: 24px;
        font-weight: 700;
        margin: 12px 0 4px;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.35s ease-out, transform 0.35s ease-out;
      }

      .donation-thanks-text.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .donation-thanks-subtext {
        font-size: 14px;
        color: var(--text-secondary, #737373);
        margin: 0 0 24px;
        opacity: 0;
        transition: opacity 0.35s ease-out 0.1s;
      }

      .donation-thanks-subtext.is-visible {
        opacity: 1;
      }

      .donation-thanks-close {
        background: var(--accent, #2563eb);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 10px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      .donation-thanks-close:hover {
        opacity: 0.9;
      }

      @media (prefers-reduced-motion: reduce) {
        .donation-thanks-text,
        .donation-thanks-subtext {
          transition: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
      }
    `}</style>
  );
}

function Bottle({ delay, tall = false }: { delay: number; tall?: boolean }) {
  return (
    <svg
      width={tall ? 28 : 24}
      height={tall ? 64 : 56}
      viewBox="0 0 24 56"
      fill="none"
      style={{
        animation: `bottleBounce 0.9s ease-in-out ${delay}s infinite`,
      }}
    >
      <style>{`
        @keyframes bottleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @media (prefers-reduced-motion: reduce) {
          svg { animation: none !important; }
        }
      `}</style>
      {/* горлышко */}
      <rect x="9" y="0" width="6" height="14" rx="1.5" fill="var(--accent, #2563eb)" />
      {/* пробка */}
      <rect x="8" y="0" width="8" height="4" rx="1" fill="var(--border, #999)" />
      {/* тело бутылки */}
      <path
        d="M6 14 L18 14 L20 22 L20 52 Q20 55 17 55 L7 55 Q4 55 4 52 L4 22 Z"
        fill="var(--accent, #2563eb)"
        opacity="0.85"
      />
      {/* жидкость / блик */}
      <path
        d="M6 28 L18 28 L18.5 52 Q18.5 53.5 17 53.5 L7 53.5 Q5.5 53.5 5.5 52 Z"
        fill="var(--accent, #2563eb)"
      />
      <rect x="7" y="18" width="2" height="30" rx="1" fill="#fff" opacity="0.25" />
    </svg>
  );
}
