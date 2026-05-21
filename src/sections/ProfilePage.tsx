import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  User,
  Mail,
  Wallet,
  Star,
  Heart,
  Clock,
  BookOpen,
  Wrench,
  Tag,
  MapPin,
  Settings,
  ChevronRight,
  Edit3,
  Camera,
  Bell,
  Lock,
  LogOut,
  FlaskConical,
  X,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";

/* ─── dummy data ─── */
const userData = {
  name: "Александр",
  email: "alex@example.com",
  avatar: null as string | null,
  joined: "15 января 2025",
  balance: 340,
  usedQueries: 47,
  totalQueries: 150,
  recipesViewed: 23,
  recipesRated: 8,
  favoritesCount: 12,
  placesSaved: 3,
  labelsCreated: 5,
  commentsCount: 7,
};

const savedPlaces = [
  { id: 1, name: "Дымный Котёл", city: "Москва", rating: 4.9, image: "/bar-1.jpg" },
  { id: 2, name: "Тайга", city: "Санкт-Петербург", rating: 4.8, image: "/bar-2.jpg" },
  { id: 3, name: "Изба Настоек", city: "Нижний Новгород", rating: 4.7, image: "/bar-3.jpg" },
];
const savedLabels = [
  { id: 1, name: "Вишнёвая настойка", style: "vintage", date: "12.03.2025" },
  { id: 2, name: "Лимончелло", style: "craft", date: "18.03.2025" },
  { id: 3, name: "Травяной эликсир", style: "minimal", date: "25.03.2025" },
];
const aiHistory = [
  { id: 1, tool: "Калькулятор вкуса", query: "Вишня, ваниль, корица", date: "05.05.2025", model: "Базовая" },
  { id: 2, tool: "Калькулятор вкуса", query: "Лимон, имбирь, мёд", date: "03.05.2025", model: "GPT-4" },
  { id: 3, tool: "Расчёт крепости", query: "1000 мл, 40%, 100 г сахара", date: "01.05.2025", model: "—" },
  { id: 4, tool: "Калькулятор вкуса", query: "Кофе, шоколад, апельсин", date: "28.04.2025", model: "Базовая" },
  { id: 5, tool: "Конструктор этикеток", query: "Винтаж — Вишнёвая настойка", date: "25.04.2025", model: "—" },
];
const myComments = [
  { recipe: "Вишнёвая домашняя 2025", text: "Добавила мускатный орех — придало глубину. Рекомендую!", date: "05.05.2025", likes: 12 },
  { recipe: "Лимонная с имбирём", text: "Имбирь лучше брать молодой — мягче по вкусу.", date: "28.04.2025", likes: 9 },
  { recipe: "Травяная с мятой", text: "Двойное настаивание мятой действительно работает.", date: "20.04.2025", likes: 6 },
  { recipe: "Кофейная на коньяке", text: "Коньяк можно заменить на бренди, но VSOP лучше.", date: "15.04.2025", likes: 5 },
  { recipe: "Медовая с перцем", text: "Начните с половины стручка чили — проверено.", date: "10.04.2025", likes: 8 },
  { recipe: "Вишнёвая домашняя 2025", text: "30 дней настаивания лучше 21 — разница огромная.", date: "05.04.2025", likes: 15 },
  { recipe: "Облепиховый эликсир", text: "Разморозка ягод обязательна, иначе меньше сока.", date: "01.04.2025", likes: 7 },
];

