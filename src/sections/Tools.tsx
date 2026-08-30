import { Link } from "react-router";
import { Wand2, Calculator, ArrowRight, Sparkles } from "lucide-react";

const tools = [
  {
    num: "01",
    icon: Wand2,
    title: "Калькулятор вкуса с ИИ",
    desc: "Опишите идею или выберите ингредиенты — ИИ составит рецептуру, расскажет о вкусовом профиле и предложит варианты.",
    badge: "Главный инструмент",
    link: "/tools?tool=taste",
  },
  {
    num: "02",
    icon: Calculator,
    title: "Расчёт крепости",
    desc: "Точный расчёт крепости напитка с учётом всех параметров, которые обычно игнорирует ареометр.",
    badge: null,
    link: "/tools?tool=abv",
  },
];

export default function Tools() {
  return (
    <section id="tools" className="py-20" style={{ background: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Инструменты проекта
          </h2>
          <p
            className="max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            Базовые инструменты бесплатны. ИИ-консультант доступен после регистрации —
            5 бесплатных запросов на аккаунт, дальше 2 ₽ с баланса.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.num}
              className="group rounded-2xl p-6 transition-all hover:shadow-xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
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
                    <h3
                      className="text-lg font-bold"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                    >
                      {tool.title}
                    </h3>
                  </div>
                </div>
                <span
                  className="text-base font-bold"
                  style={{ color: "var(--accent-light)", fontFamily: "var(--font-body)" }}
                >
                  {tool.num}
                </span>
              </div>

              <p
                className="text-base mb-4"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
              >
                {tool.desc}
              </p>

              <Link
                to={tool.link}
                className="inline-flex items-center gap-1 text-base font-medium transition-opacity group-hover:opacity-70"
                style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                Попробовать
                <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>

        <div
          className="mt-10 rounded-2xl p-6 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p
            className="text-base"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            После исчерпания лимита бесплатных запросов — небольшая оплата за запрос, без подписки.
          </p>
        </div>
      </div>
    </section>
  );
}
