import {
  Heart,
  Users,
  BookOpen,
  Wrench,
  MapPin,
  Shield,
  ArrowRight,
  Mail,
  MessageCircle,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Традиция",
    desc: "Рецепты передаются из поколения в поколение. Мы сохраняем лучшее и добавляем новое.",
  },
  {
    icon: Users,
    title: "Сообщество",
    desc: "Живые обсуждения, честные рейтинги и советы от тех, кто действительно разбирается.",
  },
  {
    icon: Zap,
    title: "Технологии",
    desc: "ИИ как инструмент, а не замена мастерству. Помогаем экспериментировать увереннее.",
  },
  {
    icon: Shield,
    title: "Ответственность",
    desc: "Мы напоминаем о мере. Алкоголь — для удовольствия, а не для злоупотребления.",
  },
];

const stats = [
  { value: "300+", label: "Рецептов", sub: "и каждый день добавляются новые" },
  { value: "5", label: "Инструментов", sub: "для расчётов, дизайна и поиска" },
  { value: "4", label: "Города", sub: "с картой авторских баров" },
  { value: "∞", label: "Идей", sub: "ждут своего воплощения" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: "var(--accent)", transform: "translate(-30%, 30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-6"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Sparkles size={22} />
            О проекте
          </div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 max-w-4xl mx-auto"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Место, где настойка — это{" "}
            <span style={{ color: "var(--accent)" }}>серьёзно и с удовольствием</span>
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}
          >
            «Ай, настойка» вырос из простой идеи: собрать в одном месте всё, что нужно настоящему энтузиасту.
            Рецепты, инструменты, обсуждения — и немного искусственного интеллекта.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="text-center rounded-2xl p-6 transition-transform hover:-translate-y-1"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="text-2xl font-bold mb-2"
                  style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}
                >
                  {stat.value}
                </div>
                <div className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                  {stat.label}
                </div>
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2
                className="text-2xl sm:text-3xl font-bold mb-6"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
              >
                Как всё начиналось
              </h2>
              <div className="space-y-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                <p>
                  Проект вырос из идеи собрать в одном месте всё необходимое для энтузиаста: рецепты, инструменты для экспериментов, обсуждения и рейтинги.
                </p>
                <p>
                  Ключевая особенность — интеграция искусственного интеллекта как <strong style={{ color: "var(--text-primary)" }}>вспомогательного инструмента</strong>, а не как основной сути. ИИ помогает в расчётах, подборе рецептур и создании этикеток, но центральное место занимает именно сообщество и традиция домашнего ремесла.
                </p>
                <p>
                  Сегодня «Ай, настойка» — это некоммерческий проект, развивающийся усилиями сообщества. Базовый функционал бесплатен и останется таким.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl overflow-hidden h-48"
                style={{ border: "1px solid var(--border)" }}
              >
                <img src="/recipe-cherry.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div
                className="rounded-2xl overflow-hidden h-48 mt-8"
                style={{ border: "1px solid var(--border)" }}
              >
                <img src="/recipe-label.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div
                className="rounded-2xl overflow-hidden h-48 -mt-8"
                style={{ border: "1px solid var(--border)" }}
              >
                <img src="/recipe-herbal.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div
                className="rounded-2xl overflow-hidden h-48"
                style={{ border: "1px solid var(--border)" }}
              >
                <img src="/recipe-lemon.jpg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Наши принципы
            </h2>
            <p
              className="max-w-2xl mx-auto"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
            >
              То, во что мы верим и к чему стремимся
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 transition-transform hover:-translate-y-1"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "var(--surface)" }}
                >
                  <val.icon size={28} style={{ color: "var(--accent)" }} />
                </div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                >
                  {val.title}
                </h3>
                <p
                  className="text-base"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                >
                  {val.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What inside */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-10 text-center"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Что внутри проекта
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Рецепты",
                desc: "База из 300+ рецептов с описаниями, фильтрами по типу и времени настаивания.",
                link: "/recipes",
              },
              {
                icon: Wrench,
                title: "Инструменты",
                desc: "Калькулятор вкуса с ИИ, расчёт крепости, конструктор этикеток — и всё бесплатно.",
                link: "/tools",
              },
              {
                icon: MapPin,
                title: "Барная карта",
                desc: "Рейтинги мест с авторскими настойками в Москве, СПб, Казани и Нижнем Новгороде.",
                link: "/barmap",
              },
            ].map((item, i) => (
              <a
                key={i}
                href={item.link}
                className="group rounded-2xl p-6 transition-all hover:shadow-xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--surface)" }}
                  >
                    <item.icon size={28} style={{ color: "var(--accent)" }} />
                  </div>
                  <ArrowRight
                    size={22}
                    className="transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--accent)", marginTop: 12 }}
                  />
                </div>
                <h3
                  className="text-lg font-bold mb-2"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-base"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                >
                  {item.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Присоединяйтесь
          </h2>
          <p
            className="mb-8"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
          >
            Регистрация занимает 30 секунд. После неё открывается доступ ко всем рецептам,
            история запросов и 5 ИИ-запросов в день.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/recipes"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105"
              style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <Star size={22} />
              Смотреть рецепты
            </a>
            <a
              href="/tools"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:scale-105"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Wrench size={22} />
              Попробовать инструменты
            </a>
          </div>

          <div className="flex justify-center gap-6 mt-10">
            <a
              href="#"
              className="flex items-center gap-2 text-base transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              <MessageCircle size={28} />
              Telegram
            </a>
            <a
              href="#"
              className="flex items-center gap-2 text-base transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
            >
              <Mail size={28} />
              Написать нам
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
