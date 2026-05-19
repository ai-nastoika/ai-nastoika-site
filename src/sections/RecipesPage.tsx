import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Heart,
  Flame,
  Leaf,
  Grape,
  Citrus,
  Coffee,
  Droplets,
  ChevronDown,
} from "lucide-react";

const categories = [
  { id: "all", label: "Все", icon: null },
  { id: "berry", label: "Ягодные", icon: Grape },
  { id: "citrus", label: "Цитрусовые", icon: Citrus },
  { id: "herbal", label: "Травяные", icon: Leaf },
  { id: "spiced", label: "Пряные", icon: Flame },
  { id: "coffee", label: "Кофейные", icon: Coffee },
  { id: "honey", label: "Медовые", icon: Droplets },
];

const sortOptions = [
  { id: "popular", label: "По популярности" },
  { id: "rating", label: "По рейтингу" },
  { id: "new", label: "Сначала новые" },
  { id: "time", label: "По времени настаивания" },
];

const recipes = [
  {
    id: 1,
    slug: "vishnevaya-domashnyaya",
    image: "/recipe-cherry.jpg",
    title: "Вишнёвая домашняя 2025",
    category: "berry",
    categoryLabel: "Вишнёвая на водке",
    rating: 4.9,
    reviews: 128,
    time: "21 день",
    difficulty: "Легко",
    abv: "18%",
    tags: ["Топ рецепт", "Классика"],
    liked: false,
  },
  {
    id: 2,
    slug: "limonnaya-s-imbirem",
    image: "/recipe-lemon.jpg",
    title: "Лимонная с имбирём",
    category: "citrus",
    categoryLabel: "Цитрусовая",
    rating: 4.7,
    reviews: 96,
    time: "14 дней",
    difficulty: "Средне",
    abv: "22%",
    tags: [],
    liked: true,
  },
  {
    id: 3,
    slug: "travaya-s-myatoy",
    image: "/recipe-herbal.jpg",
    title: "Травяная с мятой",
    category: "herbal",
    categoryLabel: "Травяная настойка",
    rating: 4.8,
    reviews: 74,
    time: "30 дней",
    difficulty: "Средне",
    abv: "25%",
    tags: ["Новинка"],
    liked: false,
  },
  {
    id: 4,
    slug: "medovaya-s-percem",
    image: "/recipe-pepper.jpg",
    title: "Медовая с перцем",
    category: "honey",
    categoryLabel: "Медовая пряная",
    rating: 4.6,
    reviews: 52,
    time: "10 дней",
    difficulty: "Легко",
    abv: "20%",
    tags: ["Острое"],
    liked: false,
  },
  {
    id: 5,
    slug: "kofeinaya-na-konyake",
    image: "/recipe-coffee.jpg",
    title: "Кофейная на коньяке",
    category: "coffee",
    categoryLabel: "Кофейный ликёр",
    rating: 4.9,
    reviews: 143,
    time: "7 дней",
    difficulty: "Легко",
    abv: "28%",
    tags: ["Топ рецепт"],
    liked: true,
  },
  {
    id: 6,
    slug: "oblepiihovii-eliksir",
    image: "/recipe-buckthorn.jpg",
    title: "Облепиховый эликсир",
    category: "berry",
    categoryLabel: "Ягодная настойка",
    rating: 4.5,
    reviews: 38,
    time: "45 дней",
    difficulty: "Сложно",
    abv: "16%",
    tags: ["Витаминная"],
    liked: false,
  },
];

