import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import PageHero from "@/components/PageHero";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";
import { AiHonestNote, AiActionNote, ANSWER_LABEL } from "@/components/AiHints";
import {
  Sparkles,
  History,
  Scale,
  Wheat,
  FlaskConical,
  Beaker,
  Thermometer,
  Droplet,
  Flame,
  Gauge,
  AlertTriangle,
  Info,
  Send,
  MessageCircleQuestion,
  LogIn,
  Wallet,
  ArrowRight,
  Wine,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Контент страницы — статический хардкод, по тому же принципу, что
   RulesPage.tsx / AboutPage.tsx. Ничего не тянется из БД: это редакторский
   лонгрид, а не пользовательский контент.

   Стиль сверен с RulesPage.tsx — единая карточка везде (var(--bg-card) +
   1px solid var(--border), без теней), иконки в кружке var(--surface) с
   цветом var(--accent), кнопки var(--accent). Никаких индивидуальных цветов
   по этапам — на сайте так нигде не делают.

   ИИ-советники по каждому этапу — работают через api/distillerConsultRouter.ts
   (три system-промпта, requestType вида distiller_mash/distiller_first_run/
   distiller_second_run в уже существующей ai_conversations, без новой схемы).
   ───────────────────────────────────────────────────────────────────────── */

type StageId = "mash" | "first-run" | "second-run";

const stages: {
  id: StageId;
  icon: typeof Wheat;
  num: string;
  title: string;
  subtitle: string;
  blocks: { heading: string; icon: typeof Wheat; text: string }[];
}[] = [
  {
    id: "mash",
    icon: Wheat,
    num: "01",
    title: "Брага",
    subtitle: "Ферментация — превращаем сахар в спирт",
    blocks: [
      {
        heading: "Биология процесса",
        icon: FlaskConical,
        text: `В основе браги — дрожжи, одноклеточные грибы рода Saccharomyces. В присутствии сахара и без доступа кислорода (анаэробное брожение) они расщепляют глюкозу на этиловый спирт и углекислый газ — именно поэтому брага «булькает» через гидрозатвор. Побочные продукты этого процесса — сивушные масла, эфиры, альдегиды — не бракованные примеси, а неизбежная часть биохимии брожения; их количество зависит от температуры, штамма дрожжей и того, насколько сильно вы «кормите» дрожжи сахаром. Именно эти побочные вещества потом придётся разделять на втором перегоне — брага сама по себе их не производит «зря», это нормальная часть процесса.`,
      },
      {
        heading: "Компоненты",
        icon: Beaker,
        text: `Три базовых типа браги. Сахарная — вода, сахар, дрожжи: самая простая и предсказуемая, но и самая «нейтральная» по вкусу, с наибольшей долей сивушных масел на литр спирта относительно других видов. Зерновая — крахмал злаков сначала нужно перевести в сахар (осахаривание солодом или ферментами при определённой температуре), сложнее в приготовлении, зато даёт характерный «хлебный» дистиллят. Фруктовая/ягодная — использует собственный сахар сырья, часто без добавления культурных дрожжей (на диких), даёт самый выраженный аромат сырья, но менее предсказуема по срокам и выходу. Ориентировочный выход: около 0,5–0,6 л спирта-сырца на кг сахара в браге, на практике обычно чуть меньше из-за потерь.`,
      },
      {
        heading: "Сроки",
        icon: Thermometer,
        text: `Обычно брожение занимает от 4 до 14 дней в зависимости от температуры, штамма дрожжей и количества сахара — при более тёплой погоде (24–28°C) процесс идёт быстрее, при прохладной (18–20°C) медленнее, но чище по вкусу. Признаки готовности: гидрозатвор перестал пускать пузыри (или перчатка сдулась), брага на вкус горчит без сладости, на поверхности почти нет пены, а сама жидкость частично осветлилась и на дне появился осадок. Если сомневаетесь — лучше выдержать на день-два дольше, чем снять рано: неперебродивший остаточный сахар — это упущенный выход спирта, а не проблема для перегонки как таковой.`,
      },
      {
        heading: "Частые ошибки и советы",
        icon: Info,
        text: `Держите стабильную температуру — резкие перепады «глушат» дрожжи или провоцируют посторонние привкусы. Не открывайте ёмкость без необходимости — лишний кислород после начала брожения повышает риск скисания (уксуснокислые бактерии) и порчи вкуса. Гидрозатвор — не декорация: без него в брагу могут попасть дикие микроорганизмы. Для зерновой и фруктовой браги важно не спешить с осахариванием/подготовкой сырья — пропущенный температурный шаг сильно снижает итоговый выход. И главное: брага, которая пахнет уксусом или плесенью — это не «перегоним и станет нормально», такую лучше не использовать.`,
      },
    ],
  },
  {
    id: "first-run",
    icon: Flame,
    num: "02",
    title: "Первый перегон",
    subtitle: "Спирт-сырец — отделяем спирт от воды и барды",
    blocks: [
      {
        heading: "Принцип и оборудование",
        icon: FlaskConical,
        text: `Для первого перегона обычно достаточно самой простой схемы — прямоточного дистиллятора: куб (ёмкость для нагрева браги) → трубка для пара → холодильник (змеевик, погружённый в проточную или сменяемую холодную воду) → приёмная ёмкость. Никаких дополнительных узлов на этом этапе не требуется — здесь не стоит задача точно разделить фракции, только максимально полно и быстро извлечь спирт из браги.`,
      },
      {
        heading: "Физика процесса",
        icon: Thermometer,
        text: `Этанол кипит при 78,4°C, вода — при 100°C, поэтому при нагреве браги пар обогащается спиртом сильнее, чем жидкость в кубе. Пар поднимается по трубке, попадает в холодильник, где резко охлаждается и конденсируется обратно в жидкость — на выходе получается «спирт-сырец», уже заметно крепче исходной браги, но ещё далеко не чистый: в нём вода, спирт и вся гамма сопутствующих веществ вперемешку. Именно поэтому одного перегона недостаточно — простое кипячение не даёт химически чистого разделения фракций, только концентрацию.`,
      },
      {
        heading: "Рекомендации",
        icon: Gauge,
        text: `Гнать можно быстро — задача первого перегона не точность, а скорость и полнота отбора. Отбор обычно ведут до тех пор, пока крепость выходящей струи не упадёт примерно до 20–30%, дальше продолжать нерентабельно — в кубе останется в основном вода. Для зерновой и фруктовой браги важно не допустить пригара: твёрдые частицы на дне могут подгореть от прямого нагрева и испортить вкус всего дистиллята — здесь помогает пароводяная баня, специальная мешалка или предварительное процеживание браги.`,
      },
      {
        heading: "Советы",
        icon: Info,
        text: `Периодически проверяйте крепость выходящей струи спиртометром — это подскажет, когда пора остановиться. Готовый спирт-сырец лучше сразу отфильтровать и дать отстояться пару дней — так осядет часть взвеси и сивушных масел, что облегчит работу на втором перегоне. Не оставляйте работающий аппарат без присмотра — при нагреве браги возможны выбросы пены (особенно у зерновых и фруктовых), а спиртовые пары огнеопасны: обеспечьте вентиляцию и не подносите источник открытого огня к месту выхода пара (для газовых плит это особенно актуально, индукция и ТЭН в этом смысле безопаснее).`,
      },
    ],
  },
  {
    id: "second-run",
    icon: Droplet,
    num: "03",
    title: "Второй перегон",
    subtitle: "Разделение на фракции — очищаем и получаем чистый дистиллят",
    blocks: [
      {
        heading: "Принцип и оборудование",
        icon: FlaskConical,
        text: `К базовой схеме часто добавляют сухопарник — промежуточную ёмкость между кубом и холодильником, которая задерживает часть капель и лёгких сивушных масел, не давая им напрямую попасть в дистиллят. Более продвинутые аппараты используют дефлегматор — узел частичного возврата пара (флегмы) обратно в колонну, который повышает крепость и чистоту выходящего продукта за счёт своеобразной внутренней «многократной перегонки» пара на месте.`,
      },
      {
        heading: "Дополнительное оборудование",
        icon: Beaker,
        text: `Сухопарник — простая ёмкость-ловушка на пути пара, снижает количество брызг и части примесей в готовом продукте. Дефлегматор (частичный конденсатор с регулируемым отбором) — заметно повышает крепость и чистоту дистиллята, характерен для колонных аппаратов. Термометр в колонне — не строго обязателен, но сильно облегчает точное определение момента отбора хвостов по температуре в кубе/колонне. Спиртометр (ареометр) — обязателен для контроля крепости на каждом этапе отбора.`,
      },
      {
        heading: "Физика процесса",
        icon: Thermometer,
        text: `Спирт-сырец перед вторым перегоном обычно разбавляют водой примерно до 15–20% крепости — при такой концентрации разные летучие вещества испаряются последовательно, а не одновременно, что и делает возможным разделение на фракции. Первыми выходят «головы» — легкокипящие соединения (ацетон, эфиры, следы метанола и другие), затем «тело» — основная масса этанола, ради которой всё и делается, и в конце «хвосты» — более тяжёлые сивушные масла с высокой температурой кипения.`,
      },
      {
        heading: "Контрольные процедуры",
        icon: Gauge,
        text: `Головы отбирают медленно, на минимальной мощности нагрева, и обычно ориентируются на объём: примерно 5–12% от содержания абсолютного спирта в перегоняемом объёме (считается по итоговой крепости и объёму спирта-сырца). Дополнительный ориентир — резкий, «ацетоновый» запах головной фракции, который заметно отличается от более мягкого запаха тела. Головы никогда не используют для питья — только для технических нужд, и отбирают их в отдельную, обязательно подписанную ёмкость. Тело отбирают, пока крепость струи держится в районе 45% и выше и запах остаётся чистым; переход к хвостам обычно определяют по падению крепости ниже ~40–45% и/или по появлению характерного «сивушного» запаха.`,
      },
      {
        heading: "Рекомендации",
        icon: Info,
        text: `Точность важнее скорости — особенно на границах фракций, где лучше отбирать медленно и почаще пробовать/нюхать. Хвосты не обязательно выбрасывать — их можно сохранить и добавить в следующую партию браги перед первым перегоном, чтобы не терять содержащийся в них спирт. Держите под рукой чистую воду для разбавления готового дистиллята до питьевой крепости — большинство напитков разбавляют уже после отбора, а не гонят сразу до нужного градуса.`,
      },
    ],
  },
];

/* ─── Общая схема процесса ───
   Раньше — SVG-прямоугольники с текстом (три этапа + "Дистиллят" четвёртым в той же
   линейке блоков). Два недостатка: строгие подписанные прямоугольники со стрелками
   выглядят как школьная схема из учебника, не в духе остального сайта, а дистиллят —
   не этап процесса наравне с остальными, а его РЕЗУЛЬТАТ, и стоять в одном ряду с
   этапами ему не место.
   Теперь: три этапа — пиктограммы (те же иконки, что и на табах ниже: Wheat/Flame/
   Droplet — единообразие, а не новый визуальный язык), соединённые лёгкой стрелкой.
   Дистиллят — отдельная выделенная карточка после отдельной стрелки-указателя "на
   выходе", крупнее и цветнее (заливка var(--accent) вместо обводки), чтобы читалось
   как "вот что получится в итоге", а не "четвёртый шаг". */
function ProcessOverviewDiagram() {
  const steps: { icon: typeof Wheat; label: string; sub: string; isResult?: boolean }[] = [
    { icon: Wheat, label: "Брага", sub: "ферментация" },
    { icon: Flame, label: "Первый перегон", sub: "спирт-сырец" },
    { icon: Droplet, label: "Второй перегон", sub: "разделение фракций" },
    // Дистиллят — не этап, а результат, но в линейке стоит четвёртым: отличает
    // его не позиция, а цвет (заливка var(--accent) вместо обводки, ниже) и то,
    // что подпись под ним — просто "готовый продукт", без объяснений.
    { icon: Wine, label: "Дистиллят", sub: "готовый продукт", isResult: true },
  ];
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between w-full gap-8 sm:gap-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-col sm:flex-row items-center w-full sm:w-auto sm:flex-1">
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div
              className="rounded-full flex items-center justify-center shrink-0"
              style={{
                width: "clamp(88px, 12vw, 128px)",
                height: "clamp(88px, 12vw, 128px)",
                background: s.isResult ? "var(--accent)" : "var(--surface)",
                border: s.isResult ? "none" : "1px solid var(--border)",
              }}
            >
              <s.icon size="42%" style={{ color: s.isResult ? "#fff" : "var(--accent)" }} />
            </div>
            <div className="text-center">
              <div className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                {s.label}
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                {s.sub}
              </div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight
              size={22}
              className="shrink-0 my-2 sm:my-0 sm:mx-2 rotate-90 sm:rotate-0"
              style={{ color: "var(--border)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
/* ─── «Спросить винокура» по этапу — тот же паттерн, что RecipeAiConsult ─── */
type ChatMessage = { role: "user" | "assistant"; content: string };

function DistillerAiConsult({ stage, stageTitle }: { stage: StageId; stageTitle: string }) {
  const { isLoggedIn } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [restored, setRestored] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: limitInfo, refetch: refetchLimit } = trpc.distillerConsult.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const { data: lastConversation } = trpc.distillerConsult.getLastConversation.useQuery(
    { stage },
    { enabled: isLoggedIn }
  );

  useEffect(() => {
    setRestored(false);
    setMessages([]);
    setConversationId(undefined);
  }, [stage]);

  useEffect(() => {
    if (!restored && lastConversation) {
      setMessages(lastConversation.messages as ChatMessage[]);
      setConversationId(lastConversation.id);
      setRestored(true);
    }
  }, [lastConversation, restored]);

  const generate = trpc.distillerConsult.generate.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
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
  }, [messages.length, generate.isPending]);

  function handleAsk() {
    const q = question.trim();
    if (!q || generate.isPending) return;
    setError("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(nextMessages);
    setQuestion("");
    generate.mutate({ stage, message: q, history: messages.slice(-10), conversationId });
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Спросить винокура: «{stageTitle}»
        </h3>
        <p className="text-base mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Расскажите про своё оборудование, сырьё и что пошло не так — и получите конкретный совет именно под вашу ситуацию.
          Для этого нужна бесплатная регистрация: первые 5 советов в подарок.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login?mode=register" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
            <LogIn size={18} /> Зарегистрироваться бесплатно
          </Link>
          <Link to="/login" className="text-sm underline" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
            Уже есть аккаунт? Войти
          </Link>
        </div>
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
          Спросить винокура: «{stageTitle}»
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
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Расскажите про своё оборудование и ситуацию — чем точнее опишете, тем конкретнее будет совет.
        </p>
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
            </div>
          ))}
          {generate.isPending && <BottleThinkingIndicator />}
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
            placeholder="Опишите свою ситуацию..."
            className="flex-1 rounded-xl px-4 py-2.5 text-base outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            disabled={generate.isPending}
          />
          <button
            onClick={() => handleAsk()}
            disabled={!question.trim() || generate.isPending}
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

export default function VinokurPage() {
  const [activeStage, setActiveStage] = useState<StageId>(stages[0].id);
  const stage = stages.find((s) => s.id === activeStage)!;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <PageHero
        icon={Flame}
        badgeText="База знаний"
        title={<>Домашняя <span style={{ color: "var(--accent)" }}>перегонка</span></>}
        subtitle="Домашняя перегонка — от истории и закона до физики процесса и практики на каждом этапе: брага, первый перегон, второй перегон."
      />
      {/* История + правовое положение */}
      <section className="py-14" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <History size={20} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Немного истории
              </h2>
            </div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
              Перегонка как техника известна ещё с античности — изначально ей пользовались для получения
              эфирных масел и лекарств. Дистилляцию спиртосодержащих жидкостей для питья распространили
              средневековые алхимики и монастырские аптекари: получаемую «воду жизни» (aqua vitae) поначалу
              считали лекарством, а не напитком. На Руси перегонка хлебного вина известна примерно с XV века,
              и домашнее самогоноварение веками было естественной частью быта — с перерывами на периоды
              государственной монополии на спирт, включая уголовное преследование в СССР, отменённое к
              распаду Союза.
            </p>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Scale size={20} style={{ color: "var(--accent)" }} />
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Правовое положение сейчас
              </h2>
            </div>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
              Домашняя перегонка для личного потребления в России легальна и не требует лицензии — уголовная
              и административная ответственность за само самогоноварение отменены ещё в 1997–2002 годах.
              Под ответственность подпадает только сбыт алкоголя без лицензии (171-ФЗ, 143-ФЗ). При этом тема
              регулярно обсуждается в Госдуме — предлагались (но пока не приняты) ограничения на рекламу и
              розничную продажу аппаратов. Сам процесс перегонки для себя эти инициативы не затрагивают.
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              <Info size={14} />
              Сверено в августе 2026 — тема живая, при сомнениях проверяйте актуальное законодательство.
            </div>
          </div>
        </div>
      </section>

      {/* Общая схема процесса */}
      <section className="py-14" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Общая схема процесса
          </h2>
          <p className="text-base text-center mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Три больших этапа — от сырья до готового дистиллята. Каждый разобран подробно ниже.
          </p>
          <div className="rounded-2xl p-6 sm:p-10" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <ProcessOverviewDiagram />
          </div>
        </div>
      </section>

      {/* Этапы — табы */}
      <section className="py-14" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Табы выбора этапа */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {stages.map((s) => {
              const StageIcon = s.icon;
              const isActive = s.id === activeStage;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(s.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: isActive ? "var(--accent)" : "var(--bg-card)",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    border: isActive ? "none" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <StageIcon size={16} />
                  {s.num}. {s.title}
                </button>
              );
            })}
          </div>

          {/* Заголовок активного этапа */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: "var(--surface)" }}>
              <stage.icon size={26} style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {stage.title}
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              {stage.subtitle}
            </p>
          </div>

          {/* Подразделы */}
          <div className="space-y-5">
            {stage.blocks.map((block) => {
              const BlockIcon = block.icon;
              return (
                <div key={block.heading} className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--surface)" }}>
                      <BlockIcon size={16} style={{ color: "var(--accent)" }} />
                    </div>
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                      {block.heading}
                    </h3>
                  </div>
                  <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                    {block.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* «Спросить винокура»: сначала честный посыл про уникальность процесса, потом сам чат */}
          <div className="mt-10 space-y-4">
            <div className="rounded-2xl p-6 flex gap-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <Sparkles size={24} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <div>
                <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  Зачем здесь «Спросить винокура»
                </h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                  Схема получения дистиллята в общих чертах стандартна, но на практике каждый винокур выстраивает
                  свой собственный процесс — конкретные дрожжи, модель аппарата, самодельные насадки, свой способ
                  угольной очистки и десяток других нюансов. Уместить все эти тонкости в единый мануал невозможно,
                  да и бессмысленно — у каждого своя комбинация. Поэтому вместо ещё одной универсальной инструкции
                  мы сделали помощника: компьютерную программу с полной базой знаний по процессу. Вы описываете свою
                  ситуацию — она даёт конкретный совет именно под неё. Но помните: это всё-таки программа, и доверять
                  ей на 100% не стоит — относитесь к ответам как к мнению опытного собеседника, а не как к истине в
                  последней инстанции. Последнее слово всегда за вами.
                </p>
              </div>
            </div>
            <DistillerAiConsult stage={stage.id} stageTitle={stage.title} />
          </div>
        </div>
      </section>

      {/* Безопасность — тот же жёлтый стиль "Важно", что в Правилах */}
      <section className="py-14" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-6 flex gap-4" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
            <AlertTriangle size={24} style={{ color: "#92400e", flexShrink: 0 }} />
            <div>
              <h3 className="text-base font-bold mb-2" style={{ color: "#78350f", fontFamily: "var(--font-heading)" }}>
                Про безопасность — коротко
              </h3>
              <p className="text-base" style={{ color: "#78350f", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                Спиртовые пары огнеопасны — держите аппарат подальше от открытого огня и обеспечьте вентиляцию
                помещения. Никогда не пробуйте головную фракцию на вкус и не используйте её для питья — это
                технический продукт. Не оставляйте работающий аппарат без присмотра. И главное — мера: домашний
                дистиллят делают для удовольствия, а не для количества.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
