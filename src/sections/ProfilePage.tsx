import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { fallbackRecipes } from "@/data/fallbackData";
import {
  User,
  Mail,
  Wallet,
  ArrowLeft,
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

function StatCard({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div
      className="rounded-lg p-2 text-center transition-transform hover:-translate-y-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <Icon size={16} style={{ color: "var(--accent)" }} className="mx-auto mb-1" />
      <div className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {label}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "favorites" | "recipes" | "history" | "settings">("overview");
  const [favSub, setFavSub] = useState<"recipes" | "labels" | "places">("recipes");
  const [notif, setNotif] = useState({ email: true, newRecipes: true, promos: false });

  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordSuccess("Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    },
    onError: (err) => {
      setPasswordError(err.message);
      setPasswordSuccess("");
    },
  });

  const userData = {
    name: user?.name ?? "Пользователь",
    email: user?.email ?? "",
    avatar: null as string | null,
    joined: "—",
    balance: 0,
    usedQueries: 0,
    totalQueries: 150,
    recipesViewed: 0,
    recipesRated: 0,
    favoritesCount: 0,
    placesSaved: 0,
    labelsCreated: 0,
    commentsCount: 0,
  };

  const savedPlaces: { id: number; name: string; city: string; rating: number; image: string }[] = [];
  const savedLabels: { id: number; name: string; style: string; date: string }[] = [];
  const aiHistory: { id: number; tool: string; query: string; date: string; model: string }[] = [];
  const myComments: { recipe: string; text: string; date: string; likes: number }[] = [];

  const { data: recipesData } = trpc.recipe.list.useQuery();
  const allRecipes = recipesData && recipesData.length > 0 ? recipesData : fallbackRecipes;
  const savedRecipes = [allRecipes[0], allRecipes[2], allRecipes[4]].filter(Boolean);
  const myRecipesList = [allRecipes[1], allRecipes[3]].filter(Boolean);
  const myRatings = [
    { recipe: allRecipes[0], rating: 5 },
    { recipe: allRecipes[2], rating: 4 },
    { recipe: allRecipes[4], rating: 5 },
  ].filter((r) => r.recipe);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* HERO */}
      <section className="relative overflow-hidden py-14" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(40%, -40%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={18} /> Назад
          </button>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)", border: "3px solid var(--bg-card)" }}
              >
                {userData.name.charAt(0)}
              </div>
              <button
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--accent)" }}
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {userData.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                <span className="flex items-center gap-1"><Mail size={14} /> {userData.email}</span>
              </div>
            </div>
            <div className="rounded-xl px-5 py-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Wallet size={22} style={{ color: "var(--accent)" }} />
                <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Баланс</span>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                {userData.balance} ₽
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-6" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
  <StatCard icon={BookOpen} value={String(userData.recipesViewed)} label="Рецепты" />
  <StatCard icon={Star} value={String(userData.recipesRated)} label="Оценки" />
  <StatCard icon={Heart} value={String(userData.favoritesCount)} label="Избранное" />
  <StatCard icon={FlaskConical} value={String(userData.usedQueries)} label="ИИ" />
  <StatCard icon={Tag} value={String(userData.labelsCreated)} label="Этикетки" />
  <StatCard icon={MapPin} value={String(userData.placesSaved)} label="Места" />
  <StatCard icon={MessageCircle} value={String(userData.commentsCount)} label="Комментарии" />
</div>
        </div>
      </section>

      {/* TABS */}
      <section className="sticky top-16 z-30 py-3" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-10">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Пополнить баланс", desc: `${userData.balance} ₽`, icon: Wallet, action: "Пополнить →" },
                { label: "Остаток запросов", desc: `${userData.totalQueries - userData.usedQueries} из ${userData.totalQueries}`, icon: FlaskConical, action: "Смотреть →" },
                { label: "Быстрый доступ", desc: "Рецепты, этикетки", icon: BookOpen, action: "Открыть →" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
                      <card.icon size={18} style={{ color: "var(--accent)" }} />
                    </div>
                    <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{card.label}</span>
                  </div>
                  <div className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{card.desc}</div>
                  <button className="text-base transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{card.action}</button>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Star size={22} style={{ color: "var(--accent)" }} /> Мои оценки
              </h2>
              <div className="space-y-3">
                {myRatings.map(({ recipe, rating }) => (
                  <div key={recipe.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <img src={recipe.heroImage ?? "/recipe-cherry.jpg"} alt={recipe.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{recipe.title}</div>
                      <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{recipe.categoryLabel}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} fill={i < rating ? "var(--accent)" : "none"} color={i < rating ? "var(--accent)" : "var(--border)"} />
                      ))}
                    </div>
                    <Link to={`/recipe/${recipe.slug}`} style={{ color: "var(--accent)" }}><ChevronRight size={20} /></Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <MessageCircle size={22} style={{ color: "var(--accent)" }} /> Мои комментарии
              </h2>
              {myComments.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <MessageCircle size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Комментариев пока нет</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myComments.map((c, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{c.recipe}</span>
                        <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{c.date}</span>
                      </div>
                      <p className="text-base mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>{c.text}</p>
                      <div className="flex items-center gap-1 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <ThumbsUp size={14} /> {c.likes} лайков
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FAVORITES */}
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
                  <s.icon size={16} /> {s.label}
                </button>
              ))}
            </div>

            {favSub === "recipes" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedRecipes.map((r) => (
                  <Link key={r.id} to={`/recipe/${r.slug}`} className="group rounded-xl overflow-hidden transition-all hover:shadow-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="relative overflow-hidden h-40">
                      <img src={r.heroImage ?? "/recipe-cherry.jpg"} alt={r.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <div className="p-4">
                      <div className="text-base mb-1" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{r.categoryLabel}</div>
                      <div className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{r.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {favSub === "labels" && (
              <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Tag size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Сохранённых этикеток нет</div>
              </div>
            )}

            {favSub === "places" && (
              <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <MapPin size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Сохранённых мест нет</div>
              </div>
            )}
          </div>
        )}

        {/* MY RECIPES */}
        {tab === "recipes" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Опубликованные рецепты</h2>
              <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Edit3 size={16} /> Добавить рецепт
              </button>
            </div>
            <div className="space-y-4">
              {myRecipesList.map((r) => (
                <div key={r.id} className="flex gap-4 rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <img src={r.heroImage ?? "/recipe-cherry.jpg"} alt={r.title} className="w-32 h-32 object-cover shrink-0" />
                  <div className="py-4 pr-4 flex-1">
                    <div className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{r.title}</div>
                    <div className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{r.subtitle}</div>
                    <div className="flex items-center gap-3">
                      <Link to={`/recipe/${r.slug}`} className="text-base rounded-lg px-3 py-1.5" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>Открыть</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI HISTORY */}
        {tab === "history" && (
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>История ИИ-запросов</h2>
            {aiHistory.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Wrench size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>История запросов пуста</div>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                {aiHistory.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: i < aiHistory.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
                      <Wrench size={16} style={{ color: "var(--accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{h.tool}</div>
                      <div className="text-base truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{h.query}</div>
                    </div>
                    <div className="text-base shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{h.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Profile */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <User size={22} style={{ color: "var(--accent)" }} /> Профиль
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Имя</label>
                  <input type="text" defaultValue={userData.name} className="w-full rounded-lg px-4 py-2.5 text-base outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Email</label>
                  <input type="email" defaultValue={userData.email} className="w-full rounded-lg px-4 py-2.5 text-base outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <button className="rounded-lg px-5 py-2.5 text-base font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  Сохранить изменения
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Lock size={22} style={{ color: "var(--accent)" }} /> Безопасность
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Текущий пароль</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg px-4 py-2.5 text-base outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Новый пароль</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg px-4 py-2.5 text-base outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Повторите пароль</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg px-4 py-2.5 text-base outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                {passwordError && <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>{passwordError}</div>}
                {passwordSuccess && <div className="p-3 rounded-lg text-sm" style={{ background: "#dcfce7", color: "#166534" }}>{passwordSuccess}</div>}
                <button
                  onClick={() => {
                    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
                    changePasswordMutation.mutate({ currentPassword, newPassword });
                  }}
                  disabled={changePasswordMutation.isPending}
                  className="rounded-lg px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  {changePasswordMutation.isPending ? "Сохранение..." : "Изменить пароль"}
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Bell size={22} style={{ color: "var(--accent)" }} /> Уведомления
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
                      <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ background: "#fff", left: notif[n.key as keyof typeof notif] ? "22px" : "2px" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Logout */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { localStorage.removeItem("auth-token"); window.location.href = "/#/"; }}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                <LogOut size={22} /> Выйти
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-medium transition-all hover:scale-105"
                style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)", fontFamily: "var(--font-body)" }}
              >
                <X size={22} /> Удалить аккаунт
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}