export default function RecipesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [likedIds, setLikedIds] = useState<number[]>([2, 5]);
  const [showSort, setShowSort] = useState(false);

  const toggleLike = (id: number) => {
    setLikedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  let filtered = recipes.filter((r) => {
    const catMatch = activeCategory === "all" || r.category === activeCategory;
    const searchMatch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  // sort
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "popular") return b.reviews - a.reviews;
    if (sortBy === "time") return parseInt(a.time) - parseInt(b.time);
    return b.id - a.id;
  });

  const activeSortLabel = sortOptions.find((s) => s.id === sortBy)?.label;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
                style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                <Grape size={22} />
                300+ рецептов
              </div>
              <h1
                className="text-4xl sm:text-5xl font-bold mb-3"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
              >
                Рецепты <span style={{ color: "var(--accent)" }}>настоек</span>
              </h1>
              <p
                className="text-lg max-w-xl"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
              >
                Проверенная классика, смелые эксперименты и рецепты от сообщества — с описаниями, рейтингами и советами
              </p>
            </div>

            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 w-full lg:w-auto"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minWidth: 320 }}
            >
              <Search size={22} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Поиск по названию, ингредиентам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-base w-full"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
              />
              <SlidersHorizontal size={22} style={{ color: "var(--text-muted)", flexShrink: 0, cursor: "pointer" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-base font-medium whitespace-nowrap transition-all"
                  style={{
                    background: activeCategory === cat.id ? "var(--accent)" : "var(--bg-card)",
                    color: activeCategory === cat.id ? "#fff" : "var(--text-secondary)",
                    border: activeCategory === cat.id ? "none" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {cat.icon && <cat.icon size={22} />}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-base transition-all"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
              >
                {activeSortLabel}
                <ChevronDown size={22} className={showSort ? "rotate-180" : ""} />
              </button>
              {showSort && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-xl z-20"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                      className="block w-full text-left px-4 py-2.5 text-base transition-colors hover:opacity-70"
                      style={{
                        color: sortBy === opt.id ? "var(--accent)" : "var(--text-secondary)",
                        fontFamily: "var(--font-body)",
                        fontWeight: sortBy === opt.id ? 600 : 400,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recipes Grid */}
      <section className="py-12 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {filtered.length} {filtered.length === 1 ? "рецепт" : filtered.length < 5 ? "рецепта" : "рецептов"}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((recipe) => (
              <div
                key={recipe.id}
                className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Tags */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {recipe.tags.map((tag) => (
                      <div
                        key={tag}
                        className="rounded-full px-3 py-1 text-base font-medium"
                        style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                  {/* Like button */}
                  <button
                    onClick={() => toggleLike(recipe.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                  >
                    <Heart
                      size={28}
                      fill={likedIds.includes(recipe.id) ? "var(--accent)" : "none"}
                      color={likedIds.includes(recipe.id) ? "var(--accent)" : "#fff"}
                    />
                  </button>
                  {/* Difficulty */}
                  <div
                    className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-base font-medium"
                    style={{ background: "rgba(0,0,0,0.5)", color: "#fff", fontFamily: "var(--font-body)" }}
                  >
                    {recipe.difficulty}
                  </div>
                </div>

                <div className="p-5">
                  <div
                    className="text-base font-medium mb-1"
                    style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
                  >
                    {recipe.categoryLabel}
                  </div>
                  <h3
                    className="text-lg font-bold mb-3"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
                  >
                    {recipe.title}
                  </h3>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Star size={22} fill="var(--accent)" color="var(--accent)" />
                      <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        {recipe.rating}
                      </span>
                      <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        ({recipe.reviews})
                      </span>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Clock size={28} />
                      <span className="text-base" style={{ fontFamily: "var(--font-body)" }}>{recipe.time}</span>
                    </div>
                    <div className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {recipe.abv}
                    </div>
                  </div>

                  <Link
                    to={`/recipe/${recipe.slug}`}
                    className="block w-full text-center rounded-xl py-2.5 text-base font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}
                  >
                    Открыть рецепт
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Search size={48} style={{ color: "var(--border)" }} className="mx-auto mb-4" />
              <p className="text-lg font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Ничего не найдено
              </p>
              <p className="text-base mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Попробуйте изменить фильтры или поисковый запрос
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
