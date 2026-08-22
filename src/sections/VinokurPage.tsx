import { useState, type ComponentType } from "react";
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
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Контент страницы — статический хардкод, по тому же принципу, что
   RulesPage.tsx / AboutPage.tsx. Ничего не тянется из БД: это редакторский
   лонгрид, а не пользовательский контент. Если понадобится редактирование
   через админку — отдельная задача (нужна БД-таблица + UI), тут её
   сознательно нет.

   ИИ-советники по каждому этапу — следующая фаза (отдельный requestType в
   уже существующей ai_conversations на каждый этап, без новой схемы).
   Здесь только тизер-плашка "скоро" — компонент под замену, когда роутер
   будет готов.
   ───────────────────────────────────────────────────────────────────────── */

const stages = [
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
        text: `В основе браги — дрожжи, одноклеточные грибы рода Saccharomyces. В присутствии сахара и без доступа
кислорода (анаэробное брожение) они расщепляют глюкозу на этиловый спирт и углекислый газ — именно поэтому
брага «булькает» через гидрозатвор. Побочные продукты этого процесса — сивушные масла, эфиры, альдегиды —
не бракованные примеси, а неизбежная часть биохимии брожения; их количество зависит от температуры, штамма
дрожжей и того, насколько сильно вы «кормите» дрожжи сахаром. Именно эти побочные вещества потом придётся
разделять на втором перегоне — брага сама по себе их не производит «зря», это нормальная часть процесса.`,
      },
      {
        heading: "Компоненты",
        icon: Beaker,
        text: `Три базовых типа браги. Сахарная — вода, сахар, дрожжи: самая простая и предсказуемая, но и самая
«нейтральная» по вкусу, с наибольшей долей сивушных масел на литр спирта относительно других видов. Зерновая —
крахмал злаков сначала нужно перевести в сахар (осахаривание солодом или ферментами при определённой
температуре), сложнее в приготовлении, зато даёт характерный «хлебный» дистиллят. Фруктовая/ягодная — использует
собственный сахар сырья, часто без добавления культурных дрожжей (на диких), даёт самый выраженный аромат
сырья, но менее предсказуема по срокам и выходу. Ориентировочный выход: около 0,5–0,6 л спирта-сырца на кг
сахара в браге, на практике обычно чуть меньше из-за потерь.`,
      },
      {
        heading: "Сроки",
        icon: Thermometer,
        text: `Обычно брожение занимает от 4 до 14 дней в зависимости от температуры, штамма дрожжей и количества
сахара — при более тёплой погоде (24–28°C) процесс идёт быстрее, при прохладной (18–20°C) медленнее, но чище
по вкусу. Признаки готовности: гидрозатвор перестал пускать пузыри (или перчатка сдулась), брага на вкус
горчит без сладости, на поверхности почти нет пены, а сама жидкость частично осветлилась и на дне появился
осадок. Если сомневаетесь — лучше выдержать на день-два дольше, чем снять рано: неперебродивший остаточный
сахар — это упущенный выход спирта, а не проблема для перегонки как таковая.`,
      },
      {
        heading: "Частые ошибки и советы",
        icon: Info,
        text: `Держите стабильную температуру — резкие перепады «глушат» дрожжи или провоцируют посторонние
привкусы. Не открывайте ёмкость без необходимости — лишний кислород после начала брожения повышает риск
скисания (уксуснокислые бактерии) и порчи вкуса. Гидрозатвор — не декорация: без него в брагу могут попасть
дикие микроорганизмы. Для зерновой и фруктовой браги важно не спешить с осахариванием/подготовкой сырья —
пропущенный температурный шаг сильно снижает итоговый выход. И главное: брага, которая пахнет уксусом или
плесенью — это не «перегоним и станет нормально», такую лучше не использовать.`,
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
        heading: "Схема аппарата",
        icon: FlaskConical,
        text: `Для первого перегона обычно достаточно самой простой схемы — прямоточного дистиллятора: куб
(ёмкость для нагрева браги) → трубка для пара → холодильник (змеевик, погружённый в проточную или сменяемую
холодную воду) → приёмная ёмкость. Никаких дополнительных узлов на этом этапе не требуется — здесь не стоит
задача точно разделить фракции, только максимально полно и быстро извлечь спирт из браги.`,
        diagram: "first-run",
      },
      {
        heading: "Физика процесса",
        icon: Thermometer,
        text: `Этанол кипит при 78,4°C, вода — при 100°C, поэтому при нагреве браги пар обогащается спиртом
сильнее, чем жидкость в кубе. Пар поднимается по трубке, попадает в холодильник, где резко охлаждается и
конденсируется обратно в жидкость — на выходе получается «спирт-сырец», уже заметно крепче исходной браги,
но ещё далеко не чистый: в нём вода, спирт и вся гамма сопутствующих веществ вперемешку. Именно поэтому одного
перегона недостаточно — простое кипячение не даёт химически чистого разделения фракций, только концентрацию.`,
      },
      {
        heading: "Рекомендации",
        icon: Gauge,
        text: `Гнать можно быстро — задача первого перегона не точность, а скорость и полнота отбора. Отбор
обычно ведут до тех пор, пока крепость выходящей струи не упадёт примерно до 20–30%, дальше продолжать
нерентабельно — в кубе останется в основном вода. Для зерновой и фруктовой браги важно не допустить пригара:
твёрдые частицы на дне могут подгореть от прямого нагрева и испортить вкус всего дистиллята — здесь помогает
пароводяная баня, специальная мешалка или предварительное процеживание браги.`,
      },
      {
        heading: "Советы",
        icon: Info,
        text: `Периодически проверяйте крепость выходящей струи спиртометром — это подскажет, когда пора
остановиться. Готовый спирт-сырец лучше сразу отфильтровать и дать отстояться пару дней — так осядет часть
взвеси и сивушных масел, что облегчит работу на втором перегоне. Не оставляйте работающий аппарат без
присмотра — при нагреве браги возможны выбросы пены (особенно у зерновых и фруктовых), а спиртовые пары
огнеопасны, держите аппарат подальше от открытого огня в месте выхода пара.`,
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
        heading: "Схема аппарата",
        icon: FlaskConical,
        text: `Для второго перегона к базовой схеме часто добавляют сухопарник — промежуточную ёмкость между
кубом и холодильником, которая задерживает часть капель и лёгких сивушных масел, не давая им напрямую
попасть в дистиллят. Более продвинутые аппараты используют дефлегматор — узел частичного возврата пара
(флегмы) обратно в колонну, который повышает крепость и чистоту выходящего продукта за счёт своеобразной
внутренней «многократной перегонки» пара на месте.`,
        diagram: "second-run",
      },
      {
        heading: "Дополнительное оборудование",
        icon: Beaker,
        text: `Сухопарник — простая ёмкость-ловушка на пути пара, снижает количество брызг и части примесей
в готовом продукте. Дефлегматор (частичный конденсатор с регулируемым отбором) — заметно повышает крепость
и чистоту дистиллята, характерен для колонных аппаратов. Термометр в колонне — не строго обязателен, но
сильно облегчает точное определение момента отбора хвостов по температуре в кубе/колонне. Спиртометр
(ареометр) — обязателен для контроля крепости на каждом этапе отбора.`,
      },
      {
        heading: "Физика процесса",
        icon: Thermometer,
        text: `Спирт-сырец перед вторым перегоном обычно разбавляют водой примерно до 15–20% крепости — при
такой концентрации разные летучие вещества испаряются последовательно, а не одновременно, что и делает
возможным разделение на фракции. Первыми выходят «головы» — легкокипящие соединения (ацетон, эфиры, следы
метанола и другие), затем «тело» — основная масса этанола, ради которой всё и делается, и в конце «хвосты» —
более тяжёлые сивушные масла с высокой температурой кипения.`,
      },
      {
        heading: "Контрольные процедуры",
        icon: Gauge,
        text: `Головы отбирают медленно, на маленьком огне, и обычно ориентируются на объём: примерно 5–12%
от содержания абсолютного спирта в перегоняемом объёме (считается по итоговой крепости и объёму спирта-сырца).
Дополнительный ориентир — резкий, «ацетоновый» запах головной фракции, который заметно отличается от более
мягкого запаха тела. Головы никогда не используют для питья — только для технических нужд, и отбирают их
в отдельную, обязательно подписанную ёмкость. Тело отбирают, пока крепость струи держится в районе 45% и
выше и запах остаётся чистым; переход к хвостам обычно определяют по падению крепости ниже ~40–45% и/или
по появлению характерного «сивушного» запаха.`,
      },
      {
        heading: "Рекомендации",
        icon: Info,
        text: `Точность важнее скорости — особенно на границах фракций, где лучше отбирать медленно и почаще
пробовать/нюхать. Хвосты не обязательно выбрасывать — их можно сохранить и добавить в следующую партию браги
перед первым перегоном, чтобы не терять содержащийся в них спирт. Держите под рукой чистую воду для разбавления
готового дистиллята до питьевой крепости — большинство напитков разбавляют уже после отбора, а не гонят сразу
до нужного градуса.`,
      },
    ],
  },
];

