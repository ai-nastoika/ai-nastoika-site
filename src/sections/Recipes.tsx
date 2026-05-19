import { Link } from "react-router-dom";
import { Clock, Star, ArrowRight } from "lucide-react";

const recipes = [
  {
    image: "/recipe-cherry.jpg",
    title: "Вишнёвая домашняя 2025",
    category: "Вишнёвая на водке",
    rating: 4.9,
    time: "21 день",
    tag: "Топ рецепт",
  },
  {
    image: "/recipe-lemon.jpg",
    title: "Лимонная с имбирём",
    category: "Цитрусовая",
    rating: 4.7,
    time: "14 дней",
    tag: null,
  },
  {
    image: "/recipe-herbal.jpg",
    title: "Травяная с мятой",
    category: "Травяная настойка",
    rating: 4.8,
    time: "30 дней",
    tag: "Новинка",
  },
];

export default function Recipes() {
  return (
    <section id="recipes" className="py-20" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-2"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Популярные рецепты
            </h2>
            <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Проверенные классические и смелые эксперименты от сообщества
            </p>
          </div>
          <Link
            to="/recipes"
            className="hidden sm:inline-flex items-center gap-1 text-base font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            Все рецепты
            <ArrowRight size={22} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe, i) => (
            <div
              key={i}
              className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="relative overflow-hidden">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-52 object-cover transition-transform group-hover:scale-105"
                />
                {recipe.tag && (
                  <div
                    className="absolute top-3 left-3 rounded-full px-3 py-1 text-base font-medium"
                    style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                  >
                    {recipe.tag}
                  </div>
                )}
              </div>

              <div className="p-5">
                <div
                  className="text-base font-medium mb-2"
                  style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  {recipe.category}
                </div>
                <h3
                  className="text-lg font-bold mb-3"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                >
                  {recipe.title}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" style={{ color: "var(--accent-light)" }}>
                      <Star size={22} fill="currentColor" />
                      <span
                        className="text-base font-medium"
                        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
                      >
                        {recipe.rating}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Clock size={22} />
                      <span className="text-base" style={{ fontFamily: "var(--font-body)" }}>
                        {recipe.time}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={22}
                    className="transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--accent)" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
