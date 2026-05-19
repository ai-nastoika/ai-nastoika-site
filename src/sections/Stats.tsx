import { BookOpen, Wrench, Star, Users } from "lucide-react";

const stats = [
  {
    icon: BookOpen,
    value: "300+",
    label: "Рецептов в базе",
    desc: "с описаниями и советами",
  },
  {
    icon: Wrench,
    value: "5",
    label: "Инструментов",
    desc: "для экспериментов на базе ИИ",
  },
  {
    icon: Star,
    value: "0 руб.",
    label: "Базовые функции",
    desc: "бесплатно и без регистрации",
  },
  {
    icon: Users,
    value: "Без лимита",
    label: "Сообщество",
    desc: "живые обсуждения и рейтинги",
  },
];

export default function Stats() {
  return (
    <section className="py-16" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 transition-transform hover:-translate-y-1"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--surface)" }}
              >
                <stat.icon size={28} style={{ color: "var(--accent)" }} />
              </div>
              <div
                className="text-3xl font-bold mb-1"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
              >
                {stat.value}
              </div>
              <div
                className="text-base font-medium mb-0.5"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
              >
                {stat.label}
              </div>
              <div
                className="text-base"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
              >
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
