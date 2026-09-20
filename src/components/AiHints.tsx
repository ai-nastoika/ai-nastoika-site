import { Link } from "react-router";
import { UserPlus } from "lucide-react";

/* Общие тексты и мини-компоненты для всех «умных» функций сайта («Что получится, если...»,
   «Спросить винокура», «Подсказки по настаиванию», калькулятор вкуса, этикетка).
   Единое место, чтобы формулировки не расходились и правились в одном файле. */

/* Название метки над ответом. Слово «ИИ» в интерфейсе не выносим в заголовки —
   объясняем по-человечески, кто отвечает (см. AiHonestNote). */
export const ANSWER_LABEL = "Ответ программы";
export const PREVIEW_LABEL = "Краткий ответ";

/* Честная строчка под каждым ответом: кто отвечает и что последнее слово за человеком. */
export function AiHonestNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-sm ${className}`}
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}
    >
      Ответ составляет компьютерная программа по базе рецептов и справочникам. Она может ошибаться —
      сверяйтесь со своим опытом.
    </p>
  );
}

/* Пояснение в одну строку под кнопкой: что произойдёт после нажатия и что это будет стоить. */
export function AiActionNote({
  isLoggedIn,
  freeLeft,
  costRub,
  balanceRub,
  className = "",
}: {
  isLoggedIn: boolean;
  freeLeft?: number; // сколько бесплатных советов осталось (undefined — ещё не загрузилось)
  costRub?: number;
  balanceRub?: number;
  className?: string;
}) {
  let text: string;
  if (!isLoggedIn) {
    text = "Бесплатно и без регистрации — покажем краткий ответ. Он придёт в течение полминуты.";
  } else if (freeLeft === undefined) {
    text = "Ответ придёт в течение полминуты.";
  } else if (freeLeft > 0) {
    text = "Это бесплатный совет. Ответ придёт в течение полминуты.";
  } else {
    text = `Спишется ${costRub ?? 2} ₽ с вашего баланса${
      balanceRub !== undefined ? ` (сейчас на нём ${balanceRub} ₽)` : ""
    }. Ответ придёт в течение полминуты.`;
  }
  return (
    <p
      className={`text-sm ${className}`}
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}
    >
      {text}
    </p>
  );
}

/* Приглашение после краткого ответа для посетителя без регистрации.
   `whatIsInside` — что человек получит в полном ответе (зависит от функции). */
export function AiPreviewCta({ whatIsInside }: { whatIsInside: string }) {
  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}
    >
      <p
        className="text-base mb-3"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
      >
        Это краткий ответ. В полном — {whatIsInside}. Первые 5 полных советов бесплатны.
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          to="/login?mode=register"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-medium text-white"
          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <UserPlus size={18} /> Зарегистрироваться бесплатно
        </Link>
        <Link
          to="/login"
          className="text-sm underline"
          style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          Уже есть аккаунт? Войти
        </Link>
      </div>
    </div>
  );
}
