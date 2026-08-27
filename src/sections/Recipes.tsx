import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { ShotGlassCardSummary } from "@/components/ShotGlassRating";

import { Clock, ArrowRight, Gauge } from "lucide-react";

/* ── Рюмки-рейтинг для карточки рецепта — тот же приём, что и на барной карте:
   один сетевой запрос на карточку, их всего 3 в этой секции. ── */
function RecipeRatingBadge({ recipeId }: { recipeId: number }) {
  const { data: summary } = trpc.comment.ratingSummary.useQuery({ recipeId });
  if (!summary) return null;
  return <ShotGlassCardSummary summary={summary} />;
}

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

  // Сначала рецепты, вручную отмеченные админом флагом "featured" — этот
  // раздел главной страницы теперь управляется вручную, а не просто
  // показывает первые попавшиеся 3 рецепта. Если админ ещё ничего не отметил
  // (featured пусто) — не оставляем секцию пустой, дополняем последними
  // добавленными рецептами, чтобы страница не выглядела сломанной.
  const featured = recipes.filter((r) => !!(r as { featured?: number }).featured);
  const rest = recipes.filter((r) => !(r as { featured?: number }).featured);
  const displayRecipes = [...featured, ...rest].slice(0, 3);

  return (
    <section id="recipes" className="py-20" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Популярные рецепты
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Проверенные классические и смелые эксперименты от сообщества
            </p>
          </div>
          {/* Раньше было "hidden sm:inline-flex" — ссылка была буквально скрыта
              на любом экране уже с 640px, то есть на телефоне в портретной
              ориентации не показывалась никогда. Теперь видна всегда. */}
          <Link to="/recipes" className="inline-flex items-center gap-1 text-base font-medium transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
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
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-base font-medium" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    {recipe.categoryLabel ?? recipe.category}
                  </div>
                  {recipe.difficulty && (
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm" style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                      <Gauge size={14} /> {recipe.difficulty}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  {recipe.title}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RecipeRatingBadge recipeId={recipe.id} />
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Clock size={18} />
                      <span className="text-sm" style={{ fontFamily: "var(--font-body)" }}>{recipe.time}</span>
                    </div>
                  </div>
                  <ArrowRight size={22} className="transition-transform group-hover:translate-x-1 shrink-0" style={{ color: "var(--accent)" }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
