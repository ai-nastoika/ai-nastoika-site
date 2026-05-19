import { useParams, Link, useNavigate } from "react-router-dom";
import { recipesData } from "../data/recipes";
import CommentSection from "../components/CommentSection";
import {
  ArrowLeft,
  Clock,
  Star,
  Wine,
  ChefHat,
  BookOpen,
  Lightbulb,
  FlaskConical,
  Heart,
  Share2,
  Printer,
  Thermometer,
  GlassWater,
  Check,
} from "lucide-react";

function FlavorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span
        className="text-sm sm:text-base w-24 sm:w-28 text-right shrink-0 whitespace-nowrap"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span
        className="text-sm sm:text-base w-10 text-right"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
      >
        {value}%
      </span>
    </div>
  );
}

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const recipe = recipesData.find((r) => r.slug === slug);

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

  const f = recipe.flavorProfile;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== HERO IMAGE ===== */}
      <div className="relative h-72 sm:h-96 lg:h-[28rem]">
        <img
          src={recipe.heroImage}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)" }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium text-white transition-all hover:scale-105"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={28} />
          Назад
        </button>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <Heart size={28} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <Share2 size={28} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <Printer size={28} />
          </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-medium mb-3"
              style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
            >
              {recipe.categoryLabel}
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-heading)", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
            >
              {recipe.title}
            </h1>
            <p
              className="text-base sm:text-base text-white/80 max-w-2xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {recipe.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ===== META BAR ===== */}
      <div className="sticky top-16 z-30 py-3" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {[
              { icon: Star, label: `${recipe.rating} (${recipe.reviews})`, color: "var(--accent)" },
              { icon: Clock, label: recipe.time, color: "var(--text-secondary)" },
              { icon: Wine, label: recipe.abv, color: "var(--text-secondary)" },
              { icon: ChefHat, label: recipe.difficulty, color: "var(--text-secondary)" },
              { icon: FlaskConical, label: recipe.origin, color: "var(--text-secondary)" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <m.icon size={22} style={{ color: m.color }} />
                <span className="text-sm sm:text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* --- History --- */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={22} style={{ color: "var(--accent)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              {recipe.history.title}
            </h2>
          </div>
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-base font-medium rounded-full px-3 py-1"
                style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}
              >
                {recipe.year}
              </span>
              <span
                className="text-base"
                style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
              >
                {recipe.origin}
              </span>
            </div>
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}
            >
              {recipe.history.text}
            </p>
          </div>
        </section>

        {/* --- Tasting Profile --- */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <GlassWater size={22} style={{ color: "var(--accent)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Вкусовой профиль
            </h2>
          </div>

          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {/* Flavor Wheel Bars */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                  Баланс вкусов
                </h3>
                <FlavorBar label="Сладость" value={f.sweet} color="#d4a574" />
                <FlavorBar label="Кислотность" value={f.sour} color="#c4a35a" />
                <FlavorBar label="Горечь" value={f.bitter} color="#8b6914" />
                <FlavorBar label="Пряность" value={f.spicy} color="#b87333" />
                <FlavorBar label="Фруктовость" value={f.fruity} color="#cd853f" />
                <FlavorBar label="Травянистость" value={f.herbal} color="#6b8e23" />
              </div>

              {/* Color + Pairing */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    Цвет
                  </h3>
                  <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                    {recipe.tasting.color}
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Thermometer size={22} style={{ color: "var(--accent)" }} />
                      <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Температура</span>
                    </div>
                    <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {recipe.tasting.temperature}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <GlassWater size={22} style={{ color: "var(--accent)" }} />
                      <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Посуда</span>
                    </div>
                    <p className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {recipe.tasting.glassware}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    С чем подавать
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tasting.pairing.map((p) => (
                      <span
                        key={p}
                        className="rounded-full px-3 py-1 text-base"
                        style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasting description */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                {recipe.tasting.description}
              </p>
            </div>
          </div>
        </section>

        {/* --- Ingredients --- */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical size={22} style={{ color: "var(--accent)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Ингредиенты
            </h2>
            <span className="text-base ml-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {recipe.ingredients.length} компонентов
            </span>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            {recipe.ingredients.map((ing, i) => (
              <div
                key={ing.name}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: i < recipe.ingredients.length - 1 ? "1px solid var(--border)" : "none",
                  background: i % 2 === 0 ? "transparent" : "var(--bg-primary)",
                }}
              >
                <div className="flex items-center gap-3">
                  <Check size={22} style={{ color: "var(--accent)" }} />
                  <span className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    {ing.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    {ing.amount}
                  </span>
                  {ing.note && (
                    <span className="block text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {ing.note}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Steps --- */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <ChefHat size={22} style={{ color: "var(--accent)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Пошаговый рецепт
            </h2>
          </div>

          <div className="space-y-4">
            {recipe.steps.map((s) => (
              <div
                key={s.step}
                className="flex gap-4 rounded-2xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}
                >
                  {s.step}
                </div>
                <div>
                  <h3
                    className="text-base font-bold mb-1"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-base"
                    style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
                  >
                    {s.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Tips --- */}
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={22} style={{ color: "var(--accent)" }} />
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Советы мастера
            </h2>
          </div>

          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <div className="space-y-3">
              {recipe.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Star size={22} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }} />
                  <p className="text-base" style={{ fontFamily: "var(--font-body)", lineHeight: 1.7, opacity: 0.95 }}>
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Comments --- */}
        <CommentSection recipeId={recipe.id} />

        {/* --- Author --- */}
        <section className="mb-10">
          <div
            className="flex items-center justify-between rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}
              >
                {recipe.author.name.charAt(0)}
              </div>
              <div>
                <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                  {recipe.author.name}
                </div>
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  {recipe.author.date}
                </div>
              </div>
            </div>
            <Link
              to="/recipes"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-base font-medium transition-all hover:scale-105"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <ArrowLeft size={22} />
              Все рецепты
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
