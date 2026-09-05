import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Link, useSearchParams } from "react-router";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";
import PageHero from "@/components/PageHero";
import {
  Wand2,
  Calculator,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
  LogIn,
  Wallet,
  AlertTriangle,
  X,
  Compass,
} from "lucide-react";

/* ============================================================
   SUB-COMPONENT: Прогноз настойки (бывший «Калькулятор вкуса» — свободный
   текст). Основной калькулятор теперь кнопочный, см. TasteBuilder ниже —
   этот сервис оставлен вторым, для случаев, которые не покрыть кнопками.
   Требует логина — тарификация общая с recipeConsult/infusionConsult
   (5 бесплатных запросов на аккаунт, дальше 2 ₽ с баланса). См. api/tasteCalculatorRouter.ts.
   Разговорный чат с историей — так же, как RecipeAiConsult.tsx.
   ============================================================ */
type TasteChatMessage = { role: "user" | "assistant"; content: string; similarRecipes?: { id: number; slug: string; title: string }[] };

const TASTE_SUGGESTIONS = [
  "Есть вишня и мёд, что посоветуете?",
  "Хочу что-то освежающее и не приторное",
  "Настаиваю на самогоне — с чем лучше сочетается?",
  "Как получить красивый янтарный цвет?",
];

function InfusionForecast() {
  const { isLoggedIn } = useAuth();
  const [messages, setMessages] = useState<TasteChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [restored, setRestored] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: limitInfo, refetch: refetchLimit } = trpc.tasteCalculator.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  // При открытии — подтягиваем последний диалог, если он есть, чтобы не начинать с нуля
  const { data: lastConversation } = trpc.tasteCalculator.getLastConversation.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  useEffect(() => {
    if (!restored && lastConversation) {
      setMessages(lastConversation.messages as TasteChatMessage[]);
      setConversationId(lastConversation.id);
      setRestored(true);
    }
  }, [lastConversation, restored]);

  const generate = trpc.tasteCalculator.generate.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, similarRecipes: data.similarRecipes }]);
      setConversationId(data.conversationId);
      setError("");
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
  }, [messages.length, generate.isPending]);

  // Автоподгонка высоты textarea под содержимое (перенос строк вместо горизонтального скролла)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [message]);

  const limitReached = limitInfo ? !limitInfo.allowed : false;
  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 2;

  function handleSend() {
    const m = message.trim();
    if (!m || generate.isPending || limitReached) return;
    setError("");
    const nextMessages: TasteChatMessage[] = [...messages, { role: "user", content: m }];
    setMessages(nextMessages);
    setMessage("");
    generate.mutate({
      message: m,
      history: messages.slice(-10), // предыдущие реплики этого диалога, для контекста
      conversationId,
    });
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Опишите идею или ингредиенты — ИИ подскажет, что может получиться, и посоветует, с чего начать. Доступно после входа в аккаунт.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <LogIn size={16} /> Войти, чтобы попробовать
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <label className="text-base font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Опишите идею или перечислите ингредиенты
        </label>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={endConversation}
              className="text-xs underline"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              Завершить диалог
            </button>
          )}
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
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {TASTE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setMessage(s)}
              disabled={!!limitReached}
              className="text-sm px-3 py-1.5 rounded-full transition-all hover:opacity-70 disabled:opacity-40"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              {s}
            </button>
          ))}
        </div>
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
                  : { background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", marginRight: "12%", fontFamily: "var(--font-body)", lineHeight: 1.8 }
              }
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  <Sparkles size={14} /> Ответ ИИ
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
          {generate.isPending && <BottleThinkingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {error && (
        <p className="text-sm mb-3" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
          {error}
        </p>
      )}

      {limitReached ? (
        <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Бесплатные запросы закончились, а баланса не хватает на {costRub} ₽ за запрос.{" "}
          <Link to="/profile?tab=history" className="underline font-medium" style={{ color: "var(--accent)" }}>
            Пополнить баланс
          </Link>
        </div>
      ) : (
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={messages.length === 0 ? "Например: вишня, ваниль, корица..." : "Продолжите разговор..."}
            rows={1}
            className="flex-1 rounded-xl px-4 py-2.5 text-base outline-none resize-none"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              lineHeight: 1.5,
              maxHeight: "160px",
              overflowY: "auto",
            }}
            disabled={generate.isPending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!message.trim() || generate.isPending}
            className="rounded-xl px-4 py-2.5 flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            <Wand2 size={18} />
          </button>
        </div>
      )}

      {messages.length > 0 && (
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Это ориентировочные советы от ИИ, а не проверенный рецепт — сверьте пропорции перед использованием.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: ABV Calculator
   ============================================================ */
function AbvCalculator() {
  const { isLoggedIn } = useAuth();
  const [volume, setVolume] = useState(1000);
  const [initialAbv, setInitialAbv] = useState(40);
  const [sugar, setSugar] = useState(100);
  const [water, setWater] = useState(0);
  const [infusionIngredients, setInfusionIngredients] = useState("");
  const [infusionDays, setInfusionDays] = useState(21);
  const [straining, setStraining] = useState<"none" | "light" | "full">("light");

  // База пересчитывается сама при любом изменении полей — точная формула, без ИИ.
  const baseResult = useMemo(() => {
    const alcoholMl = volume * (initialAbv / 100);
    const totalVolume = volume + water + sugar * 0.6;
    const finalAbv = totalVolume > 0 ? (alcoholMl / totalVolume) * 100 : 0;
    return { abv: parseFloat(finalAbv.toFixed(1)), totalVolume: Math.round(totalVolume) };
  }, [volume, initialAbv, sugar, water]);

  const { data: limitInfo, refetch: refetchLimit } = trpc.abvEstimator.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const estimate = trpc.abvEstimator.estimate.useMutation({
    onSuccess: () => refetchLimit(),
    onError: () => refetchLimit(),
  });

  const limitReached = limitInfo ? !limitInfo.allowed : false;
  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 2;

  const handleEstimate = () => {
    if (!infusionIngredients.trim() || estimate.isPending || limitReached) return;
    estimate.mutate({
      baseAbv: baseResult.abv,
      baseVolumeMl: baseResult.totalVolume,
      ingredients: infusionIngredients.trim(),
      infusionDays,
      straining,
    });
  };

  const reset = () => {
    setVolume(1000);
    setInitialAbv(40);
    setSugar(100);
    setWater(0);
    setInfusionIngredients("");
    setInfusionDays(21);
    setStraining("light");
    estimate.reset();
  };

  const adjust = (setter: React.Dispatch<React.SetStateAction<number>>, value: number, step: number) => {
    setter(Math.max(0, value + step));
  };

  const dayOptions = [3, 7, 10, 14, 21, 30, 45, 60, 90];

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6 min-w-0">
        {/* Volume */}
        <div
          className="rounded-xl p-4 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Объём спирта (мл)
          </label>
          <div className="flex items-center gap-3 mt-2 min-w-0">
            <button onClick={() => adjust(setVolume, volume, -100)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 min-w-0 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setVolume, volume, 100)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Initial ABV */}
        <div
          className="rounded-xl p-4 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Крепость спирта (%)
          </label>
          <div className="flex items-center gap-3 mt-2 min-w-0">
            <button onClick={() => adjust(setInitialAbv, initialAbv, -1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={initialAbv}
              onChange={(e) => setInitialAbv(Number(e.target.value))}
              className="flex-1 min-w-0 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setInitialAbv, initialAbv, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Sugar */}
        <div
          className="rounded-xl p-4 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Сахар (г)
          </label>
          <div className="flex items-center gap-3 mt-2 min-w-0">
            <button onClick={() => adjust(setSugar, sugar, -10)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={sugar}
              onChange={(e) => setSugar(Number(e.target.value))}
              className="flex-1 min-w-0 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setSugar, sugar, 10)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Water */}
        <div
          className="rounded-xl p-4 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Добавлено воды (мл)
          </label>
          <div className="flex items-center gap-3 mt-2 min-w-0">
            <button onClick={() => adjust(setWater, water, -50)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={water}
              onChange={(e) => setWater(Number(e.target.value))}
              className="flex-1 min-w-0 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setWater, water, 50)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Infusion period */}
        <div
          className="rounded-xl p-4 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Срок настаивания
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {dayOptions.map((d) => (
              <button
                key={d}
                onClick={() => setInfusionDays(d)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: infusionDays === d ? "var(--accent)" : "var(--surface)",
                  color: infusionDays === d ? "#fff" : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {d} дн
              </button>
            ))}
          </div>
        </div>

        {/* Infusion ingredients — используется только для ИИ-оценки ниже, на формулу базы не влияет */}
        <div
          className="rounded-xl p-4 sm:col-span-2 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Ингредиенты для настаивания <span style={{ fontWeight: 400 }}>(для ИИ-оценки ниже, на точный расчёт базы не влияет)</span>
          </label>
          <textarea
            value={infusionIngredients}
            onChange={(e) => setInfusionIngredients(e.target.value)}
            placeholder="Например: вишня свежая 500г, ваниль 1 стручок, корица 2 палочки..."
            className="w-full mt-2 rounded-lg px-4 py-2.5 text-base outline-none resize-none"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              minHeight: 60,
            }}
          />
        </div>

        {/* Straining method — тоже только для ИИ-оценки */}
        <div
          className="rounded-xl p-4 sm:col-span-2 min-w-0"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Отжим/процеживание после настаивания
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {([
              { id: "none", label: "Не отжимал(а)" },
              { id: "light", label: "Слегка процедил(а)" },
              { id: "full", label: "Отжал(а) полностью" },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStraining(opt.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: straining === opt.id ? "var(--accent)" : "var(--surface)",
                  color: straining === opt.id ? "#fff" : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-medium transition-all hover:scale-105"
        style={{
          background: "var(--surface)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-body)",
        }}
      >
        <RotateCcw size={28} />
        Сброс
      </button>

      {/* База — точный расчёт, пересчитывается сам при любом изменении полей выше */}
      <div className="mt-6 rounded-xl p-6 space-y-3" style={{ background: "var(--accent)", color: "#fff" }}>
        <div className="text-center">
          <div className="text-base opacity-80 mb-1" style={{ fontFamily: "var(--font-body)" }}>
            Крепость базы (точный расчёт)
          </div>
          <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {baseResult.abv}%
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12 }}>
          <div>
            <div className="text-sm opacity-70" style={{ fontFamily: "var(--font-body)" }}>Общий объём базы</div>
            <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>{baseResult.totalVolume} мл</div>
          </div>
          <div>
            <div className="text-sm opacity-70" style={{ fontFamily: "var(--font-body)" }}>Содержание сахара</div>
            <div className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>{sugar} г</div>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm" style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 12, opacity: 0.9, fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Это точный расчёт только базы — спирт, вода, сахар. Ягоды/фрукты, срок настаивания и способ отжима здесь не учтены. Их влияние — в оценке ИИ ниже.</span>
        </div>
      </div>

      {/* ИИ-оценка итоговой крепости готового напитка — второй, отдельный этап */}
      <div className="mt-6 rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          Оценка готового напитка (ИИ)
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Учитывает ингредиенты выше, срок настаивания ({infusionDays} дней) и способ отжима — с оговоркой, что это оценка, а не точное измерение.
        </p>

        {!isLoggedIn ? (
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <LogIn size={16} /> Войти, чтобы получить оценку
          </Link>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
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

            {limitReached ? (
              <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Бесплатные запросы закончились, а баланса не хватает на {costRub} ₽ за запрос.{" "}
                <Link to="/profile?tab=history" className="underline font-medium" style={{ color: "var(--accent)" }}>
                  Пополнить баланс
                </Link>
              </div>
            ) : (
              <button
                onClick={handleEstimate}
                disabled={!infusionIngredients.trim() || estimate.isPending}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                <Wand2 size={20} />
                {estimate.isPending ? "Оцениваю..." : "Оценить с ИИ"}
              </button>
            )}
            {!infusionIngredients.trim() && !limitReached && (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Заполните поле «Ингредиенты для настаивания» выше, чтобы получить оценку.
              </p>
            )}

            {estimate.isPending && <div className="mt-4"><BottleThinkingIndicator label="Оцениваю итоговую крепость..." /></div>}

            {estimate.error && (
              <p className="text-sm mt-4" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
                {estimate.error.message}
              </p>
            )}

            {estimate.data && (
              <div className="mt-4 rounded-xl p-5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
                <div className="text-center mb-3">
                  <div className="text-sm mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    Ориентировочная итоговая крепость
                  </div>
                  <div className="text-3xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                    {estimate.data.estimatedAbv}
                  </div>
                </div>
                <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.8, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  {estimate.data.explanation}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENT: Калькулятор вкуса (кнопочный) — главный инструмент раздела.
   Требует логина, тарификация общая со всеми ИИ-фичами аккаунта (5 бесплатных
   запросов, дальше 2 ₽ с баланса) — см. api/tasteBuilderRouter.ts. В отличие
   от «Прогноза настойки» — без чата и истории переписки: один набор кнопок =
   один ответ. Если чего-то не хватает в кнопках — ссылка внизу ответа ведёт
   на свободнотекстовый сервис (/tools?tool=forecast).
   ============================================================ */
const BASES = [
  { id: "samogon", label: "Самогон", emoji: "🥃", defaultStrength: 45, min: 30, max: 70 },
  { id: "vodka", label: "Водка", emoji: "🧊", defaultStrength: 40, min: 35, max: 45 },
  { id: "spirt", label: "Спирт", emoji: "🧪", defaultStrength: 70, min: 40, max: 96 },
  { id: "konyak", label: "Коньяк", emoji: "🥂", defaultStrength: 40, min: 35, max: 45 },
  { id: "rom", label: "Ром", emoji: "🍹", defaultStrength: 40, min: 35, max: 50 },
];

const INGREDIENT_GROUPS: { label: string; emoji: string; items: string[] }[] = [
  {
    label: "Ягоды",
    emoji: "🍒",
    items: ["Вишня", "Малина", "Клубника", "Смородина чёрная", "Смородина красная", "Ежевика", "Черника", "Клюква", "Брусника", "Крыжовник", "Облепиха"],
  },
  {
    label: "Фрукты и цитрусы",
    emoji: "🍊",
    items: ["Яблоко", "Груша", "Абрикос", "Персик", "Слива", "Манго", "Апельсин", "Лимон", "Лайм", "Ананас"],
  },
  { label: "Овощи и коренья", emoji: "🫚", items: ["Имбирь", "Хрен", "Свёкла", "Ревень"] },
  { label: "Орехи", emoji: "🌰", items: ["Кедровые орехи", "Грецкий орех", "Миндаль", "Фундук"] },
  { label: "Острое и пряное", emoji: "🌶️", items: ["Перец чили", "Чёрный перец", "Мускатный орех"] },
];

const ADDITIVES = ["Сахар", "Мёд", "Ваниль", "Корица", "Гвоздика", "Бадьян", "Апельсиновая цедра", "Мята"];

const MAX_INGREDIENTS = 5;
const MAX_ADDITIVES = 3;

/* Чип в строке формулы — с крестиком для быстрого снятия выбора, без поиска
   исходной кнопки. */
function FormulaChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1 text-sm font-medium whitespace-nowrap"
      style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
    >
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:opacity-70 shrink-0"
        style={{ background: "rgba(255,255,255,0.25)" }}
        aria-label={`Убрать ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function TasteBuilder() {
  const { isLoggedIn } = useAuth();
  const [baseId, setBaseId] = useState<string | null>(null);
  const [strength, setStrength] = useState(40);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [additives, setAdditives] = useState<string[]>([]);
  const [result, setResult] = useState<{ answer: string; similarRecipes: { id: number; slug: string; title: string }[] } | null>(null);
  const [error, setError] = useState("");
  const [limitNotice, setLimitNotice] = useState<"ingredients" | "additives" | null>(null);
  const [shakeItem, setShakeItem] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: limitInfo, refetch: refetchLimit } = trpc.tasteBuilder.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const generate = trpc.tasteBuilder.generate.useMutation({
    onSuccess: (data) => {
      setResult({ answer: data.answer, similarRecipes: data.similarRecipes });
      setError("");
      refetchLimit();
    },
    onError: (err) => {
      setError(err.message || "Не удалось получить ответ");
      refetchLimit();
    },
  });

  const selectedBase = BASES.find((b) => b.id === baseId) ?? null;

  // Лёгкая тряска + короткая подсказка вместо молчаливого disabled — понятнее,
  // почему клик по кнопке ничего не сделал.
  function flashLimit(which: "ingredients" | "additives", key: string) {
    setShakeItem(key);
    setLimitNotice(which);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      setShakeItem(null);
      setLimitNotice(null);
    }, 900);
  }

  function toggleBase(id: string) {
    setResult(null);
    if (baseId === id) {
      setBaseId(null);
      return;
    }
    setBaseId(id);
    const base = BASES.find((b) => b.id === id);
    if (base) setStrength(base.defaultStrength);
  }

  function toggleIngredient(name: string) {
    setResult(null);
    if (ingredients.includes(name)) {
      setIngredients(ingredients.filter((i) => i !== name));
      return;
    }
    if (ingredients.length >= MAX_INGREDIENTS) {
      flashLimit("ingredients", name);
      return;
    }
    setIngredients([...ingredients, name]);
  }

  function toggleAdditive(name: string) {
    setResult(null);
    if (additives.includes(name)) {
      setAdditives(additives.filter((i) => i !== name));
      return;
    }
    if (additives.length >= MAX_ADDITIVES) {
      flashLimit("additives", name);
      return;
    }
    setAdditives([...additives, name]);
  }

  function reset() {
    setBaseId(null);
    setIngredients([]);
    setAdditives([]);
    setResult(null);
    setError("");
    generate.reset();
  }

  const canSubmit = !!selectedBase && ingredients.length > 0;
  const limitReached = limitInfo ? !limitInfo.allowed : false;
  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 2;
  const formulaEmpty = !selectedBase && ingredients.length === 0 && additives.length === 0;

  function handleSubmit() {
    if (!selectedBase || ingredients.length === 0 || generate.isPending || limitReached) return;
    setError("");
    generate.mutate({ base: selectedBase.label, strength, ingredients, additives });
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Соберите настойку из кнопок — основа, ингредиенты, добавки — и узнайте, что вероятно получится. Доступно после входа в аккаунт.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <LogIn size={16} /> Войти, чтобы попробовать
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Основа */}
      <div className="mb-6">
        <div className="text-base font-medium mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Основа
        </div>
        <div className="flex flex-wrap gap-2">
          {BASES.map((b) => (
            <button
              key={b.id}
              onClick={() => toggleBase(b.id)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium transition-all hover:scale-[1.03]"
              style={{
                background: baseId === b.id ? "var(--accent)" : "var(--bg-card)",
                color: baseId === b.id ? "#fff" : "var(--text-primary)",
                border: baseId === b.id ? "none" : "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              <span style={{ fontSize: 18 }}>{b.emoji}</span>
              {b.label}
            </button>
          ))}
        </div>

        {selectedBase && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Крепость
            </span>
            <button
              onClick={() => setStrength(Math.max(selectedBase.min, strength - 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--bg-card)" }}
            >
              <Minus size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
            <span className="text-base font-bold w-12 text-center" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {strength}%
            </span>
            <button
              onClick={() => setStrength(Math.min(selectedBase.max, strength + 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--bg-card)" }}
            >
              <Plus size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        )}
      </div>

      {/* Ингредиенты */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-base font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Ингредиенты
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: ingredients.length >= MAX_INGREDIENTS ? "var(--accent)" : "var(--surface)",
              color: ingredients.length >= MAX_INGREDIENTS ? "#fff" : "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {ingredients.length}/{MAX_INGREDIENTS}
          </span>
          {limitNotice === "ingredients" && (
            <span className="text-xs" style={{ color: "var(--danger)", fontFamily: "var(--font-body)" }}>
              Уберите один, чтобы добавить другой
            </span>
          )}
        </div>
        <div className="space-y-3">
          {INGREDIENT_GROUPS.map((group) => (
            <div key={group.label}>
              <div
                className="text-xs font-medium mb-1.5 flex items-center gap-1"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
              >
                <span>{group.emoji}</span> {group.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => {
                  const active = ingredients.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleIngredient(item)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:opacity-80 ${shakeItem === item ? "shake-btn" : ""}`}
                      style={{
                        background: active ? "var(--accent)" : "var(--bg-card)",
                        color: active ? "#fff" : "var(--text-secondary)",
                        border: active ? "none" : "1px solid var(--border)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Добавки */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-base font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Добавки
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: additives.length >= MAX_ADDITIVES ? "var(--accent)" : "var(--surface)",
              color: additives.length >= MAX_ADDITIVES ? "#fff" : "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {additives.length}/{MAX_ADDITIVES}
          </span>
          {limitNotice === "additives" && (
            <span className="text-xs" style={{ color: "var(--danger)", fontFamily: "var(--font-body)" }}>
              Уберите одну, чтобы добавить другую
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ADDITIVES.map((item) => {
            const active = additives.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleAdditive(item)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:opacity-80 ${shakeItem === item ? "shake-btn" : ""}`}
                style={{
                  background: active ? "var(--accent)" : "var(--bg-card)",
                  color: active ? "#fff" : "var(--text-secondary)",
                  border: active ? "none" : "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Строка формулы — живое отражение выбора, каждый чип снимается кликом по крестику */}
      <div
        className="rounded-xl p-4 mb-5 min-h-[3.5rem] flex items-center overflow-x-auto"
        style={{ background: "var(--bg-primary)", border: "1px dashed var(--border)" }}
      >
        {formulaEmpty ? (
          <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Выберите основу и хотя бы один ингредиент — здесь появится формула
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {selectedBase && <FormulaChip label={`${selectedBase.emoji} ${selectedBase.label} ${strength}%`} onRemove={() => setBaseId(null)} />}
            {ingredients.map((ing, i) => (
              <span key={ing} className="flex items-center gap-2">
                {(i > 0 || !!selectedBase) && <span style={{ color: "var(--text-muted)" }}>+</span>}
                <FormulaChip label={ing} onRemove={() => toggleIngredient(ing)} />
              </span>
            ))}
            {additives.map((add, i) => (
              <span key={add} className="flex items-center gap-2">
                {(i > 0 || !!selectedBase || ingredients.length > 0) && <span style={{ color: "var(--text-muted)" }}>+</span>}
                <FormulaChip label={add} onRemove={() => toggleAdditive(add)} />
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm mb-3" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
          {error}
        </p>
      )}

      {limitReached ? (
        <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Бесплатные запросы закончились, а баланса не хватает на {costRub} ₽ за запрос.{" "}
          <Link to="/profile?tab=history" className="underline font-medium" style={{ color: "var(--accent)" }}>
            Пополнить баланс
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || generate.isPending}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <Wand2 size={20} />
            {generate.isPending ? "Считаю..." : "Узнать вкус"}
          </button>
          {limitInfo && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {limitInfo.freeRequestsLeft > 0 ? (
                <>Осталось бесплатных: {limitInfo.freeRequestsLeft} из 5</>
              ) : (
                <>
                  <Wallet size={12} /> Баланс: {balanceRub} ₽ · {costRub} ₽ за запрос
                </>
              )}
            </span>
          )}
        </div>
      )}

      {generate.isPending && (
        <div className="mt-4">
          <BottleThinkingIndicator label="Прикидываю вкус..." />
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-xl p-5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1 mb-2 text-xs font-medium" style={{ color: "var(--accent)" }}>
            <Sparkles size={14} /> Ответ ИИ
          </div>
          <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
            {result.answer}
          </p>
          {result.similarRecipes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs w-full mb-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Похожие рецепты на сайте:
              </span>
              {result.similarRecipes.map((r) => (
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
          <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
            >
              <RotateCcw size={14} /> Сформировать заново
            </button>
            <Link to="/tools?tool=forecast" className="text-sm underline" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
              Не удалось учесть все условия? Опишите рецепт в свободной форме →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes taste-builder-shake-kf {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .shake-btn {
          animation: taste-builder-shake-kf 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   MAIN: Tools Page
   ============================================================ */
const tools = [
  {
    id: "taste",
    num: "01",
    icon: Wand2,
    title: "Калькулятор вкуса",
    desc: "Соберите настойку из кнопок — основа, ингредиенты, добавки — и узнайте, что вероятно получится по вкусу, цвету и аромату.",
    badge: "Главный инструмент",
    color: "var(--accent)",
    content: <TasteBuilder />,
  },
  {
    id: "forecast",
    num: "02",
    icon: Compass,
    title: "Прогноз настойки",
    desc: "Опишите идею или ингредиенты свободным текстом — для случаев, которые не покрыть кнопками калькулятора.",
    badge: null,
    color: "var(--accent)",
    content: <InfusionForecast />,
  },
  {
    id: "abv",
    num: "03",
    icon: Calculator,
    title: "Расчёт крепости",
    desc: "Точный расчёт крепости напитка с учётом всех параметров, которые обычно игнорирует ареометр.",
    badge: null,
    color: "var(--accent)",
    content: <AbvCalculator />,
  },
];
export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState("taste");
  const [searchParams] = useSearchParams();

  /* Прямая ссылка на конкретную вкладку — /tools?tool=abv и т.п. */
  useEffect(() => {
    const tool = searchParams.get("tool");
    if (tool === "taste" || tool === "forecast" || tool === "abv") {
      setActiveTool(tool);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== Hero ===== */}
      <PageHero
        icon={Sparkles}
        badgeText="Инструменты"
        title={<>Инструменты <span style={{ color: "var(--accent)" }}>проекта</span></>}
        subtitle="Базовые инструменты бесплатны. ИИ-консультант доступен после регистрации — 5 бесплатных запросов на аккаунт, дальше 2 ₽ с баланса."
      />

      {/* ===== Tab Navigation ===== */}
      <section className="sticky top-16 z-30 py-4" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium whitespace-nowrap transition-all hover:scale-[1.02]"
                style={{
                  background: activeTool === tool.id ? "var(--accent)" : "var(--bg-card)",
                  color: activeTool === tool.id ? "#fff" : "var(--text-secondary)",
                  border: activeTool === tool.id ? "none" : "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <tool.icon size={28} />
                <span className="hidden sm:inline">{tool.title.split(" ").slice(0, 2).join(" ")}</span>
                <span className="sm:hidden">{tool.num}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tool Content ===== */}
      <section className="py-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {tools.map((tool) => {
            if (tool.id !== activeTool) return null;
            return (
              <div key={tool.id}>
                <div
                  className="rounded-2xl overflow-hidden mb-6"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: "var(--surface)" }}
                      >
                        <tool.icon size={28} style={{ color: "var(--accent)" }} />
                      </div>
                      <div>
                        {tool.badge && (
                          <div
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mb-1"
                            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                          >
                            <Sparkles size={10} />
                            {tool.badge}
                          </div>
                        )}
                        <h2
                          className="text-xl font-bold"
                          style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                        >
                          {tool.title}
                        </h2>
                      </div>
                    </div>
                    <p
                      className="text-base mb-6"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                    >
                      {tool.desc}
                    </p>

                    <div
                      className="rounded-xl p-5"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                    >
                      {tool.content}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    ИИ-консультант доступен после регистрации: 5 бесплатных запросов на аккаунт,
                    дальше 2 ₽ за запрос с баланса личного кабинета.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
