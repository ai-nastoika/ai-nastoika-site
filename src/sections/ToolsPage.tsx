import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router";
import QRCode from "qrcode";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";
import {
  Wand2,
  Calculator,
  Tag,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
  Download,
  ArrowLeft,
  Star,
  LogIn,
  Wallet,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   SUB-COMPONENT: AI Taste Calculator
   Требует логина — тарификация общая с recipeConsult/infusionConsult
   (5 бесплатных запросов на аккаунт, дальше 2 ₽ с баланса). См. api/tasteCalculatorRouter.ts.
   Разговорный чат с историей — так же, как RecipeAiConsult.tsx.
   ============================================================ */
type TasteChatMessage = { role: "user" | "assistant"; content: string };

const TASTE_SUGGESTIONS = [
  "Есть вишня и мёд, что посоветуете?",
  "Хочу что-то освежающее и не приторное",
  "Настаиваю на самогоне — с чем лучше сочетается?",
  "Как получить красивый янтарный цвет?",
];

function TasteCalculator() {
  const { isLoggedIn } = useAuth();
  const [messages, setMessages] = useState<TasteChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [restored, setRestored] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      setConversationId(data.conversationId);
      setError("");
      refetchLimit();
    },
    onError: (err) => {
      setError(err.message || "Не удалось получить ответ");
      refetchLimit();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, generate.isPending]);

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
              onClick={() => { setMessages([]); setConversationId(undefined); setError(""); }}
              className="text-xs underline"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              Начать заново
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
                  ? { background: "var(--surface)", color: "var(--text-primary)", marginLeft: "12%", fontFamily: "var(--font-body)" }
                  : { background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", marginRight: "12%", fontFamily: "var(--font-body)", lineHeight: 1.65 }
              }
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  <Sparkles size={14} /> Ответ ИИ
                </div>
              )}
              {m.content}
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
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={messages.length === 0 ? "Например: вишня, ваниль, корица..." : "Продолжите разговор..."}
            className="flex-1 rounded-xl px-4 py-2.5 text-base outline-none"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            disabled={generate.isPending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!message.trim() || generate.isPending}
            className="rounded-xl px-4 flex items-center justify-center text-white disabled:opacity-50"
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
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Volume */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Объём спирта (мл)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setVolume, volume, -100)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setVolume, volume, 100)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Initial ABV */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Крепость спирта (%)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setInitialAbv, initialAbv, -1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={initialAbv}
              onChange={(e) => setInitialAbv(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setInitialAbv, initialAbv, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Sugar */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Сахар (г)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setSugar, sugar, -10)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={sugar}
              onChange={(e) => setSugar(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setSugar, sugar, 10)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Water */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <label className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Добавлено воды (мл)
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => adjust(setWater, water, -50)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Minus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
            <input
              type="number"
              value={water}
              onChange={(e) => setWater(Number(e.target.value))}
              className="flex-1 text-center bg-transparent text-lg font-bold outline-none"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            />
            <button onClick={() => adjust(setWater, water, 50)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <Plus size={22} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Infusion period */}
        <div
          className="rounded-xl p-4"
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
          className="rounded-xl p-4 sm:col-span-2"
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
          className="rounded-xl p-4 sm:col-span-2"
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
                <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: 1.65, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
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

/* ═══════════════════════════════════════════════════════════════
   LABEL SIZES: standard bottle label sizes (mm)
   ═══════════════════════════════════════════════════════════════ */
const LABEL_SIZES = [
  { name: "90 × 120 мм", w: 90, h: 120, perA4: 4, layout: "2×2", desc: "Универсальная" },
  { name: "60 × 80 мм", w: 60, h: 80, perA4: 9, layout: "3×3", desc: "Микро" },
];

/* ═══════════════════════════════════════════════════════════════
   20 LABEL TEMPLATES — image-based
   ═══════════════════════════════════════════════════════════════ */
const TEMPLATES: Array<{ id: number; name: string; family: string; border: string; bg: string; decor: string; accent: string; image: string | null }> = [];

function getFontFamily(family: string) {
  switch (family) {
    case "serif": return '"Playfair Display", Georgia, serif';
    case "sans": return '"Inter", system-ui, sans-serif';
    case "mono": return '"Courier New", monospace';
    case "cursive": return '"Georgia", serif';
    default: return '"Inter", sans-serif';
  }
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENT: Label Constructor
   ═══════════════════════════════════════════════════════════════ */
// Small canvas component for A4 preview
function A4LabelCanvas({ width, height, scale, paintFn }: {
  width: number; height: number; scale: number;
  paintFn: (canvas: HTMLCanvasElement, scale: number) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const canvas = document.createElement("canvas");
    paintFn(canvas, scale);
    // Wait for async image loads (bg image + user image)
    setTimeout(() => {
      setDataUrl(canvas.toDataURL("image/png"));
    }, 600);
  }, [paintFn, scale]);

  if (!dataUrl) {
    return <div style={{ width, height, background: "#f5f5f5", display: "block" }} />;
  }

  return (
    <img
      src={dataUrl}
      style={{ width, height, display: "block", pageBreakInside: "avoid" }}
      alt="этикетка"
    />
  );
}

function LabelConstructor({ editData }: { editData?: any }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateId, setTemplateId] = useState(1);
  const [labelText, setLabelText] = useState("");
  const [labelDate, setLabelDate] = useState("");
  const [labelStrength, setLabelStrength] = useState("");
  const [sizeIdx, setSizeIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [savedLabelId, setSavedLabelId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [imageShape, setImageShape] = useState<"rect" | "rounded" | "oval" | "circle">("rect");
  const [imageZoneScale, setImageZoneScale] = useState(1.0);
  const [showCropper, setShowCropper] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropScale, setCropScale] = useState(1);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const cropPinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 2) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = (ev) => openCropperWithSrc(ev.target?.result as string);
          reader.readAsDataURL(file);
          break;
        }
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [step]);

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setCropOffset({ x: 0, y: 0 });
      setCropScale(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openCropperWithSrc(src: string) {
    setCropSrc(src);
    setCropOffset({ x: 0, y: 0 });
    setCropScale(1);
    setShowCropper(true);
  }

  function drawCropper() {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const S = 400;
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, S, S);

    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(0, 0, S, S);
    for (let r = 0; r < S / 20; r++) for (let c = 0; c < S / 20; c++) {
      if ((r + c) % 2 === 0) { ctx.fillStyle = "#f0f0f0"; ctx.fillRect(c*20, r*20, 20, 20); }
    }

    const iw = img.naturalWidth * cropScale;
    const ih = img.naturalHeight * cropScale;
    const ix = (S - iw) / 2 + cropOffset.x;
    const iy = (S - ih) / 2 + cropOffset.y;
    ctx.drawImage(img, ix, iy, iw, ih);

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, S, S);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    if (imageShape === "circle") {
      ctx.arc(S/2, S/2, S/2 - 4, 0, Math.PI*2);
    } else if (imageShape === "oval") {
      const base = S/2 - 4;
      ctx.ellipse(S/2, S/2, base * 0.62, base, 0, 0, Math.PI*2);
    } else if (imageShape === "rounded") {
      const r = S * 0.3;
      ctx.moveTo(4+r, 4); ctx.arcTo(S-4, 4, S-4, S-4, r);
      ctx.arcTo(S-4, S-4, 4, S-4, r); ctx.arcTo(4, S-4, 4, 4, r);
      ctx.arcTo(4, 4, S-4, 4, r); ctx.closePath();
    } else {
      ctx.rect(4, 4, S-8, S-8);
    }
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (imageShape === "circle") {
      ctx.arc(S/2, S/2, S/2-4, 0, Math.PI*2);
    } else if (imageShape === "oval") {
      const base = S/2 - 4;
      ctx.ellipse(S/2, S/2, base * 0.62, base, 0, 0, Math.PI*2);
    } else if (imageShape === "rounded") {
      const r = S * 0.3;
      ctx.moveTo(4+r, 4); ctx.arcTo(S-4, 4, S-4, S-4, r);
      ctx.arcTo(S-4, S-4, 4, S-4, r); ctx.arcTo(4, S-4, 4, 4, r);
      ctx.arcTo(4, 4, S-4, 4, r); ctx.closePath();
    } else {
      ctx.rect(4, 4, S-8, S-8);
    }
    ctx.stroke();
  }


  function applyCrop() {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const S = 400;
    const out = document.createElement("canvas");
    out.width = S; out.height = S;
    const ctx = out.getContext("2d")!;

    ctx.beginPath();
    if (imageShape === "circle") ctx.arc(S/2, S/2, S/2, 0, Math.PI*2);
    else if (imageShape === "oval") { const base = S/2; ctx.ellipse(S/2, S/2, base * 0.62, base, 0, 0, Math.PI*2); }
    else if (imageShape === "rounded") {
      const r = S * 0.3;
      ctx.moveTo(r, 0); ctx.arcTo(S, 0, S, S, r); ctx.arcTo(S, S, 0, S, r);
      ctx.arcTo(0, S, 0, 0, r); ctx.arcTo(0, 0, S, 0, r); ctx.closePath();
    } else {
      ctx.rect(0, 0, S, S);
    }
    ctx.clip();

    const iw = img.naturalWidth * cropScale;
    const ih = img.naturalHeight * cropScale;
    const ix = (S - iw) / 2 + cropOffset.x;
    const iy = (S - ih) / 2 + cropOffset.y;
    ctx.drawImage(img, ix, iy, iw, ih);

    setUserImage(out.toDataURL("image/png"));
    setShowCropper(false);
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (!editData) return;
    setTemplateId(editData.templateId || 1001);
    setLabelText(editData.labelText || "");
    setLabelDate(editData.labelDate || "");
    setLabelStrength(editData.labelStrength || "");
    setImageShape(editData.imageShape || "rect");
    setImageZoneScale(Number(editData.imageZoneScale) || 1);
    setSavedLabelId(editData.id);
    setStep(2);
  }, [editData]);

  useEffect(() => {
    if (showCropper && cropImgRef.current?.complete) drawCropper();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropOffset, cropScale, imageShape, showCropper]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || step !== 2) return;
    paintCanvas(canvas, 0.3, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, labelText, labelDate, labelStrength, templateId, sizeIdx, userImage, imageShape, imageZoneScale]);

  useEffect(() => {
    const canvas = modalCanvasRef.current;
    if (!canvas || !showPreviewModal) return;
    paintCanvas(canvas, 0.65, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewModal, labelText, labelDate, labelStrength, templateId, userImage, imageShape, imageZoneScale]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("label-recipe-data");
      if (raw) {
        const data = JSON.parse(raw) as { title: string; slug: string };
        setLabelText(data.title);
        setLabelDate(""); setLabelStrength("");
        QRCode.toDataURL(`${window.location.origin}/#/recipe/${data.slug}`, {
          width: 120,
          margin: 1,
          color: { dark: "#5a3a1a", light: "#ffffff" },
        }).then((url: string) => setQrDataUrl(url));
        localStorage.removeItem("label-recipe-data");
      }
    } catch { /* ignore */ }
  }, []);

  const { isLoggedIn } = useAuth();
  const { data: dbTemplates } = trpc.labelTemplate.list.useQuery();
  const saveLabelMutation = trpc.savedLabels.save.useMutation({
    onSuccess: (data) => { setSavedLabelId(data.id); setIsSaving(false); },
    onError: () => setIsSaving(false),
  });
  const deleteLabelMutation = trpc.savedLabels.delete.useMutation({
    onSuccess: () => setSavedLabelId(null),
  });
  const allTemplates = [
    ...TEMPLATES,
    ...(dbTemplates ?? [])
      .filter(t => t.isActive === 1)
      .map(t => ({
        id: t.id + 1000,
        name: t.name,
        family: t.fontFamily ?? "serif",
        border: t.border ?? "2px solid #8B4513",
        bg: t.bg ?? "linear-gradient(135deg,#faf6f0,#f5efe6)",
        decor: "none",
        accent: t.accent ?? "#8B4513",
        image: t.image ?? null,
        zones: t.zones ?? null,
        isBase: (t as any).isBase ?? 0,
      })),
  ];

  const tpl = allTemplates.find((t) => t.id === templateId) ?? allTemplates[0];
  const isEditable = !!tpl && (tpl as any).isBase === 1;
  const sz = LABEL_SIZES[sizeIdx];

  const scale = Math.min(1, 340 / Math.max(sz.w, sz.h));
  const prevW = Math.round(sz.w * scale);
  const prevH = Math.round(sz.h * scale);

  function paintCanvas(canvas: HTMLCanvasElement, sc: number, guides: boolean = false) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const CW = Math.round(1086 * sc);
    const CH = Math.round(1448 * sc);
    canvas.width = CW;
    canvas.height = CH;
    ctx.clearRect(0, 0, CW, CH);

    function drawZones() {
      const zones = (tpl as any).zones as Array<{id: string, x: number, y: number, w: number, h: number, fontSize: number, align: string}> | null;
      const activeZones = zones && zones.length > 0 ? zones : [
        { id: "title",    x: 190, y: 1120, w: 706, h: 80,  fontSize: 68, align: "center" },
        { id: "date",     x: 270, y: 1260, w: 200, h: 60,  fontSize: 48, align: "center" },
        { id: "strength", x: 580, y: 1260, w: 200, h: 60,  fontSize: 48, align: "center" },
      ];
      activeZones.forEach(zone => {
        if (zone.id === "image") return;
        const zx = Math.round(zone.x * sc);
        const zy = Math.round(zone.y * sc);
        const zw = Math.round(zone.w * sc);
        const fs = Math.round(zone.fontSize * sc);
        const zh = Math.round(zone.h * sc);
        ctx.font = "bold " + fs + "px serif";
        ctx.fillStyle = tpl.accent || "#8B4513";
        ctx.textAlign = (zone.align as CanvasTextAlign) || "center";
        ctx.textBaseline = "middle";
        const text = zone.id === "title" ? (labelText || "")
          : zone.id === "date" ? labelDate
          : zone.id === "strength" ? labelStrength
          : "";
        if (text) {
          const tx = zone.align === "center" ? zx + zw / 2 : zone.align === "right" ? zx + zw : zx;
          const words = text.split(" ");
          let line = "";
          const lines: string[] = [];
          words.forEach(word => {
            const test = line + word + " ";
            if (ctx.measureText(test).width > zw && line) { lines.push(line.trim()); line = word + " "; }
            else { line = test; }
          });
          lines.push(line.trim());
          let lineY = zy + (zh - lines.length * fs * 1.3) / 2 + fs * 0.7;
          lines.forEach(l => { ctx.fillText(l, tx, lineY, zw); lineY += fs * 1.3; });
        }
      });
    }

    const imgZone = ((tpl as any).zones as any[] | null)?.find((z: any) => z.id === "image");

    // Строит путь формы (без клипа/обводки) — общая геометрия для клипа фото
    // и для пунктирной рамки-подсказки в превью
    function buildShapePath(zx: number, zy: number, zw: number, zh: number) {
      ctx.beginPath();
      if (imageShape === "circle") {
        const r = Math.min(zw, zh) / 2;
        ctx.arc(zx + zw / 2, zy + zh / 2, r, 0, Math.PI * 2);
      } else if (imageShape === "oval") {
        // Вытянутый вертикально овал, а не просто копия круга
        const base = Math.min(zw, zh) / 2;
        ctx.ellipse(zx + zw / 2, zy + zh / 2, base * 0.62, base, 0, 0, Math.PI * 2);
      } else if (imageShape === "rounded") {
        const r = Math.min(zw, zh) * 0.3; // заметно скруглённые углы
        ctx.moveTo(zx + r, zy);
        ctx.arcTo(zx + zw, zy, zx + zw, zy + zh, r);
        ctx.arcTo(zx + zw, zy + zh, zx, zy + zh, r);
        ctx.arcTo(zx, zy + zh, zx, zy, r);
        ctx.arcTo(zx, zy, zx + zw, zy, r);
        ctx.closePath();
      } else {
        ctx.rect(zx, zy, zw, zh);
      }
    }

    function applyShapeClip(zx: number, zy: number, zw: number, zh: number) {
      buildShapePath(zx, zy, zw, zh);
      ctx.clip();
    }

    // Пунктирная рамка зоны вставки — только для превью (guides=true),
    // никогда не попадает в скачанный файл или печать на А4
    function drawZoneOutline(zx: number, zy: number, zw: number, zh: number) {
      ctx.save();
      buildShapePath(zx, zy, zw, zh);
      ctx.setLineDash([Math.max(4, 10 * sc), Math.max(3, 6 * sc)]);
      ctx.lineWidth = Math.max(1.5, 2 * sc);
      ctx.strokeStyle = tpl.accent || "#8B4513";
      ctx.stroke();
      ctx.restore();
    }

    function drawUserImage(preloaded: HTMLImageElement | null) {
      if (!imgZone) return;
      const baseW = imgZone.w * sc;
      const baseH = imgZone.h * sc;
      const baseCX = imgZone.x * sc + baseW / 2;
      const baseCY = imgZone.y * sc + baseH / 2;
      const scaledW = baseW * imageZoneScale;
      const scaledH = baseH * imageZoneScale;
      const zx = Math.round(baseCX - scaledW / 2);
      const zy = Math.round(baseCY - scaledH / 2);
      const zw = Math.round(scaledW);
      const zh = Math.round(scaledH);
      if (preloaded) {
        ctx.save();
        applyShapeClip(zx, zy, zw, zh);
        const ratio = Math.min(zw / preloaded.width, zh / preloaded.height);
        const dw = Math.round(preloaded.width * ratio);
        const dh = Math.round(preloaded.height * ratio);
        const dx = zx + Math.round((zw - dw) / 2);
        const dy = zy + Math.round((zh - dh) / 2);
        ctx.drawImage(preloaded, dx, dy, dw, dh);
        ctx.restore();
      }
      if (guides && !preloaded) {
        drawZoneOutline(zx, zy, zw, zh);
      }
    }

    function doRender(preloadedUser: HTMLImageElement | null) {
      // Заливаем фон заранее — некоторые PNG-шаблоны хранят фон прозрачным
      // (только рамка/узоры непрозрачны), без этой заливки сквозь них
      // просвечивает страница сайта вместо кремового фона.
      // Важно: tpl.bg может быть CSS-градиентом ("linear-gradient(...)"),
      // а Canvas такие строки не понимает и молча оставит чёрный — поэтому
      // здесь всегда используем гарантированно безопасный сплошной цвет.
      ctx.fillStyle = "#faf6f0";
      ctx.fillRect(0, 0, CW, CH);

      if (tpl.image) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { ctx.drawImage(img, 0, 0, CW, CH); drawUserImage(preloadedUser); drawZones(); };
        img.onerror = () => { drawUserImage(preloadedUser); drawZones(); };
        img.src = tpl.image;
      } else {
        drawUserImage(preloadedUser);
        drawZones();
      }
    }

    if (userImage) {
      const uImg = new Image();
      uImg.onload = () => doRender(uImg);
      uImg.src = userImage;
    } else {
      doRender(null);
    }
  }

  function handlePrint() {
    setQuantity(1);
    setStep(3);
  }

  function handleSaveLabel() {
    setIsSaving(true);
    const canvas = document.createElement("canvas");
    paintCanvas(canvas, 0.15);
    setTimeout(() => {
      const previewUrl = canvas.toDataURL("image/jpeg", 0.6);
      saveLabelMutation.mutate({
        id: savedLabelId ?? undefined,
        templateId,
        labelText,
        labelDate,
        labelStrength,
        imageShape,
        imageZoneScale: String(imageZoneScale),
        previewUrl,
      });
    }, 700);
  }

  function doDownload() {
    const canvas = document.createElement("canvas");
    paintCanvas(canvas, 1.0);
    setTimeout(() => {
      const link = document.createElement("a");
      link.download = (labelText || "этикетка") + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }, 500);
  }

  function handleDownload() {
    if (!isEditable) { doDownload(); return; }
    const emptyFields = [];
    if (!labelText.trim()) emptyFields.push("Название напитка");
    if (!labelDate.trim()) emptyFields.push("Дата");
    if (!labelStrength.trim()) emptyFields.push("Крепость");
    if (emptyFields.length > 0) {
      setShowEmptyWarning(true);
    } else {
      doDownload();
    }
  }

  function handleClear() {
    setLabelText("");
    setLabelDate("");
    setLabelStrength("");
    setUserImage(null);
    setImageShape("rect");
    setImageZoneScale(1.0);
  }

  function TemplateCard({ t }: { t: typeof allTemplates[0] }) {
    return (
      <button
        key={t.id}
        onClick={() => { setTemplateId(t.id); setStep(2); }}
        className="rounded-xl p-3 text-center transition-all hover:scale-[1.03]"
        style={{
          background: t.bg,
          border: t.id === templateId ? `2px solid ${t.accent}` : "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="mx-auto mb-2 rounded flex items-center justify-center text-center overflow-hidden"
          style={{
            width: 72, height: 90,
            border: t.border,
            background: t.image ? undefined : t.bg,
            fontFamily: getFontFamily(t.family),
            color: t.accent,
            fontSize: 8, fontWeight: "bold", lineHeight: 1.2,
          }}
        >
          {t.image ? (
            <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <div><div style={{ fontSize: 14, marginBottom: 4 }}>Aa</div><div style={{ fontSize: 7, opacity: 0.7 }}>{t.name}</div></div>
          )}
        </div>
        <div className="text-xs font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
          {t.name}
        </div>
      </button>
    );
  }

  if (!tpl) {
    return (
      <div className="py-12 text-center">
        <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Загружаю шаблоны...
        </p>
      </div>
    );
  }

  /* Step 1: Choose template — плоский список, без группировки по типам */
  if (step === 1) {
    return (
      <div>
        <p className="text-base mb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          Выберите шаблон этикетки.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {allTemplates.map(t => <TemplateCard key={t.id} t={t} />)}
        </div>
      </div>
    );
  }

  /* Step 2, НЕ базовый шаблон — статичная картинка, без редактора */
  /* Step 2: Edit text + preview (базовый шаблон) */
  if (step === 2) {
    return (
      <div>
        {showEmptyWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full" style={{ background: "var(--bg-card)" }}>
              <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Не все поля заполнены
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                {[
                  !labelText.trim() && "• Название напитка",
                  !labelDate.trim() && "• Дата",
                  !labelStrength.trim() && "• Крепость",
                ].filter(Boolean).map((item, i) => (
                  <div key={i}>{item}</div>
                ))}
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Скачать пустую этикетку или вернуться и заполнить?
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEmptyWarning(false); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                >
                  Заполнить
                </button>
                <button
                  onClick={() => { setShowEmptyWarning(false); doDownload(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
                >
                  Скачать как есть
                </button>
              </div>
            </div>
          </div>
        )}

        {showCropper && cropSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: "var(--bg-card)", maxWidth: 480, width: "100%" }}>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Настройте расположение фото
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Тяните фото · Два пальца — масштаб
              </div>
              <canvas
                ref={cropCanvasRef}
                width={400} height={400}
                style={{ borderRadius: 12, cursor: "grab", maxWidth: "100%", touchAction: "none" }}
                onMouseDown={(e) => {
                  cropDragRef.current = { startX: e.clientX, startY: e.clientY, ox: cropOffset.x, oy: cropOffset.y };
                }}
                onMouseMove={(e) => {
                  if (!cropDragRef.current) return;
                  const dx = e.clientX - cropDragRef.current.startX;
                  const dy = e.clientY - cropDragRef.current.startY;
                  setCropOffset({ x: cropDragRef.current.ox + dx, y: cropDragRef.current.oy + dy });
                }}
                onMouseUp={() => { cropDragRef.current = null; }}
                onMouseLeave={() => { cropDragRef.current = null; }}
                onWheel={(e) => {
                  e.preventDefault();
                  setCropScale(s => Math.max(0.1, Math.min(5, s - e.deltaY * 0.0003)));
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (e.touches.length === 1) {
                    cropDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, ox: cropOffset.x, oy: cropOffset.y };
                    cropPinchRef.current = null;
                  } else if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    cropPinchRef.current = { dist, scale: cropScale };
                    cropDragRef.current = null;
                  }
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  if (e.touches.length === 1 && cropDragRef.current) {
                    const dx = e.touches[0].clientX - cropDragRef.current.startX;
                    const dy = e.touches[0].clientY - cropDragRef.current.startY;
                    setCropOffset({ x: cropDragRef.current.ox + dx, y: cropDragRef.current.oy + dy });
                  } else if (e.touches.length === 2 && cropPinchRef.current) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const ratio = dist / cropPinchRef.current.dist;
                    setCropScale(Math.max(0.1, Math.min(5, cropPinchRef.current.scale * ratio)));
                  }
                }}
                onTouchEnd={() => { cropDragRef.current = null; cropPinchRef.current = null; }}
              />
              <img ref={cropImgRef} src={cropSrc} style={{ display: "none" }}
                onLoad={() => {
                  const img = cropImgRef.current!;
                  const S = 400;
                  const fit = Math.max(S / img.naturalWidth, S / img.naturalHeight);
                  setCropScale(fit);
                  drawCropper();
                }}
              />
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowCropper(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Отмена
                </button>
                <button onClick={applyCrop} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  Применить
                </button>
              </div>
            </div>
          </div>
        )}

        {showPreviewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setShowPreviewModal(false)}
          >
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="absolute -top-10 right-0 text-white text-sm opacity-70 hover:opacity-100"
                style={{ fontFamily: "var(--font-body)" }}
              >
                ✕ Закрыть
              </button>
              <canvas
                ref={modalCanvasRef}
                className="rounded-xl"
                style={{
                  maxWidth: "70vw",
                  maxHeight: "70vh",
                  boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                }}
              />
            </div>
          </div>
        )}
        <button
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-2 text-sm mb-5 px-4 py-2 rounded-xl transition-all hover:opacity-80"
          style={{ color: "var(--accent)", fontFamily: "var(--font-body)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={16} />
          Назад к шаблонам
        </button>

        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 2fr" }}>
          <div className="space-y-4">
            {isEditable && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    Название напитка
                  </label>
                  <input
                    type="text"
                    value={labelText}
                    onChange={(e) => setLabelText(e.target.value)}
                    placeholder="Например: Вишнёвка бабушкина"
                    className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      Дата
                    </label>
                    <input
                      type="text"
                      value={labelDate}
                      onChange={(e) => setLabelDate(e.target.value)}
                      placeholder="Например: 2025"
                      className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      Крепость
                    </label>
                    <input
                      type="text"
                      value={labelStrength}
                      onChange={(e) => setLabelStrength(e.target.value)}
                      placeholder="Например: 40"
                      className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                    />
                  </div>
                </div>
              </>
            )}

            {(tpl as any).zones?.some((z: any) => z.id === "image") && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Фото / иллюстрация
                </label>
                <div className="flex gap-2 items-center">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm text-left transition-all"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
                  >
                    {userImage ? "✓ Фото загружено" : "📁 Выбрать файл или Ctrl+V"}
                  </button>
                  {userImage && (
                    <button onClick={() => setUserImage(null)} className="text-sm px-3 py-2 rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  {([
                    { id: "rect",    label: "⬛ Квадрат"  },
                    { id: "rounded", label: "▢ Скруглён"  },
                    { id: "oval",    label: "⬭ Овал"      },
                    { id: "circle",  label: "⬤ Круг"      },
                  ] as const).map(s => (
                    <button key={s.id} onClick={() => setImageShape(s.id)}
                      className="flex-1 text-xs py-1.5 rounded-lg transition-all"
                      style={{ background: imageShape === s.id ? "var(--accent)" : "var(--bg-secondary)", color: imageShape === s.id ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-body)", border: "none" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      Размер зоны
                    </label>
                    <span className="text-xs font-medium" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                      {Math.round(imageZoneScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50} max={150} step={1}
                    value={Math.round(imageZoneScale * 100)}
                    onChange={(e) => setImageZoneScale(Number(e.target.value) / 100)}
                    className="w-full"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    <span>50%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Размер этикетки
              </label>
              <div className="flex flex-wrap gap-2">
                {LABEL_SIZES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSizeIdx(i)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: sizeIdx === i ? "var(--accent)" : "var(--surface)",
                      color: sizeIdx === i ? "#fff" : "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                    }}
                    title={`${s.desc} — ${s.layout} на листе А4`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                На листе А4 поместится: <strong>{sz.perA4} шт</strong> ({sz.layout})
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={handleSaveLabel}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-all hover:scale-105"
                    style={{
                      background: savedLabelId ? "var(--accent)" : "var(--bg-secondary)",
                      color: savedLabelId ? "#fff" : "var(--text-secondary)",
                      border: savedLabelId ? "none" : "1px solid var(--border)",
                      fontFamily: "var(--font-body)"
                    }}
                  >
                    <Star size={20} fill={savedLabelId ? "#fff" : "none"} />
                    {isSaving ? "Сохраняю..." : savedLabelId ? "Обновить" : "В избранное"}
                  </button>
                  {savedLabelId && (
                    <button
                      onClick={() => deleteLabelMutation.mutate({ id: savedLabelId })}
                      className="px-3 py-3 rounded-xl text-sm transition-all hover:opacity-70"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                      title="Удалить из избранного"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => window.location.href = "/#/login"}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-all hover:opacity-80"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  <Star size={20} />
                  Войдите чтобы сохранить
                </button>
              )}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <Download size={22} />
                Скачать PNG
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                🖨️ На А4
              </button>
              {isEditable && (
                <button
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base transition-all hover:opacity-80"
                  style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  ✕ Очистить
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 24, minHeight: 400 }}>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Нажмите на этикетку для увеличения
            </p>
            <canvas
              ref={canvasRef}
              onClick={() => setShowPreviewModal(true)}
              className="cursor-zoom-in hover:scale-[1.02] transition-transform rounded-lg"
              style={{
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                maxWidth: "100%",
                maxHeight: 480,
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* Step 3: Print layout */
  const maxQ = sz.perA4;

  const A4_W = 630;
  const A4_H = 891;
  const PX_PER_MM = 3;
  const labelW = sz.w * PX_PER_MM;
  const labelH = sz.h * PX_PER_MM;
  const cols = Math.floor((A4_W - 20) / (labelW + 8));
  const rows = Math.floor((A4_H - 20) / (labelH + 8));
  const maxFit = cols * rows;
  const printQty = Math.min(quantity, maxFit);
  const labelScale = labelW / 1086;

  return (
    <div>
      <button
        onClick={() => setStep(2)}
        className="inline-flex items-center gap-2 text-sm mb-5 px-4 py-2 rounded-xl transition-all hover:opacity-80"
        style={{ color: "var(--accent)", fontFamily: "var(--font-body)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        ← Назад к редактированию
      </button>

      <div className="mb-5">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Сколько этикеток на листе А4 (макс. {maxFit})
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxFit }, (_, i) => i + 1).map((q) => (
            <button
              key={q}
              onClick={() => setQuantity(q)}
              className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
              style={{
                background: quantity === q ? "var(--accent)" : "var(--surface)",
                color: quantity === q ? "#fff" : "var(--text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 overflow-auto">
        <div
          style={{
            width: A4_W,
            height: A4_H,
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            position: "relative",
            flexShrink: 0,
            margin: "0 auto",
          }}
        >
          <div style={{ position: "absolute", inset: 0, border: "1px solid #ddd", pointerEvents: "none" }} />
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${labelW}px)`,
            gap: 8,
          }}>
            {Array.from({ length: printQty }, (_, i) => (
              <A4LabelCanvas
                key={i}
                width={labelW}
                height={labelH}
                scale={labelScale}
                paintFn={paintCanvas}
              />
            ))}
          </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          const A4_PX_W = 2480;
          const A4_PX_H = 3508;
          const margin = 120;
          const gap = 40;
          const labW = Math.floor((A4_PX_W - margin * 2 - gap * (cols - 1)) / cols);
          const labH = Math.floor(labW * (1448 / 1086));
          const labScale = labW / 1086;

          const a4 = document.createElement("canvas");
          a4.width = A4_PX_W;
          a4.height = A4_PX_H;
          const ctx = a4.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, A4_PX_W, A4_PX_H);

          const totalW = labW * cols + gap * (cols - 1);
          const startX = Math.round((A4_PX_W - totalW) / 2);
          const totalH = labH * Math.ceil(printQty / cols) + gap * (Math.ceil(printQty / cols) - 1);
          const startY = Math.round((A4_PX_H - totalH) / 2);

          let drawn = 0;
          const drawNext = () => {
            if (drawn >= printQty) {
              const img = document.createElement("img");
              img.src = a4.toDataURL("image/png");
              img.style.cssText = "width:100%;height:auto;";
              const win = window.open("", "_blank");
              if (!win) return;
              win.document.write(`<!DOCTYPE html><html><head><style>
                body{margin:0;padding:0;}
                img{display:block;width:100%;height:auto;}
                @media print{@page{size:A4 portrait;margin:0;}}
              </style></head><body>`);
              win.document.write(img.outerHTML);
              win.document.write(`</body></html>`);
              win.document.close();
              setTimeout(() => win.print(), 500);
              return;
            }
            const col = drawn % cols;
            const row = Math.floor(drawn / cols);
            const x = startX + col * (labW + gap);
            const y = startY + row * (labH + gap);

            const tempCanvas = document.createElement("canvas");
            paintCanvas(tempCanvas, labScale);
            setTimeout(() => {
              ctx.drawImage(tempCanvas, x, y, labW, labH);
              drawn++;
              drawNext();
            }, 650);
          };
          drawNext();
        }}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
      >
        <Download size={22} />
        Печать {printQty} этикет{printQty === 1 ? "ки" : printQty < 5 ? "ки" : "ок"} на А4
      </button>
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
    title: "Калькулятор вкуса с ИИ",
    desc: "Опишите идею или выберите ингредиенты — ИИ составит рецептуру, расскажет о вкусовом профиле и предложит варианты.",
    badge: "Главный инструмент",
    color: "var(--accent)",
    content: <TasteCalculator />,
  },
  {
    id: "abv",
    num: "02",
    icon: Calculator,
    title: "Расчёт крепости",
    desc: "Точный расчёт крепости напитка с учётом всех параметров, которые обычно игнорирует ареометр.",
    badge: null,
    color: "var(--accent)",
    content: <AbvCalculator />,
  },
  {
    id: "label",
    num: "03",
    icon: Tag,
    title: "Моя этикетка",
    desc: "Выберите готовый шаблон из коллекции, впишите название напитка и подпись — скачайте для печати на А4.",
    badge: "Популярное",
    color: "var(--accent)",
    content: null, // replaced dynamically
  },
  {
    id: "generate",
    num: "04",
    icon: Sparkles,
    title: "Сгенерировать этикетку",
    desc: "ИИ создаст уникальную этикетку по вашему описанию. Укажите стиль, цвета, элементы — или доверьтесь ИИ.",
    badge: "ИИ",
    color: "var(--accent)",
    content: <LabelGeneratorPromo />,
  },
];

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENT: Label Generator Promo (inside Tools page)
   ═══════════════════════════════════════════════════════════════ */
function LabelGeneratorPromo() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-bold mb-3" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
          Уникальная этикетка за 3 шага
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>1</div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              Опишите желаемый дизайн — стиль (винтаж, минимализм, хохлома), цветовая гамма, элементы (цветы, геометрия, орнаменты). Или просто дайте ИИ свободу.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>2</div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              ИИ генерирует уникальную этикетку. Вы получаете готовое изображение, которое можно редактировать — добавить текст, название, крепость, дату.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>3</div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              Скачайте в нужном размере и распечатайте на А4. Можно разместить до 6-9 этикеток на одном листе.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Что умеет ИИ-генератор
        </h3>
        <ul className="text-base space-y-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          <li>• Создаёт уникальный дизайн по текстовому описанию</li>
          <li>• Поддерживает любой стиль: от русской хохломы до киберпанка</li>
          <li>• Добавляет орнаменты, рамки, фоны, текстуры</li>
          <li>• Создаёт этикетки с пустым центром для вашего текста</li>
          <li>• Адаптирует дизайн под размер бутылки</li>
        </ul>
      </div>

      <a
        href="/#/tools/generate-label"
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
      >
        <Sparkles size={22} />
        Перейти к генерации
      </a>

      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        Генерация этикеток — платная услуга. Стоимость: от 15 рублей за этикетку. Для генерации требуется авторизация.
      </p>
    </div>
  );
}

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState("taste");
  const [editLabelData, setEditLabelData] = useState<any>(null);
  const navigate = useNavigate();

  /* Auto-select label tab when coming from recipe page or profile */
  useEffect(() => {
    const hash = window.location.hash;
    const savedEdit = sessionStorage.getItem("edit-label");
    if (savedEdit) {
      sessionStorage.removeItem("edit-label");
      try {
        const data = JSON.parse(savedEdit);
        setEditLabelData(data);
        setActiveTool("label");
      } catch {}
    } else if (hash.includes("?label") || hash.includes("label")) {
      setActiveTool("label");
      if (hash !== "#/tools") window.location.hash = "#/tools";
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={18} /> Назад
          </button>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Sparkles size={22} />
            Все инструменты в одном месте
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Инструменты <span style={{ color: "var(--accent)" }}>проекта</span>
          </h1>
          <p
            className="text-lg max-w-xl"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
          >
            Базовые инструменты бесплатны. ИИ-консультант доступен после регистрации —
            5 бесплатных запросов на аккаунт, дальше 2 ₽ с баланса.
          </p>
        </div>
      </section>

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
                      {tool.id === "label" ? <LabelConstructor editData={editLabelData} /> : tool.content}
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
