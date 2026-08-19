import { useState, type CSSProperties } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

import CommentSection from "../components/CommentSection";
import { ShotGlassCompact } from "../components/ShotGlassRating";
import RecipeAiConsult from "./RecipeAiConsult";
import {
  ArrowLeft, Clock, Star, Wine, ChefHat, BookOpen, Lightbulb,
  FlaskConical, Heart, Share2, Printer, Thermometer, GlassWater, Check, Timer,
} from "lucide-react";

/* Компактный индикатор рюмками в шапке рецепта — тянет агрегат из отзывов */
function RecipeRatingBadge({ recipeId }: { recipeId: number }) {
  const { data: summary } = trpc.comment.ratingSummary.useQuery({ recipeId });
  if (!summary) return null;
  return <ShotGlassCompact summary={summary} />;
}

function FlavorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-sm sm:text-base w-24 sm:w-28 text-right shrink-0 whitespace-nowrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-sm sm:text-base w-10 text-right" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {value}%
      </span>
    </div>
  );
}

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: apiRecipe, isLoading } = trpc.recipe.bySlug.useQuery({ slug: slug! }, { enabled: !!slug });
  const recipe = apiRecipe ?? null;

  const { isLoggedIn } = useAuth();
  const utils = trpc.useUtils();
  const [shareCopied, setShareCopied] = useState(false);

  const { data: favoriteRecipeIds } = trpc.favorites.myIds.useQuery(
    { itemType: "recipe" },
    { enabled: isLoggedIn }
  );
  const isFavorite = !!(favoriteRecipeIds && recipe && favoriteRecipeIds.includes(recipe.id));
  const toggleFavoriteMutation = trpc.favorites.toggle.useMutation({
    onSuccess: () => utils.favorites.myIds.invalidate({ itemType: "recipe" }),
  });

  function toggleFavorite() {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!recipe) return;
    toggleFavoriteMutation.mutate({ itemType: "recipe", itemId: recipe.id });
  }

  const startInfusionMutation = trpc.infusion.create.useMutation({
    onSuccess: (data) => navigate(`/profile?tab=tracker&infusionId=${data.id}`),
  });

  function handleStartInfusion() {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!recipe) return;
    startInfusionMutation.mutate({
      name: recipe.title,
      recipeId: recipe.id,
      startDate: new Date().toISOString().slice(0, 10),
      coverImage: recipe.heroImage ?? undefined,
    });
  }

  async function handleShare() {
    const shareData = {
      title: recipe?.title ?? "Ай, настойка!",
      text: `${recipe?.title} — рецепт на «Ай, настойка!»`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // пользователь отменил — ничего не делаем
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // буфер обмена недоступен — молча игнорируем
    }
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Загрузка рецепта...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <Wine size={48} style={{ color: "var(--border)" }} className="mx-auto mb-4" />
          <p className="text-lg" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Рецепт не найден</p>
          <Link to="/recipes" className="text-base mt-2 inline-block" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
            ← Вернуться к рецептам
          </Link>
        </div>
      </div>
    );
  }

  const ings = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];
  const pairing: string[] = recipe.tastingPairing ? (recipe.tastingPairing as string[]) : [];
  const tips: string[] = recipe.tips ? (recipe.tips as string[]) : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== HERO IMAGE ===== */}
      <div className="relative h-72 sm:h-96 lg:h-[28rem] print:h-64 print:overflow-visible">
        <img
          src={recipe.heroImage ?? ""}
          alt={recipe.title}
          className="w-full h-full object-cover print:object-contain"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as CSSProperties}
        />
        {/* Затемняющий градиент — только для экрана. В печати часто рендерится сплошной заливкой
            поверх фото (браузеры печатают CSS-градиенты по-разному), поэтому в печати скрываем. */}
        <div className="absolute inset-0 print:hidden" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)" }} />

        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium text-white transition-all hover:scale-105 print:hidden" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", fontFamily: "var(--font-body)" }}>
          <ArrowLeft size={28} /> Назад
        </button>

        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <button
            onClick={toggleFavorite}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
            style={{ background: isFavorite ? "var(--accent)" : "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            title={!isLoggedIn ? "Войдите, чтобы добавить в избранное" : isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <Heart size={28} fill={isFavorite ? "#fff" : "none"} />
          </button>
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            title="Поделиться"
          >
            {shareCopied ? <Check size={28} /> : <Share2 size={28} />}
          </button>
          <button
            onClick={handlePrint}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            title="Распечатать"
          >
            <Printer size={28} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 print:hidden">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-medium mb-3" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}>
              {recipe.categoryLabel ?? recipe.category}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
              {recipe.title}
            </h1>
            <p className="text-base text-white/80 max-w-2xl" style={{ fontFamily: "var(--font-body)" }}>
              {recipe.subtitle ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* Заголовок для печати — тёмный текст на белом фоне, не зависит от контраста с фото */}
      <div className="hidden print:block px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm font-medium mb-1" style={{ color: "#8B4513" }}>{recipe.categoryLabel ?? recipe.category}</div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#1a1a1a" }}>{recipe.title}</h1>
          {recipe.subtitle && <p className="text-base" style={{ color: "#555" }}>{recipe.subtitle}</p>}
        </div>
      </div>

      {/* ===== META BAR ===== */}
      <div className="sticky top-16 z-30 py-3 print:static" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <RecipeRatingBadge recipeId={recipe.id} />
            {[
              { icon: Clock, label: recipe.time ?? "", color: "var(--text-secondary)" },
              { icon: Wine, label: recipe.abv ?? "", color: "var(--text-secondary)" },
              { icon: ChefHat, label: recipe.difficulty ?? "", color: "var(--text-secondary)" },
              { icon: FlaskConical, label: recipe.origin ?? "", color: "var(--text-secondary)" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <m.icon size={22} style={{ color: m.color }} />
                <span className="text-sm sm:text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* --- History --- */}
        {recipe.historyTitle && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={22} style={{ color: "var(--accent)" }} />
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{recipe.historyTitle}</h2>
            </div>
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-base font-medium rounded-full px-3 py-1" style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}>
                  {recipe.year ?? ""}
                </span>
                <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{recipe.origin ?? ""}</span>
              </div>
              <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                {recipe.historyText ?? ""}
              </p>
            </div>
          </section>
        )}

        {/* --- Tasting Profile --- */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <GlassWater size={22} style={{ color: "var(--accent)" }} />
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Вкусовой профиль</h2>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>Баланс вкусов</h3>
                <FlavorBar label="Сладость" value={recipe.sweet ?? 0} color="#d4a574" />
                <FlavorBar label="Кислотность" value={recipe.sour ?? 0} color="#c4a35a" />
                <FlavorBar label="Горечь" value={recipe.bitter ?? 0} color="#8b6914" />
                <FlavorBar label="Пряность" value={recipe.spicy ?? 0} color="#b87333" />
                <FlavorBar label="Фруктовость" value={recipe.fruity ?? 0} color="#cd853f" />
                <FlavorBar label="Травянистость" value={recipe.herbal ?? 0} color="#6b8e23" />
              </div>

              <div className="space-y-5">
                {recipe.tastingColor && (
                  <div>
                    <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>Цвет</h3>
                    <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>{recipe.tastingColor}</p>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {recipe.tastingTemp && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Thermometer size={22} style={{ color: "var(--accent)" }} />
                        <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Температура</span>
                      </div>
                      <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{recipe.tastingTemp}</p>
                    </div>
                  )}
                  {recipe.tastingGlass && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <GlassWater size={22} style={{ color: "var(--accent)" }} />
                        <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Посуда</span>
                      </div>
                      <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{recipe.tastingGlass}</p>
                    </div>
                  )}
                </div>

                {pairing.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>С чем подавать</h3>
                    <div className="flex flex-wrap gap-2">
                      {pairing.map((p: string) => (
                        <span key={p} className="rounded-full px-3 py-1 text-base" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {recipe.tastingDescription && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                  {recipe.tastingDescription}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* --- Ingredients --- */}
        {ings.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical size={22} style={{ color: "var(--accent)" }} />
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Ингредиенты</h2>
              <span className="text-base ml-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{ings.length} компонентов</span>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {ings.map((ing, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: i < ings.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "transparent" : "var(--bg-primary)" }}>
                  <div className="flex items-center gap-3">
                    <Check size={22} style={{ color: "var(--accent)" }} />
                    <span className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{ing.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{ing.amount}</span>
                    {ing.note && <span className="block text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{ing.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- Steps --- */}
        {steps.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat size={22} style={{ color: "var(--accent)" }} />
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Пошаговый рецепт</h2>
            </div>

            <div className="space-y-4">
              {steps.map((s, idx) => (
                <div key={idx} className="flex gap-4 rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>
                    {s.stepNum}
                  </div>
                  <div>
                    <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{s.title}</h3>
                    <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- Tips --- */}
        {tips.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={22} style={{ color: "var(--accent)" }} />
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Советы мастера</h2>
            </div>

            <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--accent)", color: "#fff" }}>
              <div className="space-y-3">
                {tips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <Star size={22} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }} />
                    <p className="text-base" style={{ fontFamily: "var(--font-body)", lineHeight: 1.7, opacity: 0.95 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* --- Поставить настойку: создаёт трекер созревания в личном кабинете --- */}
        <section className="mb-14 print:hidden">
          <button
            onClick={handleStartInfusion}
            disabled={startInfusionMutation.isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white disabled:opacity-60 transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <Timer size={20} />
            {startInfusionMutation.isPending ? "Создаю трекер..." : "Поставить настойку"}
          </button>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Создаст трекер созревания в личном кабинете с этапами по этому рецепту
          </p>
        </section>

        {/* --- Консультация ИИ по этому рецепту (только для экрана) --- */}
        <section className="mb-14 print:hidden">
          <RecipeAiConsult recipeId={recipe.id} />
        </section>

        {/* --- Comments (только для экрана) --- */}
        <div className="print:hidden">
          <CommentSection recipeId={recipe.id} />
        </div>

        {/* --- Источник — только при печати, вместо ИИ-консультации и отзывов --- */}
        <div className="hidden print:block mt-6 mb-6 pt-4 text-center text-sm" style={{ borderTop: "1px solid #ccc", color: "#555" }}>
          Рецепт получен с сайта «Ай, настойка!» — {typeof window !== "undefined" ? `${window.location.origin}/#/recipe/${recipe.slug}` : ""}
        </div>

        {/* --- Author --- */}
        {recipe.authorName && (
          <section className="mb-10">
            <div className="flex items-center justify-between rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>
                  {recipe.authorName.charAt(0)}
                </div>
                <div>
                  <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{recipe.authorName}</div>
                  {recipe.authorDate && <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{recipe.authorDate}</div>}
                </div>
              </div>
              <Link to="/recipes" className="flex items-center gap-2 rounded-xl px-4 py-2 text-base font-medium transition-all hover:scale-105 print:hidden" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <ArrowLeft size={22} /> Все рецепты
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
