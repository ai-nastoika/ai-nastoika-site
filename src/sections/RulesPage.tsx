import {
  Shield,
  Sparkles,
  Check,
  X,
  CreditCard,
  Lock,
  AlertTriangle,
  UserCheck,
  HelpCircle,
  MessageCircle,
} from "lucide-react";

const tiers = [
  {
    name: "Без регистрации",
    price: "0\u20BD",
    period: "",
    features: [
      "Просмотр всех рецептов",
      "Чтение обсуждений",
      "Барная карта",
      "2 пробных ИИ-запроса",
    ],
    notIncluded: [
      "История запросов",
      "Расширенные ИИ-модели",
    ],
    cta: "Начать",
    popular: false,
  },
  {
    name: "Регистрация",
    price: "0\u20BD",
    period: "",
    features: [
      "Все рецепты без ограничений",
      "Барная карта",
      "5 ИИ-запросов / день",
      "История запросов",
      "Избранное",
      "Конструктор этикеток",
    ],
    notIncluded: [
      "Продвинутые ИИ-модели",
    ],
    cta: "Зарегистрироваться",
    popular: true,
  },
  {
    name: "Расширенные запросы",
    price: "От 10\u20BD",
    period: "за запрос",
    features: [
      "Доступ к GPT-4 и Claude",
      "Увеличенные лимиты токенов",
      "Сложные рецептуры",
      "Детальный анализ вкуса",
      "Всё из бесплатного пакета",
    ],
    notIncluded: [],
    cta: "Пополнить баланс",
    popular: false,
  },
];

const rules = [
  {
    icon: UserCheck,
    title: "Возрастное ограничение",
    text: "Сайт предназначен для лиц, достигших 18 лет. При первом посещении запрашивается подтверждение возраста. Если вам нет 18 лет — пожалуйста, покиньте сайт.",
  },
  {
    icon: Sparkles,
    title: "Использование ИИ-инструментов",
    text: "Базовый функционал ИИ бесплатен: 2 пробных запроса без регистрации, 5 запросов в день после регистрации. Расширенные запросы к продвинутым моделям оплачиваются отдельно — без подписки, pay-per-use.",
  },
  {
    icon: Lock,
    title: "Конфиденциальность",
    text: "Мы не передаём персональные данные третьим лицам. Email используется только для входа и важных уведомлений. История ваших запросов видна только вам.",
  },
  {
    icon: CreditCard,
    title: "Оплата",
    text: "Расширенные ИИ-запросы оплачиваются через встроенную систему пополнения баланса. Минимальная сумма пополнения — 100 рублей. Неиспользованный баланс не сгорает.",
  },
  {
    icon: AlertTriangle,
    title: "Ответственность",
    text: "Рецепты и рекомендации носят информационный характер. Мы не несём ответственности за результат приготовления. Чрезмерное употребление алкоголя вредит вашему здоровью.",
  },
  {
    icon: Shield,
    title: "Контент сообщества",
    text: "Рецепты и отзывы публикуются пользователями. Модерация проводится постфактум. Если вы нашли некорректный контент — сообщите через форму обратной связи.",
  },
  {
    icon: MessageCircle,
    title: "Комментарии и общение",
    text: "Уважайте других участников сообщества. Запрещены оскорбления, нецензурная лексика, спам, реклама и троллинг. Администрация сайта оставляет за собой право удалять комментарии и блокировать пользователей без предупреждения по своему усмотрению. Все ваши комментарии сохраняются в истории активности вашего профиля.",
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Shield size={22} />
            Правила и тарифы
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold mb-3"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Правила, тарифы <span style={{ color: "var(--accent)" }}>и честность</span>
          </h1>
          <p
            className="text-lg max-w-xl"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
          >
            Мы стараемся быть максимально прозрачными: базовый функционал бесплатен,
            а расширенные возможности — по честной цене без подписок.
          </p>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Тарифы
            </h2>
            <p
              className="max-w-xl mx-auto"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
            >
              Базовые инструменты бесплатны. Расширенные ИИ-запросы — по мере необходимости.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="relative rounded-2xl p-6 transition-all hover:shadow-xl"
                style={{
                  background: tier.popular ? "var(--bg-card)" : "var(--bg-card)",
                  border: tier.popular ? "2px solid var(--accent)" : "1px solid var(--border)",
                }}
              >
                {tier.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-base font-medium"
                    style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                  >
                    Рекомендуем
                  </div>
                )}

                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                >
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: tier.popular ? "var(--accent)" : "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {tier.period}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 mb-6">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check size={28} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                      <span className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {f}
                      </span>
                    </div>
                  ))}
                  {tier.notIncluded.map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <X size={28} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                      <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full rounded-xl py-3 text-base font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: tier.popular ? "var(--accent)" : "var(--surface)",
                    color: tier.popular ? "#fff" : "var(--text-secondary)",
                    border: tier.popular ? "none" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ: How it works ===== */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Как это работает
          </h2>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Заходите на сайт",
                desc: "Без регистрации доступны все рецепты, барная карта и 2 пробных ИИ-запроса.",
              },
              {
                step: "2",
                title: "Регистрируетесь",
                desc: "Email + пароль, 30 секунд. Получаете 5 ИИ-запросов в день и избранное.",
              },
              {
                step: "3",
                title: "Пользуетесь",
                desc: "Базовые инструменты бесплатны навсегда. Для продвинутых моделей — пополните баланс.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}
                >
                  {s.step}
                </div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                >
                  {s.title}
                </h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Rules ===== */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold mb-10 text-center"
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

      {/* ===== FAQ ===== */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Частые вопросы
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Обязательна ли регистрация?",
                a: "Нет. Все рецепты, барная карта и часть инструментов доступны без регистрации. Регистрация открывает ИИ-запросы и избранное.",
              },
              {
                q: "Что такое \"расширенный запрос\"?",
                a: "Это запрос к продвинутым ИИ-моделям (GPT-4, Claude) с увеличенными лимитами. Стоит от 10 рублей за запрос, без подписки.",
              },
              {
                q: "Где посмотреть остаток запросов?",
                a: "В личном кабинете, в разделе \"Баланс и лимиты\". Там же можно пополнить баланс для расширенных запросов.",
              },
              {
                q: "Можно ли опубликовать свой рецепт?",
                a: "Да, после регистрации. Рецепт пройдёт модерацию и появится в общем доступе. Укажите авторство — ваш ник будет виден всем.",
              },
              {
                q: "Как удалить аккаунт?",
                a: "Напишите на info@ai-nastoika.ru с темой \"Удаление аккаунта\". Мы удалим все данные в течение 7 дней.",
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
