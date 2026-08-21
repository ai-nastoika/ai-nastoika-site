import {
  Shield,
  Sparkles,
  Lock,
  AlertTriangle,
  UserCheck,
  HelpCircle,
  MessageCircle,
  Heart,
  Zap,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { trpc } from "@/providers/trpc";

const rules = [
  {
    icon: UserCheck,
    title: "Возрастное ограничение",
    text: "Сайт предназначен для лиц, достигших 18 лет. При первом посещении запрашивается подтверждение возраста. Если вам нет 18 лет — пожалуйста, покиньте сайт. Мы не несём ответственности за нарушение этого правила.",
  },
  {
    icon: Sparkles,
    title: "ИИ-консультант по настойкам",
    text: "ИИ-инструмент — это ваш личный советник по домашним настойкам. Вы описываете свою идею (ингредиенты, пропорции, метод), а ИИ анализирует и даёт развёрнутый ответ: каким будет вкусовой профиль напитка, чем ваш рецепт отличается от классических вариантов, и как можно улучшить вкус. ИИ не создаёт рецепты для базы данных — все рецепты на сайте добавляются администрацией из проверенных источников.",
  },
  {
    icon: Zap,
    title: "Что именно даёт ИИ-запрос",
    text: "На основе вашего описания ИИ подготовит детальный анализ: вкусовой профиль — сладость, кислотность, горечь, острота, фруктовость, травянистость в числовом выражении; сравнение с классикой — как ваш рецепт отличается от традиционных вариантов этого напитка; рекомендации по улучшению — конкретные советы, что добавить, изменить или убрать для лучшего вкуса; сочетания — подходящие закуски, температуру подачи и бокал.",
  },
  {
    icon: Lock,
    title: "Конфиденциальность",
    text: "Мы не передаём персональные данные третьим лицам. Email используется только для входа и важных уведомлений. Пароли хранятся в зашифрованном виде (bcrypt). История ваших ИИ-запросов и операций по балансу видна только вам.",
  },
  {
    icon: Heart,
    title: "Поддержка проекта",
    text: "Проект «Ай, настойка» существует благодаря энтузиастам. Все базовые функции — рецепты, барная карта, комментарии, профиль — бесплатны и всегда будут бесплатны. Если вы хотите поддержать нас — донат. Это добровольное пожертвование, благодарность за понравившийся сервис — он не даёт никаких дополнительных привилегий или расширенных лимитов. Деньги идут на оплату сервера, API ИИ, разработку новых функций, а также на вознаграждение администратора и команды за работу над проектом.",
  },
  {
    icon: AlertTriangle,
    title: "Ответственность",
    text: "Рецепты и рекомендации носят информационный характер. Мы не несём ответственности за результат приготовления. Чрезмерное употребление алкоголя вредит вашему здоровью. Сайт не продаёт алкоголь — только делится рецептами и знаниями.",
  },
  {
    icon: Shield,
    title: "Контент сообщества",
    text: "Рецепты и отзывы публикуются пользователями. Модерация проводится постфактум. Если вы нашли некорректный контент — сообщите через форму обратной связи. Администрация оставляет за собой право удалять контент, нарушающий правила, без объяснения причин.",
  },
  {
    icon: MessageCircle,
    title: "Комментарии и общение",
    text: "Уважайте других участников сообщества. Запрещены оскорбления, нецензурная лексика, спам, реклама и троллинг. Администрация сайта оставляет за собой право удалять комментарии и блокировать пользователей без предупреждения по своему усмотрению. Все ваши комментарии сохраняются в истории активности вашего профиля.",
  },
  {
    icon: Clock,
    title: "Сроки хранения данных",
    text: "Рецепты, комментарии и профильные данные хранятся на сервере до удаления аккаунта. История ИИ-запросов хранится 90 дней. Чтобы удалить аккаунт и все связанные данные — нажмите кнопку «Удалить аккаунт» в настройках личного кабинета. Мы удалим всё в течение 7 рабочих дней.",
  },
];

/* ── Донат через ЮKassa прямо на сайте, без ухода на Boosty и без обязательной авторизации ── */
function DonateWidget() {
  const { data: info } = trpc.donation.info.useQuery();
  const [amount, setAmount] = useState<number | null>(null);
  const [name, setName] = useState("");

  const createDonation = trpc.donation.create.useMutation({
    onSuccess: (data) => {
      window.location.href = data.confirmationUrl;
    },
  });

  // Пока на сервере не настроены ключи ЮKassa — не показываем виджет, чтобы
  // не путать людей нерабочей кнопкой. Boosty-ссылка рядом продолжает работать.
  if (!info?.paymentsConfigured) return null;

  return (
    <div
      className="mt-6 rounded-xl p-5 max-w-sm mx-auto text-left"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        {info.presetsRub.map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className="rounded-lg py-2 text-sm font-medium transition-all"
            style={{
              background: amount === v ? "var(--accent)" : "var(--bg-primary)",
              color: amount === v ? "#fff" : "var(--text-primary)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-body)",
            }}
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
        className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
      />
      <button
        onClick={() => amount && createDonation.mutate({ amountRub: amount, name: name.trim() || undefined })}
        disabled={!amount || createDonation.isPending}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
      >
        {createDonation.isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Переходим к оплате...</>
        ) : (
          <><Heart size={16} /> Задонатить через ЮKassa</>
        )}
      </button>
      {createDonation.isError && (
        <p className="text-sm mt-2 text-center" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
          {createDonation.error.message}
        </p>
      )}
    </div>
  );
}

export default function RulesPage() {
  const navigate = useNavigate();
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
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Shield size={18} />
            Правила использования
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Правила, <span style={{ color: "var(--accent)" }}>честность</span> и поддержка
          </h1>
          <p
            className="text-base max-w-xl"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.75 }}
          >
            Мы стараемся быть максимально прозрачными: базовый функционал бесплатен и останется таким навсегда.
            ИИ — это консультант, а не генератор рецептов.
          </p>
        </div>
      </section>

      {/* ===== AI Consultant Description ===== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-10 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            ИИ-консультант по настойкам
          </h2>

          <div className="max-w-3xl mx-auto space-y-6">
            {/* Step 1 */}
            <div className="flex gap-5 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>1</div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Описываете свою идею</h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  Вы описываете рецепт, который хотите попробовать — ингредиенты, пропорции, метод настаивания, сроки. Чем подробнее описание, тем точнее будет анализ. Можете описать и существующий рецепт, чтобы понять, что получится.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-5 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>2</div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>ИИ анализирует и советует</h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  ИИ изучает ваше описание и готовит развёрнутый анализ: каким будет вкусовой профиль напитка по шести параметрам (сладость, кислотность, горечь, острота, фруктовость, травянистость); чем ваш рецепт отличается от классических вариантов этого напитка; конкретные рекомендации по улучшению вкуса — что добавить, убрать или изменить.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-5 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>3</div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Готовите с уверенностью</h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  Получив анализ, вы точно знаете, что получится, и можете скорректировать рецепт до начала настаивания. Экономия времени и ингредиентов — вместо месяца ожидания с непредсказуемым результатом вы получаете прогноз заранее.
                </p>
              </div>
            </div>
          </div>

          {/* Important note */}
          <div className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
            <p className="text-base" style={{ color: "#92400e", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              <strong>Важно:</strong> ИИ — это инструмент анализа и консультирования, а не генератор рецептов для базы данных. Все рецепты на сайте — это проверенные классические и народные рецепты, добавляемые администрацией из достоверных источников. ИИ помогает вам экспериментировать, но не заменяет традиционные знания.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Limits & Pricing ===== */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-10 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Лимиты и стоимость
          </h2>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Without registration */}
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Без регистрации</h3>
              <div className="text-3xl font-bold mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-heading)" }}>Недоступно</div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>ИИ-консультант только для аккаунтов</p>
              <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                Рецепты, барная карта и комментарии доступны без регистрации — а вот вопросы ИИ-консультанту только после входа в аккаунт.
              </p>
            </div>

            {/* With registration */}
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "2px solid var(--accent)" }}>
              <div className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-medium mb-3" style={{ background: "var(--accent)", color: "#fff" }}>
                <Zap size={14} /> Рекомендуем
              </div>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>После регистрации</h3>
              <div className="text-3xl font-bold mb-2" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>5 запросов</div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Бесплатно, разово на аккаунт</p>
              <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                Пять бесплатных вопросов ИИ-консультанту сразу после регистрации — не сгорают по дням, тратьте когда удобно.
              </p>
            </div>

            {/* Paid requests */}
            <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Сверх лимита</h3>
              <div className="text-3xl font-bold mb-2" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>2 ₽</div>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>За запрос, с баланса</p>
              <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                После пяти бесплатных — 2 ₽ за запрос, списываются с баланса личного кабинета. Баланс пополняется в профиле в любой момент.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Rules ===== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-10 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Правила использования
          </h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {rules.map((rule) => (
              <div
                key={rule.title}
                className="rounded-2xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--surface)" }}
                  >
                    <rule.icon size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <h3
                    className="text-base font-bold"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                  >
                    {rule.title}
                  </h3>
                </div>
                <p
                  className="text-base"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                >
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Donate CTA ===== */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Heart size={48} className="mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <h2
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Поддержать проект
          </h2>
          <p
            className="text-base mb-8"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.75 }}
          >
            Проект «Ай, настойка» существует благодаря энтузиастам. Все базовые функции — рецепты,
            барная карта, комментарии, профиль — бесплатны и всегда будут бесплатны.
            Ваш донат помогает оплачивать сервер, API нейросетей, разработку новых функций,
            а также идёт на вознаграждение администратора и команды за работу над проектом.
          </p>
          <button
            onClick={() => alert("Способ оплаты скоро появится — следите за обновлениями")}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-transform hover:scale-105"
            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            <Heart size={20} />
            Поддержать
          </button>

          <DonateWidget />

          <p className="text-sm mt-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Другие способы: <span style={{ color: "var(--accent)" }}>info@ai-nastoika.ru</span> или кнопка в шапке сайта
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-8 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Частые вопросы
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Обязательна ли регистрация?",
                a: "Для рецептов, барной карты, комментариев и части инструментов — нет, они доступны без регистрации. А вот ИИ-консультант доступен только после регистрации: 5 бесплатных запросов на аккаунт, дальше 2 ₽ за запрос с баланса. Личный кабинет с избранным тоже требует регистрации.",
              },
              {
                q: "Что такое ИИ-запрос?",
                a: "Это обращение к ИИ-консультанту. Вы описываете рецепт, который хотите попробовать, а ИИ анализирует его и даёт развёрнутый ответ: вкусовой профиль, отличия от классики, советы по улучшению. Один анализ = один запрос.",
              },
              {
                q: "Чем платный запрос отличается от бесплатного?",
                a: "Ничем, кроме оплаты — ИИ отвечает одинаково подробно в обоих случаях. 2 ₽ списываются только после того, как закончатся пять бесплатных запросов, выданных при регистрации.",
              },
              {
                q: "Откуда рецепты в базе?",
                a: "Все рецепты — проверенные классические и народные рецепты, добавляемые администрацией из достоверных источников. ИИ-консультант не создаёт рецепты для базы — он только анализирует ваши идеи.",
              },
              {
                q: "Где посмотреть остаток запросов?",
                a: "В личном кабинете, на вкладке «ИИ» — там показан баланс, сколько бесплатных запросов осталось и история операций.",
              },
              {
                q: "Что даёт донат?",
                a: "Донат — это добровольное пожертвование, благодарность за понравившийся сервис, а не оплата дополнительных возможностей. Никаких особых привилегий, расширенных лимитов или платных функций донат не даёт — все пользователи, оплатившие и не оплатившие донат, имеют одинаковый доступ к сайту. Собранные средства идут на оплату сервера и API нейросетей, разработку новых функций, а также на вознаграждение администратора и команды за работу над проектом.",
              },
              {
                q: "Как удалить аккаунт?",
                a: "Нажмите кнопку «Удалить аккаунт» в настройках личного кабинета — писать на почту не нужно. Мы удалим все данные в течение 7 рабочих дней.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="rounded-xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start gap-3">
                  <HelpCircle size={22} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div
                      className="text-base font-semibold mb-1"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                    >
                      {faq.q}
                    </div>
                    <div
                      className="text-base"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                    >
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Warning ===== */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-2xl p-6 flex items-start gap-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <AlertTriangle size={28} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <h3
                className="text-base font-bold mb-1"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
              >
                Важное напоминание
              </h3>
              <p
                className="text-base"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
              >
                Чрезмерное употребление алкоголя вредит вашему здоровью. Сайт предназначен
                исключительно для лиц старше 18 лет. Мы не продаём алкоголь — только делимся
                рецептами и знаниями. Пожалуйста, соблюдайте меру.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
