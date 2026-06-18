import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";

import {
  Search, SlidersHorizontal, Star, Clock, Heart, Flame,
  Leaf, Grape, Citrus, Coffee, Droplets, ChevronDown, ArrowLeft,
  Sparkles, Plus,
} from "lucide-react";
import AddRecipeForm from "@/sections/AddRecipeForm";

// Первые 5 — в полоске, остальные — в «Другие»
const MAIN_CATEGORIES = [
  { id: "all",    label: "Все",        emoji: null  },
  { id: "berry",  label: "Ягодные",    emoji: "🫐"  },
  { id: "fruit",  label: "Фруктовые",  emoji: "🍎"  },
  { id: "citrus", label: "Цитрусовые", emoji: "🍋"  },
  { id: "herbal", label: "Травяные",   emoji: "🌿"  },
  { id: "spiced", label: "Пряные",     emoji: "🌶️"  },
];

const OTHER_CATEGORIES = [
  { id: "bitter",    label: "Горькие",     emoji: "🌱"  },
  { id: "sweet",     label: "Сладкие",     emoji: "🍒"  },
  { id: "honey",     label: "Медовые",     emoji: "🍯"  },
  { id: "coffee",    label: "Кофейные",    emoji: "☕"  },
  { id: "floral",    label: "Цветочные",   emoji: "🌸"  },
  { id: "nut",       label: "Ореховые",    emoji: "🌰"  },
  { id: "root",      label: "Корневые",    emoji: "🫚"  },
  { id: "chocolate", label: "Шоколадные",  emoji: "🍫"  },
  { id: "vegetable", label: "Овощные",     emoji: "🥬"  },
];

const categories = [...MAIN_CATEGORIES, ...OTHER_CATEGORIES];

const sortOptions = [
  { id: "popular", label: "По популярности" },
  { id: "rating", label: "По рейтингу" },
  { id: "new", label: "Сначала новые" },
  { id: "time", label: "По времени настаивания" },
];

