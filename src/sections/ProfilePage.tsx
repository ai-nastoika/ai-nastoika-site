import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import InfusionTracker from "./InfusionTracker";
import {
  User,
  Mail,
  Wallet,
  ArrowLeft,
  Star,
  Heart,
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
  Timer,
  X,
  MessageCircle,
  MessageCircleQuestion,
  ThumbsUp,
  ShieldCheck,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const VALID_TABS = ["overview", "recipes", "labels", "places", "tracker", "history", "settings"] as const;
  type TabId = typeof VALID_TABS[number];
  const tabFromUrl = searchParams.get("tab");
  const initialTab: TabId = (VALID_TABS as readonly string[]).includes(tabFromUrl ?? "") ? (tabFromUrl as TabId) : "overview";
  const [tab, setTab] = useState<TabId>(initialTab);
  const initialInfusionId = searchParams.get("infusionId") ? Number(searchParams.get("infusionId")) : undefined;
  const [notif, setNotif] = useState({ email: true, newRecipes: true, promos: false });
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { user, emailVerified, phoneVerified, twoFactorEnabled } = useAuth();
  const utils = trpc.useUtils();

  const { data: balanceData } = trpc.balance.me.useQuery(undefined, { enabled: !!user });
  const { data: transactionsData } = trpc.balance.history.useQuery(
    { limit: 30 },
    { enabled: !!user && tab === "history" }
  );
  const { data: aiConversations } = trpc.aiConversation.listRecent.useQuery(undefined, {
    enabled: !!user && tab === "history",
  });
  const [expandedConversationId, setExpandedConversationId] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const createTopupMutation = trpc.balance.createTopup.useMutation({
    onSuccess: (data) => {
      window.location.href = data.confirmationUrl;
    },
  });

  const { data: favoritePlacesData } = trpc.favorites.myPlaces.useQuery(undefined, { enabled: !!user });
  const savedPlaces = favoritePlacesData || [];
  const { data: favoriteRecipesData } = trpc.favorites.myRecipes.useQuery(undefined, { enabled: !!user });
  const savedRecipes = favoriteRecipesData || [];

  const updateAvatarMutation = trpc.auth.updateAvatar.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { alert("Допустимые форматы: JPG, PNG, WebP"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Максимальный размер — 5 МБ"); return; }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.path) {
        updateAvatarMutation.mutate({ avatar: data.path });
      } else {
        alert("Ошибка загрузки: " + (data.error || "неизвестная ошибка"));
      }
    } catch {
      alert("Ошибка загрузки файла");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Phone / 2FA state
  const [phoneInput, setPhoneInput] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"input" | "code" | "done">(phoneVerified ? "done" : "input");
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
  const [disable2faPassword, setDisable2faPassword] = useState("");
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaSuccess, setTwoFaSuccess] = useState("");

  // Email verification
  const [emailResent, setEmailResent] = useState(false);

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

  const resendEmailMutation = trpc.auth.resendEmailVerification.useMutation({
    onSuccess: () => setEmailResent(true),
    onError: (err) => console.error("Resend failed:", err.message),
  });

  const sendPhoneCodeMutation = trpc.auth.sendPhoneCode.useMutation({
    onSuccess: () => {
      setPhoneStep("code");
      setPhoneError("");
      setPhoneSuccess("Код отправлен!");
    },
    onError: (err) => setPhoneError(err.message),
  });

  const verifyPhoneCodeMutation = trpc.auth.verifyPhoneCode.useMutation({
    onSuccess: () => {
      setPhoneStep("done");
      setPhoneError("");
      setPhoneSuccess("Телефон подтверждён!");
      setSmsCode("");
      utils.auth.me.invalidate();
    },
    onError: (err) => setPhoneError(err.message),
  });

  const enableTwoFactorMutation = trpc.auth.enableTwoFactor.useMutation({
    onSuccess: () => {
      setTwoFaSuccess("Двухфакторная аутентификация включена");
      setTwoFaError("");
      utils.auth.me.invalidate();
    },
    onError: (err) => setTwoFaError(err.message),
  });

  const disableTwoFactorMutation = trpc.auth.disableTwoFactor.useMutation({
    onSuccess: () => {
      setTwoFaSuccess("Двухфакторная аутентификация отключена");
      setTwoFaError("");
      setDisable2faPassword("");
      utils.auth.me.invalidate();
    },
    onError: (err) => setTwoFaError(err.message),
  });

  // Реальные данные
  const { data: myRatingsData } = trpc.rating.myRatings.useQuery(undefined, { enabled: !!user });
  const { data: myCommentsData } = trpc.comment.myComments.useQuery(undefined, { enabled: !!user });
  const { data: recipesData } = trpc.recipe.list.useQuery();
  const { data: trackerStats } = trpc.infusion.stats.useQuery(undefined, { enabled: !!user });
  const { data: myFeedbackData } = trpc.feedback.myFeedback.useQuery(undefined, { enabled: !!user });
  const myFeedback = myFeedbackData || [];

  const myRatings = (myRatingsData || []).map((r) => ({
    recipe: (recipesData || []).find((rec) => rec.id === r.recipeId),
    rating: r.rating,
  })).filter((r) => r.recipe);

  const myComments = myCommentsData || [];
  const allRecipes = recipesData || [];

  const userData = {
    name: user?.name ?? "Пользователь",
    email: user?.email ?? "",
    avatar: user?.avatar ?? null,
    balance: (balanceData?.balanceKopecks ?? 0) / 100,
    freeRequestsLeft: balanceData?.freeRequestsLeft ?? 0,
    costRub: (balanceData?.costKopecks ?? 200) / 100,
    usedQueries: Math.max(0, 5 - (balanceData?.freeRequestsLeft ?? 5)),
    totalQueries: 150,
    recipesViewed: 0,
    favoritesCount: savedPlaces.length,
    placesSaved: savedPlaces.length,
    labelsCreated: 0,
  };

  const { data: savedLabels, refetch: refetchLabels } = trpc.savedLabels.list.useQuery();
  const deleteSavedLabel = trpc.savedLabels.delete.useMutation({ onSuccess: () => refetchLabels() });

  const TX_LABELS: Record<string, { label: string; color: string }> = {
    topup: { label: "Пополнение баланса", color: "#16a34a" },
    debit: { label: "Списание за ИИ-запрос", color: "#dc2626" },
    refund: { label: "Возврат за неудавшийся запрос", color: "#16a34a" },
    topup_pending: { label: "Пополнение (ожидает оплаты)", color: "var(--text-muted)" },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>

      {/* ─── EMAIL VERIFICATION BANNER ─── */}
      {user && !emailVerified && (
        <div
          className="px-4 py-3 flex items-center justify-center gap-3 text-sm"
          style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a" }}
        >
          <AlertTriangle size={18} style={{ color: "#92400e" }} className="shrink-0" />
          <span style={{ color: "#92400e", fontFamily: "var(--font-body)" }}>
            Подтвердите ваш email — проверьте почту {user.email}
          </span>
          {!emailResent ? (
            <button
              onClick={() => resendEmailMutation.mutate()}
              disabled={resendEmailMutation.isPending}
              className="underline font-medium shrink-0"
              style={{ color: "#92400e" }}
            >
              {resendEmailMutation.isPending ? "Отправляем..." : "Отправить снова"}
            </button>
          ) : (
            <span className="font-medium shrink-0" style={{ color: "#166534" }}>✓ Отправлено</span>
          )}
        </div>
      )}

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
              {userData.avatar ? (
                <img
                  src={userData.avatar}
                  alt={userData.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                  style={{ border: "3px solid var(--bg-card)" }}
                />
              ) : (
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)", border: "3px solid var(--bg-card)" }}
                >
                  {userData.name.charAt(0)}
                </div>
              )}
              <label
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--accent)", opacity: avatarUploading ? 0.5 : 1 }}
              >
                <Camera size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {userData.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                <span className="flex items-center gap-1">
                  <Mail size={14} /> {userData.email}
                  {emailVerified && <CheckCircle2 size={14} style={{ color: "#16a34a" }} />}
                </span>
                {user?.phone && phoneVerified && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> +{user.phone}
                    <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("settings")}
                className="rounded-xl px-5 py-3 text-center transition-all hover:-translate-y-0.5"
                style={{
                  background: tab === "settings" ? "var(--accent)" : "var(--bg-card)",
                  border: tab === "settings" ? "none" : "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Settings size={22} style={{ color: tab === "settings" ? "#fff" : "var(--accent)" }} />
                  <span className="text-base font-medium" style={{ color: tab === "settings" ? "#fff" : "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    Настройки
                  </span>
                </div>
                <div className="text-xl font-bold" style={{ color: tab === "settings" ? "#fff" : "var(--accent)", fontFamily: "var(--font-heading)" }}>
                  →
                </div>
              </button>
              <button
                onClick={() => setTab("history")}
                className="rounded-xl px-5 py-3 text-center transition-all hover:-translate-y-0.5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Wallet size={22} style={{ color: "var(--accent)" }} />
                  <span className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Баланс</span>
                </div>
                <div className="text-xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                  {userData.balance} ₽
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* NAV — объединённые счётчики и разделы, квадратные плитки как Баланс */}
      <section className="py-6" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {([
              { id: "overview", label: "Обзор", icon: User, value: null },
              { id: "tracker", label: "Трекер созревания", icon: Timer, value: trackerStats?.active ?? 0 },
              { id: "recipes", label: "Рецепты", icon: BookOpen, value: savedRecipes.length },
              { id: "labels", label: "Этикетки", icon: Tag, value: savedLabels?.length ?? 0 },
              { id: "places", label: "Места", icon: MapPin, value: savedPlaces.length },
              { id: "history", label: "ИИ", icon: FlaskConical, value: userData.usedQueries },
            ] as const).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="rounded-lg p-2 text-center transition-all hover:-translate-y-1"
                  style={{
                    background: active ? "var(--accent)" : "var(--bg-card)",
                    border: active ? "none" : "1px solid var(--border)",
                  }}
                >
                  <t.icon size={18} style={{ color: active ? "#fff" : "var(--accent)" }} className="mx-auto mb-1" />
                  {t.value !== null && (
                    <div className="text-base font-bold" style={{ color: active ? "#fff" : "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                      {t.value}
                    </div>
                  )}
                  <div className="text-xs" style={{ color: active ? "rgba(255,255,255,.85)" : "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    {t.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-10">

            {/* Мои оценки */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <Star size={22} style={{ color: "var(--accent)" }} /> Мои оценки
              </h2>
              {myRatings.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <Star size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Вы ещё не оценивали рецепты</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRatings.map(({ recipe, rating }) => (
                    <div key={recipe!.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <img src={recipe!.heroImage ?? "/recipe-cherry.jpg"} alt={recipe!.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{recipe!.title}</div>
                        <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{recipe!.categoryLabel}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={16} fill={i < rating ? "var(--accent)" : "none"} color={i < rating ? "var(--accent)" : "var(--border)"} />
                        ))}
                      </div>
                      <Link to={`/recipe/${recipe!.slug}`} style={{ color: "var(--accent)" }}><ChevronRight size={20} /></Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Мои комментарии */}
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
                  {myComments.map((c) => (
                    <div key={c.id} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                          {allRecipes.find((r) => r.id === c.recipeId)?.title ?? "Рецепт"}
                        </span>
                        <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                          {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>{c.text}</p>
                      <div className="flex items-center gap-1 mt-2 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <ThumbsUp size={14} /> {c.likes ?? 0} лайков
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Мои вопросы */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <MessageCircleQuestion size={22} style={{ color: "var(--accent)" }} /> Мои вопросы
              </h2>
              {myFeedback.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <MessageCircleQuestion size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Вы ещё не задавали вопросов</div>
                  <Link to="/feedback" className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    Написать в поддержку
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myFeedback.map((f) => (
                    <div key={f.id} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{f.topic}</span>
                        <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                          {new Date(f.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <p className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>{f.message}</p>
                      {f.answer ? (
                        <div className="rounded-lg p-3" style={{ background: "var(--surface)", borderLeft: "3px solid var(--accent)" }}>
                          <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>Ответ поддержки</div>
                          <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>{f.answer}</p>
                        </div>
                      ) : (
                        <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                          Ожидает ответа
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RECIPES — сохранённые (избранные) + опубликованные */}
        {tab === "recipes" && (
          <div className="space-y-10">
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Сохранённые рецепты</h2>
              {savedRecipes.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <Heart size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Сохранённых рецептов нет</div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedRecipes.map((r) => (
                    <Link
                      key={r.id}
                      to={`/recipe/${r.slug}`}
                      className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    >
                      <img src={r.heroImage || "/recipe-cherry.jpg"} alt={r.title} className="w-full h-32 object-cover" />
                      <div className="p-4">
                        <div className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                          {r.title}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{r.categoryLabel}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Опубликованные рецепты</h2>
                <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  <Edit3 size={16} /> Добавить рецепт
                </button>
              </div>
              <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <BookOpen size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Опубликованных рецептов нет</div>
              </div>
            </div>
          </div>
        )}

        {/* LABELS — сохранённые этикетки */}
        {tab === "labels" && (
          <div>
            {!savedLabels?.length ? (
              <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Tag size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Сохранённых этикеток нет</div>
                <a href="/#/tools" className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  Создать этикетку
                </a>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                {savedLabels.map(label => (
                  <div key={label.id} className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="p-4">
                      <div className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                        {label.labelText || "Без названия"}
                      </div>
                      <div className="text-xs mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {[label.labelDate, label.labelStrength && label.labelStrength + "%"].filter(Boolean).join(" · ") || "Поля не заполнены"}
                      </div>
                      <div className="text-xs mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {new Date(label.updatedAt).toLocaleDateString("ru-RU")}
                      </div>
                      {/* Preview */}
                      {label.previewUrl && (
                        <img src={label.previewUrl} alt="" className="w-full rounded-lg mb-3" style={{ aspectRatio: "3/4", objectFit: "cover" }} />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            sessionStorage.setItem("edit-label", JSON.stringify(label));
                            window.location.hash = "/tools";
                          }}
                          className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                        >
                          Редактировать
                        </button>
                        <button onClick={() => deleteSavedLabel.mutate({ id: label.id })} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PLACES — сохранённые места */}
        {tab === "places" && (
          !savedPlaces.length ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <MapPin size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
              <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Сохранённых мест нет</div>
              <a href="/#/barmap" className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                Открыть барную карту
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPlaces.map((p) => (
                <Link
                  key={p.id}
                  to={`/place/${p.slug}`}
                  className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <img src={p.image || "/bar-1.jpg"} alt={p.name} className="w-full h-32 object-cover" />
                  <div className="p-4">
                    <div className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                      {p.name}
                    </div>
                    <div className="text-xs flex items-center gap-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {p.city || "—"}</span>
                      <span className="flex items-center gap-1"><Star size={12} fill="var(--accent)" color="var(--accent)" /> {p.rating}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* TRACKER */}
        {tab === "tracker" && <InfusionTracker initialInfusionId={initialInfusionId} />}

        {/* AI + BALANCE */}
        {tab === "history" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>ИИ-запросы и баланс</h2>

            {/* Текущее состояние */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Баланс</span>
                <span className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>{userData.balance} ₽</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  {userData.freeRequestsLeft > 0 ? "Бесплатных запросов осталось" : `Цена запроса после бесплатных`}
                </span>
                <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                  {userData.freeRequestsLeft > 0 ? `${userData.freeRequestsLeft} из 5` : `${userData.costRub} ₽`}
                </span>
              </div>
              {userData.freeRequestsLeft === 0 && userData.balance < userData.costRub && (
                <div
                  className="mt-4 rounded-lg px-4 py-3 text-base"
                  style={{ background: "#fef3c7", color: "#92400e", fontFamily: "var(--font-body)" }}
                >
                  Бесплатные запросы закончились, а баланса не хватает на новый ({userData.costRub} ₽). Пополните баланс ниже, чтобы продолжить пользоваться ИИ-консультантом.
                </div>
              )}
            </div>

            {/* Пополнение */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Пополнить баланс</h3>
              {balanceData?.paymentsConfigured === false ? (
                <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Приём платежей сейчас настраивается, скоро будет доступен.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {(balanceData?.topupPresetsRub ?? [100, 300, 500, 1000]).map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTopupAmount(amount)}
                        className="rounded-lg py-2.5 text-base font-medium transition-all"
                        style={{
                          background: topupAmount === amount ? "var(--accent)" : "var(--bg-primary)",
                          color: topupAmount === amount ? "#fff" : "var(--text-primary)",
                          border: "1px solid var(--border)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {amount} ₽
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => topupAmount && createTopupMutation.mutate({ amountRub: topupAmount })}
                    disabled={!topupAmount || createTopupMutation.isPending}
                    className="w-full rounded-lg py-3 text-base font-medium transition-opacity disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                  >
                    {createTopupMutation.isPending ? "Переходим к оплате..." : "Оплатить"}
                  </button>
                  {createTopupMutation.isError && (
                    <div className="mt-3 text-base" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
                      {createTopupMutation.error.message}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* История операций */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>История операций</h3>
              {!transactionsData || transactionsData.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <Wrench size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Операций пока нет</div>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  {transactionsData.map((tx, i) => {
                    const meta = TX_LABELS[tx.type] ?? { label: tx.type, color: "var(--text-muted)" };
                    const amountRub = tx.amountKopecks / 100;
                    return (
                      <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: i < transactionsData.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)" }}>
                          <Wallet size={16} style={{ color: "var(--accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{meta.label}</div>
                          <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                            {new Date(tx.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {amountRub !== 0 && (
                          <div className="text-base font-medium shrink-0" style={{ color: meta.color, fontFamily: "var(--font-body)" }}>
                            {amountRub > 0 ? "+" : ""}{amountRub} ₽
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* История диалогов с ИИ */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>История диалогов с ИИ</h3>
              {!aiConversations || aiConversations.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <MessageCircleQuestion size={40} style={{ color: "var(--text-muted)" }} className="mx-auto mb-3" />
                  <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Диалогов с ИИ пока нет</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {aiConversations.map((conv) => {
                    const typeLabel =
                      conv.requestType === "recipe_consultation" ? "Консультация по рецепту" :
                      conv.requestType === "infusion_consult" ? "Консультант трекера" :
                      "Калькулятор вкуса";
                    const isOpen = expandedConversationId === conv.id;
                    const messages = conv.messages as { role: "user" | "assistant"; content: string }[];
                    return (
                      <div key={conv.id} className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <button
                          onClick={() => setExpandedConversationId(isOpen ? null : conv.id)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--surface)" }}>
                            <MessageCircle size={16} style={{ color: "var(--accent)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                              {typeLabel}{conv.contextLabel ? ` · ${conv.contextLabel}` : ""}
                            </div>
                            <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                              {new Date(conv.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              {" · "}{messages.length} {messages.length === 1 ? "сообщение" : "сообщений"}
                            </div>
                          </div>
                          <ChevronDown
                            size={18}
                            style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                            {messages.map((m, i) => (
                              <div
                                key={i}
                                className="rounded-lg p-3 text-sm mt-3"
                                style={
                                  m.role === "user"
                                    ? { background: "var(--surface)", color: "var(--text-primary)", marginLeft: "10%" }
                                    : { background: "var(--bg-secondary)", color: "var(--text-primary)", marginRight: "10%", lineHeight: 1.6 }
                                }
                              >
                                {m.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-8">
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
                  <div className="flex items-center gap-2">
                    <input type="email" defaultValue={userData.email} className="w-full rounded-lg px-4 py-2.5 text-base outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                    {emailVerified ? (
                      <span className="flex items-center gap-1 text-sm shrink-0 px-2 py-1 rounded" style={{ background: "#dcfce7", color: "#166534" }}>
                        <CheckCircle2 size={14} /> Подтверждён
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm shrink-0 px-2 py-1 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>
                        <AlertTriangle size={14} /> Не подтверждён
                      </span>
                    )}
                  </div>
                </div>
                <button className="rounded-lg px-5 py-2.5 text-base font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                  Сохранить изменения
                </button>
              </div>
            </div>

            {/* ─── PHONE & 2FA SECTION (NEW) ─── */}
            <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                <ShieldCheck size={22} style={{ color: "var(--accent)" }} /> Телефон и 2FA
              </h3>
              <div className="space-y-5">
                {/* Phone verification */}
                <div>
                  <label className="block text-base font-medium mb-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    Номер телефона
                  </label>

                  {phoneStep === "done" || (user?.phone && phoneVerified) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        +{user?.phone}
                      </span>
                      <span className="flex items-center gap-1 text-sm px-2 py-1 rounded" style={{ background: "#dcfce7", color: "#166534" }}>
                        <CheckCircle2 size={14} /> Подтверждён
                      </span>
                      <button
                        className="text-sm underline ml-auto"
                        style={{ color: "var(--text-muted)" }}
                        onClick={() => { setPhoneStep("input"); setPhoneInput(""); setPhoneError(""); setPhoneSuccess(""); }}
                      >
                        Изменить
                      </button>
                    </div>
                  ) : phoneStep === "input" ? (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+7 (900) 123-45-67"
                        className="flex-1 rounded-lg px-4 py-2.5 text-base outline-none"
                        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                      />
                      <button
                        onClick={() => { setPhoneError(""); sendPhoneCodeMutation.mutate({ phone: phoneInput }); }}
                        disabled={sendPhoneCodeMutation.isPending || !phoneInput}
                        className="rounded-lg px-4 py-2.5 text-base font-medium text-white shrink-0"
                        style={{ background: "var(--accent)", fontFamily: "var(--font-body)", opacity: !phoneInput ? 0.5 : 1 }}
                      >
                        {sendPhoneCodeMutation.isPending ? "..." : "Получить код"}
                      </button>
                    </div>
                  ) : (
                    /* phoneStep === "code" */
                    <div className="space-y-3">
                      <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                        Введите код из SMS, отправленного на ваш номер
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={smsCode}
                          onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="1234"
                          maxLength={4}
                          inputMode="numeric"
                          autoFocus
                          className="w-32 rounded-lg px-4 py-2.5 text-base text-center tracking-[0.3em] outline-none"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                        />
                        <button
                          onClick={() => { setPhoneError(""); verifyPhoneCodeMutation.mutate({ code: smsCode }); }}
                          disabled={verifyPhoneCodeMutation.isPending || smsCode.length < 4}
                          className="rounded-lg px-4 py-2.5 text-base font-medium text-white"
                          style={{ background: "var(--accent)", fontFamily: "var(--font-body)", opacity: smsCode.length < 4 ? 0.5 : 1 }}
                        >
                          {verifyPhoneCodeMutation.isPending ? "..." : "Подтвердить"}
                        </button>
                      </div>
                      <button
                        className="text-sm underline"
                        style={{ color: "var(--text-muted)" }}
                        onClick={() => { setPhoneStep("input"); setSmsCode(""); }}
                      >
                        Другой номер
                      </button>
                    </div>
                  )}

                  {phoneError && <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>{phoneError}</div>}
                  {phoneSuccess && <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "#dcfce7", color: "#166534" }}>{phoneSuccess}</div>}
                </div>

                {/* 2FA toggle */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        Двухфакторная аутентификация (SMS)
                      </div>
                      <div className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        При входе потребуется код из SMS
                      </div>
                    </div>
                    {twoFactorEnabled ? (
                      <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ background: "#dcfce7", color: "#166534" }}>Включена</span>
                    ) : (
                      <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>Выключена</span>
                    )}
                  </div>

                  <div className="mt-3">
                    {!twoFactorEnabled ? (
                      <button
                        onClick={() => { setTwoFaError(""); enableTwoFactorMutation.mutate(); }}
                        disabled={enableTwoFactorMutation.isPending || !phoneVerified}
                        className="rounded-lg px-5 py-2.5 text-base font-medium text-white transition-all hover:scale-105"
                        style={{ background: "var(--accent)", fontFamily: "var(--font-body)", opacity: !phoneVerified ? 0.5 : 1 }}
                      >
                        {enableTwoFactorMutation.isPending ? "Включаем..." : "Включить 2FA"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={disable2faPassword}
                          onChange={(e) => setDisable2faPassword(e.target.value)}
                          placeholder="Введите пароль для отключения"
                          className="flex-1 rounded-lg px-4 py-2.5 text-base outline-none"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                        />
                        <button
                          onClick={() => { setTwoFaError(""); disableTwoFactorMutation.mutate({ password: disable2faPassword }); }}
                          disabled={disableTwoFactorMutation.isPending || !disable2faPassword}
                          className="rounded-lg px-4 py-2.5 text-base font-medium shrink-0"
                          style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)", fontFamily: "var(--font-body)" }}
                        >
                          {disableTwoFactorMutation.isPending ? "..." : "Отключить"}
                        </button>
                      </div>
                    )}
                    {!phoneVerified && !twoFactorEnabled && (
                      <p className="text-sm mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        Сначала подтвердите номер телефона
                      </p>
                    )}
                  </div>

                  {twoFaError && <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>{twoFaError}</div>}
                  {twoFaSuccess && <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "#dcfce7", color: "#166534" }}>{twoFaSuccess}</div>}
                </div>
              </div>
            </div>

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
