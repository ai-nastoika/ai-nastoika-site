import { Link } from "react-router";
import { trpc } from "@/providers/trpc";

import { Clock, Star, ArrowRight } from "lucide-react";

export default function Recipes() {
  const { data: apiRecipes, isLoading } = trpc.recipe.list.useQuery();
  const recipes = apiRecipes ?? [];

  if (isLoading) {
    return (
      <section id="recipes" className="py-20" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      </section>
    );
  }

  const displayRecipes = (recipes ?? []).slice(0, 3);

  return (
    <section id="recipes" className="py-20" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Популярные рецепты
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Проверенные классические и смелые эксперименты от сообщества
            </p>
          </div>
          <Link to="/recipes" className="hidden sm:inline-flex items-center gap-1 text-base font-medium transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
            Все рецепты <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.slug}`}
              className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl block"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="relative overflow-hidden">
                <img src={recipe.heroImage ?? "/recipe-cherry.jpg"} alt={recipe.title} className="w-full h-52 object-cover transition-transform group-hover:scale-105" />
                {recipe.rating && parseFloat(recipe.rating as unknown as string) >= 4.8 && (
                  <div className="absolute top-3 left-3 rounded-full px-3 py-1 text-base font-medium" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}>
                    Топ рецепт
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="text-base font-medium mb-2" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  {recipe.categoryLabel ?? recipe.category}
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  {recipe.title}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" style={{ color: "var(--accent-light)" }}>
                      <Star size={22} fill="currentColor" />
                      <span className="text-base font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        {recipe.rating}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Clock size={22} />
                      <span className="text-base" style={{ fontFamily: "var(--font-body)" }}>{recipe.time}</span>
                    </div>
                  </div>
                  <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" style={{ color: "var(--accent)" }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
