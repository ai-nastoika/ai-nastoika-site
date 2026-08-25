import { useState } from "react";
import { Heart, Loader2, Copy, Check, X, CreditCard, Smartphone, ArrowLeft } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { ThanksContent } from "./DonationThanksAnimation";

/**
 * Единая точка входа для доната — используется и на кнопке в шапке сайта,
 * и на кнопке «Поддержать» на странице /rules, чтобы способ поддержки
 * менялся в одном месте, а не в двух копиях кода.
 *
 * Использование:
 *   const [donateOpen, setDonateOpen] = useState(false);
 *   <button onClick={() => setDonateOpen(true)}>Поддержать</button>
 *   {donateOpen && <DonateModal onClose={() => setDonateOpen(false)} />}
 */

/* Форма ответа donationRouter.info — держим явным типом здесь, а не выводим
   его из ReturnType хука: при выведении через generics в этом проекте
   встречается нестабильный вывод типов (см. известные особенности tsc). */
type DonationInfo = {
  paymentsConfigured: boolean;
  presetsRub: readonly number[];
  directTransfer: { phoneNumber: string; ownerName?: string; bank?: string } | null;
};

type View = "choice" | "yookassa" | "phone" | "thanks";

interface DonateModalProps {
  onClose: () => void;
}

export function DonateModal({ onClose }: DonateModalProps) {
  const { data: info } = trpc.donation.info.useQuery();
  const [view, setView] = useState<View>("choice");

  return (
    <div className="donate-modal-overlay" onClick={onClose}>
      <div className="donate-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="donate-modal-close" onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>

        {view !== "thanks" && (
          <>
            <Heart size={28} className="donate-modal-icon" />
            <h3 className="donate-modal-title">Поддержать проект</h3>
          </>
        )}

        {!info ? (
          <p className="donate-modal-loading">Загрузка...</p>
        ) : view === "choice" ? (
          <ChoiceView info={info} onSelect={setView} />
        ) : view === "yookassa" ? (
          <YookassaView info={info} onBack={() => setView("choice")} />
        ) : view === "phone" ? (
          <PhoneView info={info} onBack={() => setView("choice")} onConfirmed={() => setView("thanks")} />
        ) : (
          <ThanksContent onClose={onClose} />
        )}
      </div>

      <style>{`
        .donate-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: donateModalFadeIn 0.2s ease-out;
          padding: 16px;
        }

        .donate-modal-card {
          position: relative;
          background: var(--bg-card, #fff);
          border: 1px solid var(--border, #e5e5e5);
          border-radius: 16px;
          padding: 32px 28px 28px;
          max-width: 360px;
          width: 100%;
          text-align: center;
          box-sizing: border-box;
        }

        .donate-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--text-muted, #999);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .donate-modal-close:hover {
          background: var(--bg-primary, #f5f5f5);
        }

        .donate-modal-icon {
          color: var(--accent, #2563eb);
          margin: 0 auto 8px;
        }

        .donate-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #111);
          font-family: var(--font-heading, inherit);
          margin: 0 0 20px;
        }

        .donate-modal-loading {
          font-size: 14px;
          color: var(--text-muted, #999);
          padding: 16px 0;
        }

        .donate-modal-choice {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .donate-modal-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--bg-primary, #f5f5f5);
          border: 1px solid var(--border, #e5e5e5);
          color: var(--text-primary, #111);
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-body, inherit);
          cursor: pointer;
          transition: opacity 0.15s ease-out;
        }

        .donate-modal-option:hover:not(:disabled) {
          border-color: var(--accent, #2563eb);
        }

        .donate-modal-option:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .donate-modal-option svg {
          color: var(--accent, #2563eb);
          flex-shrink: 0;
        }

        .donate-modal-hint {
          font-size: 13px;
          color: var(--text-muted, #999);
          margin-top: 4px;
        }

        .donate-modal-back {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--text-muted, #999);
          font-size: 13px;
          font-family: var(--font-body, inherit);
          cursor: pointer;
          margin-bottom: 14px;
          padding: 0;
        }

        .donate-modal-back:hover {
          color: var(--accent, #2563eb);
        }

        .donate-modal-body {
          text-align: left;
        }

        .donate-modal-presets {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .donate-modal-preset {
          border-radius: 10px;
          padding: 8px 0;
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-body, inherit);
          border: 1px solid var(--border, #e5e5e5);
          background: var(--bg-primary, #f5f5f5);
          color: var(--text-primary, #111);
          cursor: pointer;
        }

        .donate-modal-preset.is-active {
          background: var(--accent, #2563eb);
          color: #fff;
          border-color: var(--accent, #2563eb);
        }

        .donate-modal-input {
          width: 100%;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          margin-bottom: 12px;
          outline: none;
          box-sizing: border-box;
          background: var(--bg-primary, #f5f5f5);
          border: 1px solid var(--border, #e5e5e5);
          color: var(--text-primary, #111);
          font-family: var(--font-body, inherit);
        }

        .donate-modal-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 11px 0;
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-body, inherit);
          background: var(--accent, #2563eb);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s ease-out;
        }

        .donate-modal-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .donate-modal-error {
          font-size: 13px;
          color: #dc2626;
          margin-top: 8px;
          text-align: center;
        }

        .donate-modal-phone-note {
          font-size: 13px;
          color: var(--text-secondary, #555);
          margin-bottom: 14px;
          line-height: 1.5;
          text-align: center;
        }

        .donate-modal-copy {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 11px 0;
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-body, inherit);
          background: var(--accent, #2563eb);
          color: #fff;
          border: none;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .donate-modal-copy.is-copied {
          background: #16a34a;
        }

        .donate-modal-recipient {
          font-size: 13px;
          color: var(--text-muted, #999);
          text-align: center;
          margin: 0;
        }

        @keyframes donateModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .donate-modal-overlay {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Экран выбора способа ── */
function ChoiceView({ info, onSelect }: { info: DonationInfo; onSelect: (v: View) => void }) {
  return (
    <div className="donate-modal-choice">
      <button
        className="donate-modal-option"
        onClick={() => onSelect("yookassa")}
        disabled={!info.paymentsConfigured}
      >
        <CreditCard size={18} />
        <span>Через ЮKassa</span>
      </button>
      <button
        className="donate-modal-option"
        onClick={() => onSelect("phone")}
        disabled={!info.directTransfer}
      >
        <Smartphone size={18} />
        <span>По номеру телефона</span>
      </button>
      {!info.paymentsConfigured && !info.directTransfer && (
        <p className="donate-modal-hint">Способы оплаты пока настраиваются, загляните позже.</p>
      )}
    </div>
  );
}

/* ── ЮKassa: сумма + имя → редирект на страницу оплаты сервиса ── */
function YookassaView({ info, onBack }: { info: DonationInfo; onBack: () => void }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [name, setName] = useState("");

  const createDonation = trpc.donation.create.useMutation({
    onSuccess: (data) => {
      window.location.href = data.confirmationUrl;
    },
  });

  return (
    <div className="donate-modal-body">
      <button className="donate-modal-back" onClick={onBack}>
        <ArrowLeft size={14} /> Назад
      </button>

      <div className="donate-modal-presets">
        {info.presetsRub.map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`donate-modal-preset ${amount === v ? "is-active" : ""}`}
          >
            {v} ₽
          </button>
        ))}
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя для списка благодарности (необязательно)"
        maxLength={100}
        className="donate-modal-input"
      />
      <button
        onClick={() => amount && createDonation.mutate({ amountRub: amount, name: name.trim() || undefined })}
        disabled={!amount || createDonation.isPending}
        className="donate-modal-submit"
      >
        {createDonation.isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Переходим к оплате...</>
        ) : (
          <><Heart size={16} /> Задонатить через ЮKassa</>
        )}
      </button>
      {createDonation.isError && <p className="donate-modal-error">{createDonation.error.message}</p>}
    </div>
  );
}

/* ── Перевод по номеру телефона напрямую, в обход ЮKassa ──
   Номер НЕ отображается на экране — только кнопка «Скопировать», которая
   кладёт его в буфер обмена. Сайт не узнаёт о факте перевода — это просто
   реквизиты, зачисление ничего не делает автоматически. */
function PhoneView({ info, onBack, onConfirmed }: { info: DonationInfo; onBack: () => void; onConfirmed: () => void }) {
  const [copied, setCopied] = useState(false);

  if (!info.directTransfer) return null;
  const { phoneNumber, ownerName, bank } = info.directTransfer;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен (старый браузер/нет разрешения) — просто
      // не показываем "скопировано", ничего критичного не происходит.
    }
  };

  return (
    <div className="donate-modal-body">
      <button className="donate-modal-back" onClick={onBack}>
        <ArrowLeft size={14} /> Назад
      </button>

      <p className="donate-modal-phone-note">
        Нажмите «Скопировать» и переведите любую сумму по СБП на скопированный номер в приложении вашего банка.
      </p>

      <button
        onClick={handleCopy}
        className={`donate-modal-copy ${copied ? "is-copied" : ""}`}
      >
        {copied ? <><Check size={16} /> Номер скопирован</> : <><Copy size={16} /> Скопировать номер телефона</>}
      </button>

      {(ownerName || bank) && (
        <p className="donate-modal-recipient">
          {ownerName && <>Получатель: {ownerName}</>}
          {ownerName && bank && " · "}
          {bank && <>Банк: {bank}</>}
        </p>
      )}

      <button
        onClick={onConfirmed}
        className="donate-modal-submit"
        style={{ marginTop: 14, background: "transparent", color: "var(--accent)", border: "1px solid var(--border)" }}
      >
        Я перевёл(а)
      </button>
    </div>
  );
}