export default function RecipesPage() {
  const navigate = useNavigate();
  const { data: apiRecipes, isLoading } = trpc.recipe.list.useQuery();
  const recipes = apiRecipes ?? [];
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [likedIds, setLikedIds] = useState<number[]>([2, 5]);
  const [showSort, setShowSort] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleLike = (id: number) => {
    setLikedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const allRecipes = recipes ?? [];

  let filtered = allRecipes.filter((r) => {
    const catMatch = activeCategory === "all" || r.category === activeCategory;
    const searchMatch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.categoryLabel ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return parseFloat(b.rating as unknown as string) - parseFloat(a.rating as unknown as string);
    if (sortBy === "popular") return (b.reviews ?? 0) - (a.reviews ?? 0);
    if (sortBy === "time") return parseInt(a.time ?? "0") - parseInt(b.time ?? "0");
    return b.id - a.id;
  });

  const activeSortLabel = sortOptions.find((s) => s.id === sortBy)?.label;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={18} /> Назад
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <Grape size={22} />
                {allRecipes.length}+ рецептов
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Рецепты <span style={{ color: "var(--accent)" }}>настоек</span>
              </h1>
              <p className="text-lg max-w-xl" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                Проверенная классика, смелые эксперименты и рецепты от сообщества
              </p>
            </div>

            <div className="flex flex-col gap-3 items-start lg:items-end">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-medium transition-all hover:opacity-80"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                {showAddForm ? <Sparkles size={18} /> : <Plus size={18} />}
                {showAddForm ? "К рецептам" : "Добавить свой рецепт"}
              </button>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 w-full lg:w-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minWidth: 320 }}>
                <Search size={22} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input type="text" placeholder="Поиск по названию, ингредиентам..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none text-base w-full" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                <SlidersHorizontal size={22} style={{ color: "var(--text-muted)", flexShrink: 0, cursor: "pointer" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add Recipe Form */}
      {showAddForm && (
        <section className="py-8" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AddRecipeForm onClose={() => setShowAddForm(false)} />
          </div>
        </section>
      )}

      {/* Filters + Grid (hidden when form is open) */}
      {!showAddForm && (
      <>
      <section className="py-6" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
              {MAIN_CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setShowOther(false); }} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-base font-medium whitespace-nowrap transition-all" style={{ background: activeCategory === cat.id ? "var(--accent)" : "var(--bg-card)", color: activeCategory === cat.id ? "#fff" : "var(--text-secondary)", border: activeCategory === cat.id ? "none" : "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                  {cat.emoji && <span style={{ fontSize: 18 }}>{cat.emoji}</span>}
                  {cat.label}
                </button>
              ))}
              {/* Другие — выпадающий список вверх */}
              <div className="relative flex-shrink-0">
                <button onClick={() => setShowOther(!showOther)} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-base font-medium whitespace-nowrap transition-all" style={{ background: OTHER_CATEGORIES.some(c => c.id === activeCategory) ? "var(--accent)" : "var(--bg-card)", color: OTHER_CATEGORIES.some(c => c.id === activeCategory) ? "#fff" : "var(--text-secondary)", border: OTHER_CATEGORIES.some(c => c.id === activeCategory) ? "none" : "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                  {OTHER_CATEGORIES.find(c => c.id === activeCategory)
                    ? <><span style={{ fontSize: 18 }}>{OTHER_CATEGORIES.find(c => c.id === activeCategory)?.emoji}</span> {OTHER_CATEGORIES.find(c => c.id === activeCategory)?.label}</>
                    : "Другие"}
                  <ChevronDown size={16} style={{ transition: "transform 0.2s", transform: showOther ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {showOther && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    {OTHER_CATEGORIES.map((cat) => (
                      <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setShowOther(false); }} className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm transition-colors hover:opacity-70" style={{ color: activeCategory === cat.id ? "var(--accent)" : "var(--text-secondary)", fontFamily: "var(--font-body)", fontWeight: activeCategory === cat.id ? 600 : 400 }}>
                        <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-base transition-all" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                {activeSortLabel}<ChevronDown size={22} className={showSort ? "rotate-180" : ""} />
              </button>
              {showSort && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-xl z-20" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  {sortOptions.map((opt) => (
                    <button key={opt.id} onClick={() => { setSortBy(opt.id); setShowSort(false); }} className="block w-full text-left px-4 py-2.5 text-base transition-colors hover:opacity-70" style={{ color: sortBy === opt.id ? "var(--accent)" : "var(--text-secondary)", fontFamily: "var(--font-body)", fontWeight: sortBy === opt.id ? 600 : 400 }}>
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
              <div key={recipe.id} className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="relative overflow-hidden">
                  <img src={recipe.heroImage ?? "/recipe-cherry.jpg"} alt={recipe.title} className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <button onClick={() => toggleLike(recipe.id)} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
                    <Heart size={28} fill={likedIds.includes(recipe.id) ? "var(--accent)" : "none"} color={likedIds.includes(recipe.id) ? "var(--accent)" : "#fff"} />
                  </button>
                  <div className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-base font-medium" style={{ background: "rgba(0,0,0,0.5)", color: "#fff", fontFamily: "var(--font-body)" }}>
                    {recipe.difficulty}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-base font-medium mb-1" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    {recipe.categoryLabel ?? recipe.category}
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{recipe.title}</h3>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Star size={22} fill="var(--accent)" color="var(--accent)" />
                      <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{recipe.rating}</span>
                      <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>({recipe.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Clock size={28} />
                      <span className="text-base" style={{ fontFamily: "var(--font-body)" }}>{recipe.time}</span>
                    </div>
                    <div className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{recipe.abv}</div>
                  </div>

                  <Link to={`/recipe/${recipe.slug}`} className="block w-full text-center rounded-xl py-2.5 text-base font-medium transition-all hover:opacity-80" style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}>
                    Открыть рецепт
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Search size={48} style={{ color: "var(--border)" }} className="mx-auto mb-4" />
              <p className="text-lg font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Ничего не найдено</p>
              <p className="text-base mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Попробуйте изменить фильтры или поисковый запрос</p>
            </div>
          )}
        </div>
      </section>
      </>
      )}
    </div>
  );
}