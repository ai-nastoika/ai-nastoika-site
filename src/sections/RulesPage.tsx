import {
  Shield,
  Lock,
  AlertTriangle,
  UserCheck,
  HelpCircle,
  MessageCircle,
  Heart,
  Clock,
  Tag,
} from "lucide-react";
import { useState } from "react";
import PageHero from "@/components/PageHero";
import { DonateModal } from "@/components/DonateModal";

const rules = [
  {
    icon: UserCheck,
    title: "Возрастное ограничение",
    text: "Сайт предназначен для лиц, достигших 18 лет. При первом посещении запрашивается подтверждение возраста. Если вам нет 18 лет — пожалуйста, покиньте сайт. Мы не несём ответственности за нарушение этого правила.",
  },
  {
    icon: Lock,
    title: "Конфиденциальность",
    text: "Мы не передаём персональные данные третьим лицам. Email используется только для входа и важных уведомлений. Пароли хранятся в зашифрованном виде (bcrypt). История ваших ИИ-запросов и операций по балансу видна только вам.",
  },
  {
    icon: Tag,
    title: "Генерация этикеток",
    text: "Создание уникальной этикетки для настойки через ИИ стоит 10 ₽ за запрос — дороже обычной консультации, так как генерация изображения требует больше вычислительных ресурсов. Сервис-генератор может отказаться создать этикетку, если запрос нарушает его правила использования: запрещённый или оскорбительный контент, нарушение авторских прав и т.п. В этом случае списанная сумма автоматически возвращается на баланс.",
  },
  {
    icon: Heart,
    title: "Поддержка проекта",
    text: "Проект «Ай, настойка» существует благодаря энтузиастам. Все базовые функции — рецепты, барная карта, комментарии, профиль — бесплатны и всегда будут бесплатны. Поддержать проект можно донатом — это добровольное пожертвование, благодарность за понравившийся сервис, не дающая никаких дополнительных привилегий или расширенных лимитов.",
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

export default function RulesPage() {
  const [donateOpen, setDonateOpen] = useState(false);
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <PageHero
        icon={Shield}
        badgeText="Правила использования"
        title={<>Правила, <span style={{ color: "var(--accent)" }}>честность</span> и поддержка</>}
        subtitle="Мы стараемся быть максимально прозрачными: базовый функционал бесплатен и останется таким навсегда. ИИ — это консультант, а не генератор рецептов."
      />
      {/* ===== Limits & Pricing ===== */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-10 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Лимиты и стоимость
          </h2>

          <div className="max-w-3xl mx-auto space-y-6">
            {/* Без регистрации */}
            <div className="flex gap-5 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>1</div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Без регистрации</h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  Заходите и сразу пользуйтесь: смотрите рецепты и предлагайте свои, изучайте барную карту и
                  добавляйте на неё заведения, читайте общие сведения из базы знаний. Мы рады помочь
                  сориентироваться в мире настоек любому гостю сайта — для этого регистрация не нужна.
                </p>
              </div>
            </div>

            {/* После регистрации */}
            <div className="flex gap-5 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>2</div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>После регистрации</h3>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  Аккаунт открывает элементы сообщества и личные инструменты: можно добавлять рецепты и
                  заведения в избранное, чтобы не искать их каждый раз заново через поиск, поставить трекер
                  созревания понравившейся настойки — он сам напомнит на почту, когда пора снимать пробу, —
                  а ещё оставлять комментарии и оценки. Для регистрации нужна только электронная почта:
                  никаких телефонов и личных данных мы не спрашиваем.
                </p>
              </div>
            </div>

            {/* Платные функции */}
            <div className="flex gap-5 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>3</div>
              <div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Платные функции</h3>
                <p className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  Каждому новому пользователю сразу даётся 5 бесплатных запросов ИИ-консультанту. Когда они
                  заканчиваются, каждый следующий запрос стоит 2 ₽.
                </p>
                <p className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  Чем это отличается от обычных бесплатных нейросетей? Ничем — вы точно так же можете
                  прописать ингредиенты, способ настаивания и добавки в любую другую модель и получить
                  общий, расплывчатый ответ. Разница в промте: наши ИИ-консультанты используют исчерпывающий
                  промт под конкретный рецепт или описание, поэтому ответ получается максимально полным и
                  точным.
                </p>
                <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                  2 ₽ за запрос сегодня — это копейки: условных 100 ₽ может хватить на долгий период
                  использования. А 10 ₽ за генерацию этикетки не сравнить с покупкой стандартных наклеек без
                  капли индивидуальности.
                </p>
              </div>
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
            onClick={() => setDonateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-transform hover:scale-105"
            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            <Heart size={20} />
            Поддержать
          </button>

          <p className="text-sm mt-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Другие способы: <span style={{ color: "var(--accent)" }}>info@ai-nastoika.ru</span> или кнопка в шапке сайта
          </p>
        </div>
      </section>

      {donateOpen && <DonateModal onClose={() => setDonateOpen(false)} />}
    </div>
  );
}