/* ─── helpers ─── */
function StatCard({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center transition-transform hover:-translate-y-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <Icon size={22} style={{ color: "var(--accent)" }} className="mx-auto mb-2" />
      <div className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
      <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {label}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState<"overview" | "favorites" | "recipes" | "history" | "settings">("overview");
  const [favSub, setFavSub] = useState<"recipes" | "labels" | "places">("recipes");
  const [notif, setNotif] = useState({ email: true, newRecipes: true, promos: false });

  const { data: recipesData } = trpc.recipe.list.useQuery();
  const allRecipes = recipesData ?? [];
  const savedRecipes = [allRecipes[0], allRecipes[2], allRecipes[4]].filter(Boolean);
  const myRecipesList = [allRecipes[1], allRecipes[3]].filter(Boolean);
  const myRatings = [
    { recipe: allRecipes[0], rating: 5 },
    { recipe: allRecipes[2], rating: 4 },
    { recipe: allRecipes[4], rating: 5 },
  ].filter((r) => r.recipe);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden py-14" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(40%, -40%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)", border: "3px solid var(--bg-card)" }}
              >
                {userData.avatar ? <img src={userData.avatar} className="w-full h-full rounded-full object-cover" /> : userData.name.charAt(0)}
              </div>
              <button
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--accent)" }}
              >
                <Camera size={28} />
              </button>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {userData.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                <span className="flex items-center gap-1"><Mail size={28} /> {userData.email}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock size={28} /> С {userData.joined}</span>
              </div>
            </div>

            {/* Balance */}
            <div
              className="rounded-xl px-5 py-3 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Wallet size={22} style={{ color: "var(--accent)" }} />
                <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Баланс</span>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                {userData.balance} ₽
              </div>
              <button
                className="text-base mt-1 transition-opacity hover:opacity-70"
                style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                Пополнить →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="py-6" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard icon={BookOpen} value={String(userData.recipesViewed)} label="Рецептов просмотрено" />
            <StatCard icon={Star} value={String(userData.recipesRated)} label="Оценок поставлено" />
            <StatCard icon={Heart} value={String(userData.favoritesCount)} label="В избранном" />
            <StatCard icon={FlaskConical} value={String(userData.usedQueries)} label="ИИ-запросов" />
            <StatCard icon={Tag} value={String(userData.labelsCreated)} label="Этикеток" />
            <StatCard icon={MapPin} value={String(userData.placesSaved)} label="Мест сохранено" />
            <StatCard icon={MessageCircle} value={String(userData.commentsCount)} label="Комментариев" />
          </div>
        </div>
      </section>

      {/* ===== TABS ===== */}
      <section className="sticky top-16 z-30 py-3" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { id: "overview", label: "Обзор", icon: User },
              { id: "favorites", label: "Избранное", icon: Heart },
              { id: "recipes", label: "Мои рецепты", icon: BookOpen },
              { id: "history", label: "История ИИ", icon: FlaskConical },
              { id: "settings", label: "Настройки", icon: Settings },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-base font-medium whitespace-nowrap transition-all"
                style={{
                  background: tab === t.id ? "var(--accent)" : "var(--bg-card)",
                  color: tab === t.id ? "#fff" : "var(--text-secondary)",
                  border: tab === t.id ? "none" : "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <t.icon size={22} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-10">
            {/* Quick actions */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Пополнить баланс", desc: `${userData.balance} ₽`, icon: Wallet, action: "Пополнить →" },
                { label: "Остаток запросов", desc: `${userData.totalQueries - userData.usedQueries} из ${userData.totalQueries}`, icon: FlaskConical, action: "Смотреть →" },
                { label: "Быстрый доступ", desc: "Рецепты, этикетки", icon: BookOpen, action: "Открыть →" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
                      <card.icon size={28} style={{ color: "var(--accent)" }} />
                    </div>
                    <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {card.label}
                    </span>
                  </div>
                  <div className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    {card.desc}
                  </div>
                  <button className="text-base transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    {card.action}
                  </button>
                </div>
              ))}
            </div>

            {/* My ratings */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Star size={22} style={{ color: "var(--accent)" }} />
                Мои оценки
              </h2>
              <div className="space-y-3">
                {myRatings.map(({ recipe, rating }) => (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-4 rounded-xl p-4"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <img src={recipe.heroImage ?? "/recipe-cherry.jpg"} alt={recipe.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        {recipe.title}
                      </div>
                      <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {recipe.categoryLabel}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={22}
                          fill={i < rating ? "var(--accent)" : "none"}
                          color={i < rating ? "var(--accent)" : "var(--border)"}
                        />
                      ))}
                    </div>
                    <Link
                      to={`/recipe/${recipe.slug}`}
                      className="shrink-0"
                      style={{ color: "var(--accent)" }}
                    >
                      <ChevronRight size={28} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* My comments */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <MessageCircle size={22} style={{ color: "var(--accent)" }} />
                Мои комментарии
              </h2>
              <div className="space-y-3">
                {myComments.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-medium" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                        {c.recipe}
                      </span>
                      <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {c.date}
                      </span>
                    </div>
                    <p className="text-base mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                      {c.text}
                    </p>
                    <div className="flex items-center gap-1 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      <ThumbsUp size={28} /> {c.likes} лайков
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Clock size={22} style={{ color: "var(--accent)" }} />
                Активность
              </h2>
              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>23</div>
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Рецептов просмотрено</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>12</div>
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Сохранено в избранное</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>5</div>
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Этикеток создано</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FAVORITES ── */}
        {tab === "favorites" && (
          <div>
            <div className="flex gap-2 mb-6">
              {([
                { id: "recipes", label: "Рецепты", icon: BookOpen },
                { id: "labels", label: "Этикетки", icon: Tag },
                { id: "places", label: "Места", icon: MapPin },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFavSub(s.id)}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-all"
                  style={{
                    background: favSub === s.id ? "var(--surface)" : "transparent",
                    color: favSub === s.id ? "var(--accent)" : "var(--text-muted)",
                    border: favSub === s.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <s.icon size={22} />
                  {s.label}
                </button>
              ))}
            </div>

            {favSub === "recipes" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedRecipes.map((r) => (
                  <Link
                    key={r.id}
                    to={`/recipe/${r.slug}`}
                    className="group rounded-xl overflow-hidden transition-all hover:shadow-lg"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="relative overflow-hidden h-40">
                      <img src={r.heroImage ?? "/recipe-cherry.jpg"} alt={r.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                        <Heart size={28} fill="#fff" color="#fff" />
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-base mb-1" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{r.categoryLabel}</div>
                      <div className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{r.title}</div>
                      <div className="flex items-center gap-3 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <span className="flex items-center gap-1"><Star size={10} fill="var(--accent)" color="var(--accent)" /> {r.rating}</span>
                        <span>{r.abv}</span>
                        <span>{r.time}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {favSub === "labels" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedLabels.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl p-5 text-center"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-full aspect-[3/4] max-w-[180px] mx-auto rounded-lg flex flex-col items-center justify-center p-4 mb-4"
                      style={{
                        background:
                          l.style === "vintage"
                            ? "linear-gradient(135deg, #f5efe6 0%, #faf6f0 100%)"
                            : l.style === "craft"
                            ? "repeating-linear-gradient(45deg, #faf6f0, #faf6f0 10px, #f5efe6 10px, #f5efe6 20px)"
                            : "var(--bg-primary)",
                        border: l.style === "vintage" ? "double 3px var(--accent)" : l.style === "craft" ? "2px dashed var(--accent)" : "2px solid var(--text-primary)",
                      }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ border: "2px solid var(--accent)", color: "var(--accent)" }}>
                        <Tag size={22} />
                      </div>
                      <div className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{l.name}</div>
                      <div className="w-10 h-px my-2" style={{ background: "var(--accent)" }} />
                      <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{l.date}</div>
                    </div>
                    <div className="text-base font-medium mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{l.name}</div>
                    <div className="text-base mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      Стиль: {l.style === "vintage" ? "Винтаж" : l.style === "craft" ? "Крафт" : "Минимал"} · {l.date}
                    </div>
                    <button
                      className="text-base rounded-lg px-3 py-1.5 transition-opacity hover:opacity-70"
                      style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                    >
                      Скачать
                    </button>
                  </div>
                ))}
              </div>
            )}

            {favSub === "places" && (
              <div className="grid sm:grid-cols-2 gap-5">
                {savedPlaces.map((p) => (
                  <div
                    key={p.id}
                    className="flex gap-4 rounded-xl overflow-hidden"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <img src={p.image} alt={p.name} className="w-32 h-32 object-cover shrink-0" />
                    <div className="py-4 pr-4 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{p.city}</span>
                        <div className="flex items-center gap-1">
                          <Heart size={28} fill="var(--accent)" color="var(--accent)" />
                        </div>
                      </div>
                      <div className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{p.name}</div>
                      <div className="flex items-center gap-1 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <Star size={10} fill="var(--accent)" color="var(--accent)" /> {p.rating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY RECIPES ── */}
        {tab === "recipes" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Опубликованные рецепты
              </h2>
              <button
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium text-white transition-all hover:scale-105"
                style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                <Edit3 size={22} />
                Добавить рецепт
              </button>
            </div>
            <div className="space-y-4">
              {myRecipesList.map((r) => (
                <div
                  key={r.id}
                  className="flex gap-4 rounded-xl overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <img src={r.heroImage ?? "/recipe-cherry.jpg"} alt={r.title} className="w-32 h-32 object-cover shrink-0" />
                  <div className="py-4 pr-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base rounded-full px-2 py-0.5" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                        {r.categoryLabel ?? r.category}
                      </span>
                      <span className="text-base flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <Star size={10} fill="var(--accent)" color="var(--accent)" /> {r.rating} ({r.reviews})
                      </span>
                    </div>
                    <div className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{r.title}</div>
                    <div className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{r.subtitle}</div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/recipe/${r.slug}`}
                        className="text-base rounded-lg px-3 py-1.5 transition-opacity hover:opacity-70"
                        style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                      >
                        Открыть
                      </Link>
                      <button className="text-base flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <Edit3 size={28} /> Редактировать
                      </button>
                      <button className="text-base flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: "var(--danger)", fontFamily: "var(--font-body)" }}>
                        <X size={28} /> Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI HISTORY ── */}
        {tab === "history" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                История ИИ-запросов
              </h2>
              <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Всего: {aiHistory.length} запросов
              </div>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {aiHistory.map((h, i) => (
                <div
                  key={h.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                  style={{
                    borderBottom: i < aiHistory.length - 1 ? "1px solid var(--border)" : "none",
                    background: i % 2 === 0 ? "transparent" : "var(--bg-primary)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface)" }}
                  >
                    <Wrench size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {h.tool}
                    </div>
                    <div className="text-base truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {h.query}
                    </div>
                  </div>
                  <div className="hidden sm:block text-base shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    {h.model}
                  </div>
                  <div className="text-base shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    {h.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Profile edit */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <User size={22} style={{ color: "var(--accent)" }} />
                Профиль
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Имя</label>
                  <input
                    type="text"
                    defaultValue={userData.name}
                    className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Email</label>
                  <input
                    type="email"
                    defaultValue={userData.email}
                    className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <button
                  className="rounded-lg px-5 py-2.5 text-base font-medium text-white transition-all hover:scale-105"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  Сохранить изменения
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Lock size={22} style={{ color: "var(--accent)" }} />
                Безопасность
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Новый пароль</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Повторите пароль</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <button
                  className="rounded-lg px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  Изменить пароль
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Bell size={22} style={{ color: "var(--accent)" }} />
                Уведомления
              </h3>
              <div className="space-y-3">
                {([
                  { key: "email", label: "Email-уведомления", desc: "Важные новости и обновления" },
                  { key: "newRecipes", label: "Новые рецепты", desc: "Когда появляется рецепт в избранной категории" },
                  { key: "promos", label: "Акции и предложения", desc: "Скидки на расширенные запросы" },
                ] as const).map((n) => (
                  <div key={n.key} className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{n.label}</div>
                      <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{n.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotif((prev) => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                      className="w-11 h-6 rounded-full transition-colors relative shrink-0"
                      style={{ background: notif[n.key as keyof typeof notif] ? "var(--accent)" : "var(--border)" }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                        style={{
                          background: "#fff",
                          left: notif[n.key as keyof typeof notif] ? "22px" : "2px",
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout / Delete */}
            <div className="flex flex-wrap gap-3">
              <button
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                <LogOut size={22} />
                Выйти
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
                style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)", fontFamily: "var(--font-body)" }}
              >
                <X size={22} />
                Удалить аккаунт
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