/* ─── Простые встроенные SVG-схемы аппаратов (без внешних картинок) ─── */

function ProcessOverviewDiagram() {
  const steps = [
    { label: "Брага", sub: "ферментация" },
    { label: "Первый перегон", sub: "спирт-сырец" },
    { label: "Второй перегон", sub: "разделение фракций" },
    { label: "Дистиллят", sub: "готовый продукт" },
  ];
  return (
    <svg viewBox="0 0 900 160" className="w-full h-auto" style={{ maxWidth: "100%" }}>
      {steps.map((s, i) => {
        const x = 20 + i * 220;
        return (
          <g key={s.label}>
            <rect
              x={x}
              y={40}
              width={180}
              height={80}
              rx={14}
              fill="var(--bg-card)"
              stroke={i === steps.length - 1 ? "var(--accent)" : "var(--border)"}
              strokeWidth={i === steps.length - 1 ? 2 : 1.5}
            />
            <text x={x + 90} y={78} textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--text-primary)">
              {s.label}
            </text>
            <text x={x + 90} y={100} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
              {s.sub}
            </text>
            {i < steps.length - 1 && (
              <path
                d={`M ${x + 185} 80 L ${x + 213} 80`}
                stroke="var(--accent)"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
            )}
          </g>
        );
      })}
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)" />
        </marker>
      </defs>
    </svg>
  );
}

