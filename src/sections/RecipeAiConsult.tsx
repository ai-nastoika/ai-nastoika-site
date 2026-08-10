import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Send, Loader2, MessageCircleQuestion, LogIn, Wallet } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Можно заменить водку на самогон?",
  "Что будет, если уменьшить время настаивания вдвое?",
  "Чем можно заменить этот ингредиент?",
  "Как сделать настойку слаще?",
];

export default function RecipeAiConsult({ recipeId }: { recipeId: number }) {
  const { isLoggedIn } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  const { data: limitInfo, refetch: refetchLimit } = trpc.recipeConsult.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const ask = trpc.recipeConsult.ask.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      refetchLimit();
    },
    onError: (err) => {
      setError(err.message || "Не удалось получить ответ");
      refetchLimit();
    },
  });

  function handleAsk(text?: string) {
    const q = (text ?? question).trim();
    if (!q || ask.isPending) return;
    setError("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(nextMessages);
    setQuestion("");
    ask.mutate({
      recipeId,
      question: q,
      history: messages.slice(-10), // предыдущие реплики этого диалога, для контекста
    });
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Консультация ИИ по этому рецепту
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Что-то не до конца понятно? Спросите — можно ли заменить ингредиент, сократить выдержку, настоять на другом спирте.
          Доступно после входа в аккаунт.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <LogIn size={16} /> Войти, чтобы спросить
        </Link>
      </div>
    );
  }

  const limitReached = limitInfo ? !limitInfo.allowed : false;
  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 2;

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          Консультация ИИ по рецепту
        </h3>
        {limitInfo && (
          <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            {limitInfo.freeRequestsLeft > 0 ? (
              <>Осталось бесплатных: {limitInfo.freeRequestsLeft} из 5</>
            ) : (
              <><Wallet size={12} /> Баланс: {balanceRub} ₽ · {costRub} ₽ за запрос</>
            )}
          </span>
        )}
      </div>

      {messages.length === 0 && (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
            Что-то непонятно в рецепте? Спросите — например, про замену ингредиентов, изменение крепости или времени выдержки.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleAsk(s)}
                disabled={!!limitReached}
                className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-70 disabled:opacity-40"
                style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className="rounded-xl p-3 text-sm"
              style={
                m.role === "user"
                  ? { background: "var(--surface)", color: "var(--text-primary)", marginLeft: "15%", fontFamily: "var(--font-body)" }
                  : { background: "var(--bg-secondary)", color: "var(--text-primary)", marginRight: "15%", fontFamily: "var(--font-body)", lineHeight: 1.6 }
              }
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  <MessageCircleQuestion size={14} /> Ответ ИИ
                </div>
              )}
              {m.content}
            </div>
          ))}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={16} className="animate-spin" /> Думаю над ответом...
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm mb-3" style={{ color: "#dc2626" }}>{error}</p>}

      {limitReached ? (
        <div className="text-sm text-center py-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Бесплатные запросы закончились, а баланса не хватает на {costRub} ₽ за запрос.{" "}
          <Link to="/profile?tab=history" className="underline font-medium" style={{ color: "var(--accent)" }}>
            Пополнить баланс
          </Link>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Например: можно настоять на спирту вместо водки?"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            disabled={ask.isPending}
          />
          <button
            onClick={() => handleAsk()}
            disabled={!question.trim() || ask.isPending}
            className="rounded-xl px-4 flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
