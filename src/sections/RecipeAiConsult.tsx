import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Send, MessageCircleQuestion, Wallet } from "lucide-react";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";
import { AiHonestNote, AiActionNote, AiPreviewCta, ANSWER_LABEL, PREVIEW_LABEL } from "@/components/AiHints";

type ChatMessage = { role: "user" | "assistant"; content: string; similarRecipes?: { id: number; slug: string; title: string }[] };

const SUGGESTIONS = [
  "Можно заменить водку на самогон?",
  "Что будет, если уменьшить время настаивания вдвое?",
  "Чем можно заменить этот ингредиент?",
  "Как сделать настойку слаще?",
];

/* Гостевая версия — для посетителей без регистрации: один краткий ответ по рецепту
   (сервер режет его по промпту, см. api/lib/aiPreview.ts) и приглашение зарегистрироваться. */
function GuestRecipeAsk({ recipeId }: { recipeId: number }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const preview = trpc.recipeConsult.preview.useMutation();

  function send(text: string) {
    const q = text.trim();
    if (!q || preview.isPending) return;
    setAsked(q);
    preview.mutate({ recipeId, question: q });
  }

  function askAnother() {
    preview.reset();
    setAsked(null);
    setQuestion("");
  }

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-lg font-bold flex items-center gap-2 mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
        <Sparkles size={20} style={{ color: "var(--accent)" }} />
        Спросить винокура про этот рецепт
      </h3>

      {asked === null ? (
        <>
          <p className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
            Что-то непонятно в рецепте? Нажмите на вопрос или напишите свой — например, можно ли заменить ингредиент,
            сократить выдержку или настоять на другом спирте.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setQuestion(s); send(s); }}
                className="text-base px-4 py-2 rounded-full transition-all hover:opacity-70"
                style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(question)}
              placeholder="Например: можно настоять на спирту вместо водки?"
              maxLength={300}
              className="flex-1 rounded-xl px-4 py-2.5 text-base outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            />
            <button
              onClick={() => send(question)}
              disabled={!question.trim()}
              aria-label="Спросить"
              className="rounded-xl px-4 flex items-center justify-center text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              <Send size={18} />
            </button>
          </div>
          <AiActionNote isLoggedIn={false} className="mt-2" />
        </>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl p-4 text-base" style={{ background: "var(--surface)", color: "var(--text-primary)", marginLeft: "12%", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
            {asked}
          </div>

          {preview.isPending && <BottleThinkingIndicator />}

          {preview.error && (
            <div>
              <p className="text-base mb-2" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>{preview.error.message}</p>
              <button onClick={askAnother} className="text-sm underline" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                Попробовать ещё раз
              </button>
            </div>
          )}

          {preview.data && (
            <>
              <div className="rounded-xl p-4 text-base" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", marginRight: "12%", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                <div className="flex items-center gap-1 mb-1 text-sm font-medium" style={{ color: "var(--accent)" }}>
                  <MessageCircleQuestion size={14} /> {PREVIEW_LABEL}
                </div>
                {preview.data.answer}
              </div>
              <AiPreviewCta whatIsInside="подробный разбор: варианты замены, пропорции и влияние на срок выдержки" />
              <AiHonestNote />
              <button onClick={askAnother} className="text-sm underline" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Задать другой вопрос
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecipeAiConsult({ recipeId }: { recipeId: number }) {
  const { isLoggedIn } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [restored, setRestored] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: limitInfo, refetch: refetchLimit } = trpc.recipeConsult.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  // При открытии рецепта — подтягиваем последний диалог именно по нему, если он есть
  const { data: lastConversation } = trpc.recipeConsult.getLastConversation.useQuery(
    { recipeId },
    { enabled: isLoggedIn }
  );

  useEffect(() => {
    if (!restored && lastConversation) {
      setMessages(lastConversation.messages as ChatMessage[]);
      setConversationId(lastConversation.id);
      setRestored(true);
    }
  }, [lastConversation, restored]);

  const ask = trpc.recipeConsult.ask.useMutation({
    onSuccess: (data) => {
      // similarRecipes прикрепляем только к свежему ответу — это данные текущего
      // запроса, а не часть сохранённой истории диалога (там их нет при восстановлении).
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, similarRecipes: data.similarRecipes }]);
      setConversationId(data.conversationId);
      refetchLimit();
    },
    onError: (err) => {
      setError(err.message || "Не удалось получить ответ");
      refetchLimit();
    },
  });

  const finishConversation = trpc.aiConversation.finish.useMutation();

  function endConversation() {
    if (conversationId) finishConversation.mutate({ conversationId });
    setMessages([]);
    setConversationId(undefined);
    setError("");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, ask.isPending]);

  function handleAsk() {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setError("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(nextMessages);
    setQuestion("");
    ask.mutate({
      recipeId,
      question: q,
      history: messages.slice(-10), // предыдущие реплики этого диалога, для контекста
      conversationId,
    });
  }

  if (!isLoggedIn) {
    return <GuestRecipeAsk recipeId={recipeId} />;
  }

  const limitReached = limitInfo ? !limitInfo.allowed : false;
  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 2;

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          Спросить винокура про этот рецепт
        </h3>
        {limitInfo && (
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button onClick={endConversation} className="text-xs underline" style={{ color: "var(--text-muted)" }}>
                Завершить диалог
              </button>
            )}
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {limitInfo.freeRequestsLeft > 0 ? (
                <>Бесплатных советов осталось: {limitInfo.freeRequestsLeft} из 5</>
              ) : (
                <><Wallet size={12} /> Баланс: {balanceRub} ₽ · {costRub} ₽ за совет</>
              )}
            </span>
          </div>
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
                onClick={() => setQuestion(s)}
                disabled={!!limitReached}
                className="text-sm px-3 py-1.5 rounded-full transition-all hover:opacity-70 disabled:opacity-40"
                style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-[32rem] overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className="rounded-xl p-4 text-base"
              style={
                m.role === "user"
                  ? { background: "var(--surface)", color: "var(--text-primary)", marginLeft: "12%", fontFamily: "var(--font-body)", lineHeight: 1.8 }
                  : { background: "var(--bg-secondary)", color: "var(--text-primary)", marginRight: "12%", fontFamily: "var(--font-body)", lineHeight: 1.8 }
              }
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  <MessageCircleQuestion size={14} /> {ANSWER_LABEL}
                </div>
              )}
              {m.content}
              {m.role === "assistant" && m.similarRecipes && m.similarRecipes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs w-full mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    Похожие рецепты на сайте:
                  </span>
                  {m.similarRecipes.map((r) => (
                    <Link
                      key={r.id}
                      to={`/recipe/${r.slug}`}
                      className="text-xs px-3 py-1.5 rounded-full transition-opacity hover:opacity-70"
                      style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                    >
                      {r.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {ask.isPending && <BottleThinkingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {error && <p className="text-sm mb-3" style={{ color: "#dc2626" }}>{error}</p>}

      {limitReached ? (
        <div className="text-sm text-center py-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Бесплатные советы закончились, а на балансе не хватает {costRub} ₽ на новый.{" "}
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
            className="flex-1 rounded-xl px-4 py-2.5 text-base outline-none"
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
      {!limitReached && (
        <AiActionNote
          isLoggedIn
          freeLeft={limitInfo?.freeRequestsLeft}
          costRub={costRub}
          balanceRub={balanceRub}
          className="mt-2"
        />
      )}
      {messages.length > 0 && <AiHonestNote className="mt-3" />}
    </div>
  );
}