function FirstRunDiagram() {
  return (
    <svg viewBox="0 0 500 220" className="w-full h-auto max-w-md mx-auto">
      {/* Куб */}
      <rect x="30" y="100" width="130" height="90" rx="10" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5" />
      <text x="95" y="150" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--text-primary)">Куб</text>
      <text x="95" y="168" textAnchor="middle" fontSize="11" fill="var(--text-muted)">брага + нагрев</text>
      {/* Пламя */}
      <path d="M85 195 q10 -15 0 -25 q10 10 15 0 q-2 20 -15 25 Z" fill="var(--accent)" opacity="0.6" />

      {/* Трубка пара */}
      <path d="M160 115 L 260 60" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* Холодильник (змеевик) */}
      <rect x="255" y="20" width="70" height="130" rx="10" fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth="1.5" />
      <path
        d="M270 30 q15 10 0 20 q15 10 0 20 q15 10 0 20 q15 10 0 20 q15 10 0 20 q15 10 0 20"
        stroke="var(--accent)"
        strokeWidth="3"
        fill="none"
      />
      <text x="290" y="12" textAnchor="middle" fontSize="11" fill="var(--text-muted)">холодильник</text>

      {/* Выход в приёмник */}
      <path d="M290 150 L 290 175" stroke="var(--border)" strokeWidth="4" />
      <ellipse cx="290" cy="195" rx="35" ry="18" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="290" y="199" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)">спирт-сырец</text>
    </svg>
  );
}

function SecondRunDiagram() {
  return (
    <svg viewBox="0 0 560 220" className="w-full h-auto max-w-lg mx-auto">
      {/* Куб */}
      <rect x="20" y="100" width="120" height="90" rx="10" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5" />
      <text x="80" y="148" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text-primary)">Куб</text>
      <text x="80" y="165" textAnchor="middle" fontSize="10" fill="var(--text-muted)">разбавленный сырец</text>
      <path d="M70 195 q10 -15 0 -25 q10 10 15 0 q-2 20 -15 25 Z" fill="var(--accent)" opacity="0.6" />

      {/* Труба к сухопарнику */}
      <path d="M140 115 L 190 90" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* Сухопарник */}
      <rect x="185" y="55" width="60" height="55" rx="10" fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth="1.5" />
      <text x="215" y="45" textAnchor="middle" fontSize="10" fill="var(--text-muted)">сухопарник</text>

      {/* Труба к дефлегматору */}
      <path d="M245 80 L 300 55" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* Дефлегматор */}
      <rect x="295" y="20" width="55" height="60" rx="10" fill="var(--bg-secondary)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="322" y="12" textAnchor="middle" fontSize="10" fill="var(--text-muted)">дефлегматор</text>

      {/* Труба к холодильнику */}
      <path d="M350 45 L 400 45" stroke="var(--border)" strokeWidth="6" fill="none" strokeLinecap="round" />

      {/* Холодильник */}
      <rect x="395" y="20" width="60" height="120" rx="10" fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth="1.5" />
      <path
        d="M410 30 q15 8 0 16 q15 8 0 16 q15 8 0 16 q15 8 0 16 q15 8 0 16 q15 8 0 16 q15 8 0 16"
        stroke="var(--accent)"
        strokeWidth="3"
        fill="none"
      />
      <text x="425" y="12" textAnchor="middle" fontSize="10" fill="var(--text-muted)">холодильник</text>

      {/* Выход в приёмник + термометр */}
      <path d="M425 140 L 425 165" stroke="var(--border)" strokeWidth="4" />
      <ellipse cx="425" cy="185" rx="38" ry="18" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="425" y="189" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-primary)">головы→тело→хвосты</text>

      <rect x="140" y="70" width="8" height="35" rx="3" fill="var(--bg-secondary)" stroke="var(--accent)" strokeWidth="1" />
      <text x="144" y="65" textAnchor="middle" fontSize="9" fill="var(--text-muted)">t°</text>
    </svg>
  );
}

const diagrams: Record<string, ComponentType> = {
  "first-run": FirstRunDiagram,
  "second-run": SecondRunDiagram,
};

/* ─── ИИ-советник — тизер, роутер ещё не подключён ─── */
function AiAdvisorTeaser({ stageTitle }: { stageTitle: string }) {
  return (
    <div
      className="rounded-2xl p-6 flex items-center gap-4"
      style={{ background: "var(--bg-secondary)", border: "1px dashed var(--border)" }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "var(--surface)" }}
      >
        <Sparkles size={20} style={{ color: "var(--accent)" }} />
      </div>
      <div className="flex-1">
        <div className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          ИИ-советник по разделу «{stageTitle}»
        </div>
        <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Скоро здесь можно будет задать вопрос про свою конкретную ситуацию — пока раздел в разработке.
        </div>
      </div>
    </div>
  );
}

export default function VinokurPage() {
  const [activeStage, setActiveStage] = useState(stages[0].id);
  const stage = stages.find((s) => s.id === activeStage)!;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-6"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Flame size={20} />
            База знаний
          </div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Винокур
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
            Домашняя перегонка — от истории и закона до физики процесса и практики на каждом этапе:
            брага, первый перегон, второй перегон.
          </p>
        </div>
      </section>

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
          <div className="rounded-2xl p-6 overflow-x-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
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
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {stage.title}
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              {stage.subtitle}
            </p>
          </div>

          {/* Схема аппарата (если есть на этом этапе) */}
          {stage.blocks.some((b) => b.diagram) && (
            <div className="rounded-2xl p-6 mb-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {(() => {
                const diagramKey = stage.blocks.find((b) => b.diagram)?.diagram;
                const Diagram = diagramKey ? diagrams[diagramKey] : null;
                return Diagram ? <Diagram /> : null;
              })()}
            </div>
          )}

          {/* Подразделы */}
          <div className="space-y-5">
            {stage.blocks.map((block) => {
              const BlockIcon = block.icon;
              return (
                <div key={block.heading} className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <BlockIcon size={18} style={{ color: "var(--accent)" }} />
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                      {block.heading}
                    </h3>
                  </div>
                  <p className="text-base whitespace-pre-line" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                    {block.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ИИ-советник тизер */}
          <div className="mt-8">
            <AiAdvisorTeaser stageTitle={stage.title} />
          </div>
        </div>
      </section>

      {/* Безопасность — общий блок под всеми этапами */}
      <section className="py-14" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-6 flex gap-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <AlertTriangle size={24} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Про безопасность — коротко
              </h3>
              <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
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
