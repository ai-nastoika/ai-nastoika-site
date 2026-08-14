import { useState, useCallback, useRef, type ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shield, Gavel, Check, X, Eye, Clock, User, AlertCircle, Sparkles, Upload, Plus, Trash2, Search, ArrowUpDown, Mail, Reply } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ═══════════════════════════════════════
   Типы
   ═══════════════════════════════════════ */
type IngredientInput = { name: string; amount?: string; note?: string };
type StepInput = { stepNum: number; title?: string; text: string };
type TrackerStageInput = { stageType: string; title: string; dayOffset: number; repeatEveryDays?: number };

const EMPTY_RECIPE = {
  slug: "", title: "", subtitle: "", category: "sweet", categoryLabel: "",
  heroImage: "", abv: "", time: "", difficulty: "", rating: "",
  reviews: 0, year: "", origin: "", historyTitle: "", historyText: "",
  tastingColor: "", tastingDescription: "", tastingTemp: "", tastingGlass: "",
  tastingPairing: [] as string[], sweet: 0, sour: 0, bitter: 0, spicy: 0, fruity: 0, herbal: 0,
  tips: [] as string[], authorName: "", authorDate: "",
  ingredients: [] as IngredientInput[], steps: [] as StepInput[], trackerStages: [] as TrackerStageInput[],
};

const EMPTY_PLACE = {
  slug: "", name: "", city: "", address: "", metro: "", phone: "",
  website: "", lat: "", lng: "", rating: "", reviews: 0, price: "", hours: "", image: "",
  tags: [] as string[], description: "", infusionsHighlight: "", infusionsSignature: "",
  externalSource: "", externalSummary: "", externalPros: [] as string[], externalCons: [] as string[],
};

const CATEGORIES = [
  { value: "berry",     label: "🫐 Ягодная"      },
  { value: "fruit",     label: "🍎 Фруктовая"    },
  { value: "citrus",    label: "🍋 Цитрусовая"   },
  { value: "herbal",    label: "🌿 Травяная"     },
  { value: "spiced",    label: "🌶️ Пряная"       },
  { value: "bitter",    label: "🌱 Горькая"      },
  { value: "sweet",     label: "🍒 Сладкая"      },
  { value: "honey",     label: "🍯 Медовая"      },
  { value: "coffee",    label: "☕ Кофейная"     },
  { value: "floral",    label: "🌸 Цветочная"    },
  { value: "nut",       label: "🌰 Ореховая"     },
  { value: "root",      label: "🫚 Корневая"     },
  { value: "chocolate", label: "🍫 Шоколадная"   },
  { value: "vegetable", label: "🥬 Овощная"      },
];

const CATEGORY_LABELS: Record<string, string> = {
  berry: "Ягодная", fruit: "Фруктовая", citrus: "Цитрусовая",
  herbal: "Травяная", spiced: "Пряная", bitter: "Горькая",
  sweet: "Сладкая", honey: "Медовая", coffee: "Кофейная",
  floral: "Цветочная", nut: "Ореховая", root: "Корневая",
  chocolate: "Шоколадная", vegetable: "Овощная",
};

const DIFFICULTIES = ["Легко", "Средне", "Сложно"];

/* ═══════════════════════════════════════
   localStorage helpers (fallback when API down)
   ═══════════════════════════════════════ */
const LS_KEY = "local-recipes";

type LocalRecipe = {
  id: number; /* negative = local */
  slug: string;
  title: string;
  subtitle: string | null;
  category: string;
  categoryLabel: string | null;
  heroImage: string | null;
  abv: string | null;
  time: string | null;
  difficulty: string | null;
  rating: string | null;
  reviews: number | null;
  year: string | null;
  origin: string | null;
  historyTitle: string | null;
  historyText: string | null;
  tastingColor: string | null;
  tastingDescription: string | null;
  tastingTemp: string | null;
  tastingGlass: string | null;
  tastingPairing: string[] | null;
  sweet: number | null;
  sour: number | null;
  bitter: number | null;
  spicy: number | null;
  fruity: number | null;
  herbal: number | null;
  tips: string[] | null;
  authorName: string | null;
  authorDate: string | null;
};

function getLocalRecipes(): LocalRecipe[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalRecipe(data: Omit<LocalRecipe, "id">) {
  const list = getLocalRecipes();
  const id = -(Date.now()); /* negative = local */
  list.unshift({ ...data, id });
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  return id;
}

function deleteLocalRecipe(id: number) {
  const list = getLocalRecipes().filter((r) => r.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function jsonArr(val: string): string[] {
  return val.split("\n").map((s) => s.trim()).filter(Boolean);
}
function arrStr(arr?: string[] | null): string {
  return (arr ?? []).join("\n");
}

/* ═══════════════════════════════════════
   AdminPage
   ═══════════════════════════════════════ */
export default function AdminPage() {
  const { isLoggedIn, isLoading, isAdmin } = useAuth();

  /* Защита: только админы */
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--card-bg)" }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </main>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--card-bg)" }}>
        <div className="text-center max-w-md">
          <Shield size={48} className="mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Доступ ограничен
          </h1>
          <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
            {isLoggedIn
              ? "Эта страница доступна только администраторам проекта."
              : "Войдите в аккаунт администратора для доступа к этой странице."}
          </p>
          {!isLoggedIn && (
            <a
              href="/#/login"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
              style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
            >
              Войти
            </a>
          )}
        </div>
      </main>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("recipes");
  const [localRecipes, setLocalRecipes] = useState<LocalRecipe[]>(getLocalRecipes);
  const [saveNotice, setSaveNotice] = useState("");

  /* Queries */
  const { data: apiRecipes, isLoading: rLoading } = trpc.recipe.list.useQuery();
  const { data: apiPlaces, isLoading: pLoading } = trpc.place.list.useQuery();
  const { data: labelTemplatesCount } = trpc.labelTemplate.list.useQuery();
  const { data: submissionsCount } = trpc.submission.listAll.useQuery();
  const { data: placeSubmissionsCount } = trpc.placeSubmission.listAll.useQuery();
  const { data: usersCount } = trpc.user.list.useQuery();
  const { data: feedbackCount } = trpc.feedback.list.useQuery();

  /* Merge: API first, then local, then fallback */
  const recipes = [
    ...(apiRecipes ?? []),
    ...localRecipes.filter((lr) => !(apiRecipes ?? []).some((ar) => ar.slug === lr.slug)),
  ];
  const displayRecipes = recipes;
  const places = apiPlaces ?? [];

  /* Mutations */
  const deleteRecipe = trpc.recipe.delete.useMutation({
    onSuccess: () => utils.recipe.list.invalidate(),
  });
  const deletePlace = trpc.place.delete.useMutation({
    onSuccess: () => utils.place.list.invalidate(),
  });
  const checkWebsitesNow = trpc.place.checkWebsitesNow.useMutation({
    onSuccess: (result) => {
      utils.place.list.invalidate();
      alert(`Проверено: ${result.checked}\nДоступно: ${result.ok}\nНедоступно: ${result.unreachable}`);
    },
  });
  const upsertRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => { utils.recipe.list.invalidate(); setRecipeOpen(false); resetRecipe(); setSaveNotice(""); },
    onError: (_err, variables) => {
      /* API down — save to localStorage */
      const data = variables as Record<string, unknown>;
      saveLocalRecipe({
        slug: String(data.slug ?? ""),
        title: String(data.title ?? ""),
        subtitle: String(data.subtitle ?? "") || null,
        category: String(data.category ?? ""),
        categoryLabel: String(data.categoryLabel ?? "") || null,
        heroImage: String(data.heroImage ?? "") || null,
        abv: String(data.abv ?? "") || null,
        time: String(data.time ?? "") || null,
        difficulty: String(data.difficulty ?? "") || null,
        rating: String(data.rating ?? "") || null,
        reviews: Number(data.reviews ?? 0) || null,
        year: String(data.year ?? "") || null,
        origin: String(data.origin ?? "") || null,
        historyTitle: String(data.historyTitle ?? "") || null,
        historyText: String(data.historyText ?? "") || null,
        tastingColor: String(data.tastingColor ?? "") || null,
        tastingDescription: String(data.tastingDescription ?? "") || null,
        tastingTemp: String(data.tastingTemp ?? "") || null,
        tastingGlass: String(data.tastingGlass ?? "") || null,
        tastingPairing: Array.isArray(data.tastingPairing) ? data.tastingPairing : null,
        sweet: Number(data.sweet ?? 0) || null,
        sour: Number(data.sour ?? 0) || null,
        bitter: Number(data.bitter ?? 0) || null,
        spicy: Number(data.spicy ?? 0) || null,
        fruity: Number(data.fruity ?? 0) || null,
        herbal: Number(data.herbal ?? 0) || null,
        tips: Array.isArray(data.tips) ? data.tips : null,
        authorName: String(data.authorName ?? "") || null,
        authorDate: String(data.authorDate ?? "") || null,
      });
      setLocalRecipes(getLocalRecipes());
      setRecipeOpen(false);
      resetRecipe();
      setSaveNotice(`Рецепт «${data.title}» сохранён локально (API недоступен). На VPS с запущенным бэкендом он попадёт в базу автоматически.`);
    },
  });

  /* Массовая ИИ-разметка этапов трекера для уже существующих рецептов без плана */
  const { data: recipesWithoutTrackerStages } = trpc.recipe.listWithoutTrackerStages.useQuery();
  const generateOneTrackerStages = trpc.recipe.generateTrackerStagesAI.useMutation();
  const [bulkTrackerProgress, setBulkTrackerProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);

  async function runBulkTrackerStagesAI() {
    const list = recipesWithoutTrackerStages ?? [];
    if (list.length === 0) return;
    setBulkTrackerProgress({ done: 0, total: list.length, failed: [] });
    const failed: string[] = [];
    for (let i = 0; i < list.length; i++) {
      try {
        await generateOneTrackerStages.mutateAsync({ recipeId: list[i].id });
      } catch {
        failed.push(list[i].title);
      }
      setBulkTrackerProgress({ done: i + 1, total: list.length, failed: [...failed] });
    }
    utils.recipe.listWithoutTrackerStages.invalidate();
    utils.recipe.list.invalidate();
  }

  const upsertPlace = trpc.place.upsert.useMutation({
    onSuccess: () => { utils.place.list.invalidate(); setPlaceOpen(false); resetPlace(); },
  });

  /* Recipe form state */
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState<number | undefined>();
  const [rForm, setRForm] = useState({ ...EMPTY_RECIPE });
  const [pairingStr, setPairingStr] = useState("");
  const [tipsStr, setTipsStr] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeSort, setRecipeSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "id", dir: "desc" });

  function resetRecipe() {
    setRForm({ ...EMPTY_RECIPE });
    setPairingStr(""); setTipsStr(""); setEditRecipeId(undefined);
  }
  async function startEditRecipe(r: NonNullable<typeof recipes>[0]) {
    setEditRecipeId(r.id);
    // Загружаем полный рецепт с ингредиентами и шагами
    const full = await utils.recipe.bySlugAdmin.fetch({ slug: r.slug });
    const ings: IngredientInput[] = (full?.ingredients ?? []).map((i: any) => ({
      name: i.name ?? "", amount: i.amount ?? "", note: i.note ?? "",
    }));
    const stps: StepInput[] = (full?.steps ?? []).map((s: any) => ({
      stepNum: s.stepNum ?? 1, title: s.title ?? "", text: s.text ?? "",
    }));
    const trackerStgs: TrackerStageInput[] = (full?.trackerStages ?? []).map((s: any) => ({
      stageType: s.stageType, title: s.title, dayOffset: s.dayOffset, repeatEveryDays: s.repeatEveryDays ?? undefined,
    }));
    setRForm({
      ...EMPTY_RECIPE,
      slug: r.slug, title: r.title, subtitle: r.subtitle ?? "",
      category: r.category, categoryLabel: r.categoryLabel ?? "",
      heroImage: r.heroImage ?? "", abv: r.abv ?? "", time: r.time ?? "",
      difficulty: r.difficulty ?? "", rating: String(r.rating ?? ""),
      reviews: r.reviews ?? 0, year: r.year ?? "", origin: r.origin ?? "",
      historyTitle: r.historyTitle ?? "", historyText: r.historyText ?? "",
      tastingColor: r.tastingColor ?? "", tastingDescription: r.tastingDescription ?? "",
      tastingTemp: r.tastingTemp ?? "", tastingGlass: r.tastingGlass ?? "",
      tastingPairing: r.tastingPairing ?? [],
      sweet: r.sweet ?? 0, sour: r.sour ?? 0, bitter: r.bitter ?? 0,
      spicy: r.spicy ?? 0, fruity: r.fruity ?? 0, herbal: r.herbal ?? 0,
      tips: r.tips ?? [],
      authorName: r.authorName ?? "", authorDate: r.authorDate ?? "",
      ingredients: ings, steps: stps, trackerStages: trackerStgs,
    });
    setPairingStr(arrStr(r.tastingPairing));
    setTipsStr(arrStr(r.tips));
    setRecipeOpen(true);
  }
  function submitRecipe() {
    const data = {
      ...rForm,
      id: editRecipeId,
      rating: rForm.rating || undefined,
      tastingPairing: jsonArr(pairingStr),
      tips: jsonArr(tipsStr),
      ingredients: rForm.ingredients.length > 0 ? rForm.ingredients : undefined,
      steps: rForm.steps.length > 0 ? rForm.steps : undefined,
      trackerStages: rForm.trackerStages.length > 0 ? rForm.trackerStages : undefined,
    };
    upsertRecipe.mutate(data);
  }

  /* Place form state */
  const [placeOpen, setPlaceOpen] = useState(false);
  const [editPlaceId, setEditPlaceId] = useState<number | undefined>();
  const [pForm, setPForm] = useState({ ...EMPTY_PLACE });
  const [tagsStr, setTagsStr] = useState("");
  const [prosStr, setProsStr] = useState("");
  const [consStr, setConsStr] = useState("");

  function resetPlace() {
    setPForm({ ...EMPTY_PLACE });
    setTagsStr(""); setProsStr(""); setConsStr(""); setEditPlaceId(undefined);
  }
  function startEditPlace(p: NonNullable<typeof places>[0]) {
    setEditPlaceId(p.id);
    setPForm({
      ...EMPTY_PLACE,
      slug: p.slug, name: p.name, city: p.city ?? "", address: p.address ?? "",
      metro: p.metro ?? "", phone: p.phone ?? "", website: p.website ?? "",
      lat: p.lat !== null && p.lat !== undefined ? String(p.lat) : "",
      lng: p.lng !== null && p.lng !== undefined ? String(p.lng) : "",
      rating: String(p.rating ?? ""), reviews: p.reviews ?? 0,
      price: p.price ?? "", hours: p.hours ?? "", image: p.image ?? "",
      tags: p.tags ?? [], description: p.description ?? "",
      infusionsHighlight: p.infusionsHighlight ?? "", infusionsSignature: p.infusionsSignature ?? "",
      externalSource: p.externalSource ?? "", externalSummary: p.externalSummary ?? "",
      externalPros: p.externalPros ?? [], externalCons: p.externalCons ?? [],
    });
    setTagsStr(arrStr(p.tags));
    setProsStr(arrStr(p.externalPros));
    setConsStr(arrStr(p.externalCons));
    setPlaceOpen(true);
  }
  function submitPlace() {
    const latNum = pForm.lat.trim() === "" ? undefined : Number(pForm.lat.replace(",", "."));
    const lngNum = pForm.lng.trim() === "" ? undefined : Number(pForm.lng.replace(",", "."));
    if (pForm.lat.trim() !== "" && Number.isNaN(latNum)) {
      alert("Широта указана некорректно — введите число, например 55.751244");
      return;
    }
    if (pForm.lng.trim() !== "" && Number.isNaN(lngNum)) {
      alert("Долгота указана некорректно — введите число, например 37.618423");
      return;
    }
    const { lat, lng, ...rest } = pForm;
    const data = {
      ...rest,
      id: editPlaceId,
      lat: latNum,
      lng: lngNum,
      rating: pForm.rating || undefined,
      tags: jsonArr(tagsStr),
      externalPros: jsonArr(prosStr),
      externalCons: jsonArr(consStr),
    };
    upsertPlace.mutate(data);
  }

  /* ═══════════════════════════════════════
     Render
     ═══════════════════════════════════════ */
  return (
    <main className="min-h-screen px-4 py-8 md:px-8" style={{ background: "var(--card-bg)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-heading)", color: "var(--accent)" }}>
          Админ-панель
        </h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="recipes">Рецепты ({recipes?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="places">Места ({places?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="labelTemplates">Этикетки ({labelTemplatesCount?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="moderation">Модерация ({submissionsCount?.filter(s => s.status === "pending").length ?? 0})</TabsTrigger>
            <TabsTrigger value="placeSubmissions">Заявки на заведения ({placeSubmissionsCount?.filter(s => s.status === "pending").length ?? 0})</TabsTrigger>
            <TabsTrigger value="users">Пользователи ({usersCount?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="feedback">Обращения ({feedbackCount?.filter(f => f.status !== "replied" && f.status !== "archived").length ?? 0})</TabsTrigger>
          </TabsList>

          {/* ─── Уведомление о локальном сохранении ─── */}
          {saveNotice && (
            <div className="mb-4 p-4 rounded-lg text-sm" style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e" }}>
              {saveNotice}
              <button className="ml-2 underline" onClick={() => setSaveNotice("")}>Закрыть</button>
            </div>
          )}

          {/* ─── Рецепты ─── */}
          <TabsContent value="recipes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle>Список рецептов</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {(recipesWithoutTrackerStages?.length ?? 0) > 0 && (
                    <Button size="sm" variant="outline" disabled={!!bulkTrackerProgress && bulkTrackerProgress.done < bulkTrackerProgress.total}
                      onClick={runBulkTrackerStagesAI}>
                      <Sparkles size={14} className="mr-1" />
                      {bulkTrackerProgress && bulkTrackerProgress.done < bulkTrackerProgress.total
                        ? `Размечаю... ${bulkTrackerProgress.done}/${bulkTrackerProgress.total}`
                        : `Разметить этапы трекера для ${recipesWithoutTrackerStages?.length} рецептов без плана`}
                    </Button>
                  )}
                  {bulkTrackerProgress && bulkTrackerProgress.done === bulkTrackerProgress.total && bulkTrackerProgress.failed.length > 0 && (
                    <span className="text-xs" style={{ color: "#dc2626" }}>
                      Не удалось: {bulkTrackerProgress.failed.join(", ")}
                    </span>
                  )}
                  <Dialog open={recipeOpen} onOpenChange={(o) => { if (!o) resetRecipe(); setRecipeOpen(o); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { resetRecipe(); setRecipeOpen(true); }}>
                        + Добавить рецепт
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editRecipeId ? "Редактировать" : "Новый"} рецепт</DialogTitle>
                    </DialogHeader>
                    <RecipeForm
                      form={rForm} setForm={setRForm}
                      pairingStr={pairingStr} setPairingStr={setPairingStr}
                      tipsStr={tipsStr} setTipsStr={setTipsStr}
                      editRecipeId={editRecipeId}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => { resetRecipe(); setRecipeOpen(false); }}>Отмена</Button>
                      <Button onClick={submitRecipe} disabled={upsertRecipe.isPending}>
                        {upsertRecipe.isPending ? "Сохраняю..." : "Сохранить"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Поиск */}
                <div className="mb-4 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <Input
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder="Поиск по названию, slug, категории..."
                    className="pl-9"
                  />
                </div>
                {rLoading ? (
                  <p>Загрузка...</p>
                ) : !displayRecipes?.length ? (
                  <p className="text-muted-foreground">Нет рецептов</p>
                ) : (() => {
                  // Фильтрация
                  const q = recipeSearch.toLowerCase();
                  const filtered = displayRecipes.filter((r) =>
                    !q || r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || (r.categoryLabel || r.category || "").toLowerCase().includes(q)
                  );
                  // Сортировка
                  const sorted = [...filtered].sort((a, b) => {
                    const { key, dir } = recipeSort;
                    const av = (a as any)[key] ?? "";
                    const bv = (b as any)[key] ?? "";
                    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
                    return dir === "asc" ? cmp : -cmp;
                  });
                  const toggleSort = (key: string) => {
                    setRecipeSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
                  };
                  const SortHead = ({ k, label }: { k: string; label: string }) => (
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(k)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <ArrowUpDown size={12} style={{ opacity: recipeSort.key === k ? 1 : 0.3 }} />
                      </span>
                    </TableHead>
                  );
                  return (
                    <>
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Показано: {sorted.length} из {displayRecipes.length}</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <SortHead k="id" label="ID" />
                            <SortHead k="title" label="Название" />
                            <SortHead k="slug" label="Slug" />
                            <SortHead k="category" label="Категория" />
                            <TableHead className="text-right">Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sorted.map((r) => {
                            const isLocal = r.id < 0;
                            return (
                              <TableRow key={r.id} style={isLocal ? { background: "rgba(254, 243, 199, 0.3)" } : undefined}>
                                <TableCell>
                                  {r.id}
                                  {isLocal && <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "#fde68a", color: "#92400e" }}>local</span>}
                                </TableCell>
                                <TableCell className="font-medium">{r.title}</TableCell>
                                <TableCell className="text-muted-foreground">{r.slug}</TableCell>
                                <TableCell>{r.categoryLabel || r.category}</TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button size="sm" variant="outline" onClick={() => startEditRecipe(r)}>
                                    Изменить
                                  </Button>
                                  <Button size="sm"
                                    style={{ background: "#dc2626", color: "#fff", border: "none" }}
                                    onClick={() => {
                                      if (!confirm("Удалить рецепт?")) return;
                                      if (isLocal) {
                                        deleteLocalRecipe(r.id);
                                        setLocalRecipes(getLocalRecipes());
                                      } else {
                                        deleteRecipe.mutate({ id: r.id });
                                      }
                                    }}>
                                    <Trash2 size={14} className="mr-1" />
                                    Удалить
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Шаблоны этикеток ─── */}
          <TabsContent value="labelTemplates">
            <LabelTemplatesAdmin />
          </TabsContent>

          {/* ─── Места ─── */}
          <TabsContent value="places">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Список мест</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => checkWebsitesNow.mutate()} disabled={checkWebsitesNow.isPending}>
                    {checkWebsitesNow.isPending ? "Проверяю сайты..." : "Проверить сайты сейчас"}
                  </Button>
                  <Dialog open={placeOpen} onOpenChange={(o) => { if (!o) resetPlace(); setPlaceOpen(o); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { resetPlace(); setPlaceOpen(true); }}>
                      + Добавить место
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editPlaceId ? "Редактировать" : "Новое"} место</DialogTitle>
                    </DialogHeader>
                    <PlaceForm
                      form={pForm} setForm={setPForm}
                      tagsStr={tagsStr} setTagsStr={setTagsStr}
                      prosStr={prosStr} setProsStr={setProsStr}
                      consStr={consStr} setConsStr={setConsStr}
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => { resetPlace(); setPlaceOpen(false); }}>Отмена</Button>
                      <Button onClick={submitPlace} disabled={upsertPlace.isPending}>
                        {upsertPlace.isPending ? "Сохраняю..." : "Сохранить"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {pLoading ? (
                  <p>Загрузка...</p>
                ) : !places?.length ? (
                  <p className="text-muted-foreground">Нет мест</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>Город</TableHead>
                        <TableHead>Сайт</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {places.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.id}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.city}</TableCell>
                          <TableCell>
                            {!p.website ? (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                            ) : (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={
                                  p.websiteStatus === "ok"
                                    ? { background: "#d8f3dc", color: "#386641" }
                                    : p.websiteStatus === "unreachable"
                                    ? { background: "#fee2e2", color: "#991b1b" }
                                    : { background: "#f3f4f6", color: "#6b7280" }
                                }
                                title={p.websiteLastCheckedAt ? `Проверено: ${new Date(p.websiteLastCheckedAt).toLocaleDateString("ru-RU")}` : "Ещё не проверялось"}
                              >
                                {p.websiteStatus === "ok" ? "Доступен" : p.websiteStatus === "unreachable" ? "Недоступен" : "Не проверялся"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => startEditPlace(p)}>
                              Изменить
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => { if (confirm("Удалить место?")) deletePlace.mutate({ id: p.id }); }}>
                              Удалить
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Модерация заявок ─── */}
          <TabsContent value="moderation">
            <ModerationTab />
          </TabsContent>
          <TabsContent value="placeSubmissions">
            <PlaceModerationTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="feedback">
            <FeedbackTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════
   RecipeForm
   ═══════════════════════════════════════ */
function RecipeForm({
  form, setForm,
  pairingStr, setPairingStr,
  tipsStr, setTipsStr,
  editRecipeId,
}: {
  form: typeof EMPTY_RECIPE; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_RECIPE>>;
  pairingStr: string; setPairingStr: (v: string) => void;
  tipsStr: string; setTipsStr: (v: string) => void;
  editRecipeId?: number;
}) {
  const f = form;
  const update = (patch: Partial<typeof f>) => setForm((prev) => ({ ...prev, ...patch }));
  const utils = trpc.useUtils();
  const aiTrackerStages = trpc.recipe.generateTrackerStagesAI.useMutation({
    onSuccess: (data) => {
      update({ trackerStages: data.stages.map((s) => ({ stageType: s.stageType, title: s.title, dayOffset: s.dayOffset, repeatEveryDays: s.repeatEveryDays })) });
      utils.recipe.list.invalidate();
    },
    onError: (err) => alert("Ошибка ИИ-разметки: " + err.message),
  });
  const num = (v: string) => (v === "" ? 0 : Number(v));
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) { alert("Допустимые форматы: JPG, PNG, WebP"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Максимальный размер — 5 МБ"); return; }
    // Проверка ориентации
    const img = new Image();
    const url = URL.createObjectURL(file);
    const isLandscape = await new Promise<boolean>((resolve) => {
      img.onload = () => { URL.revokeObjectURL(url); resolve(img.width >= img.height); };
      img.src = url;
    });
    if (!isLandscape) { alert("Используйте картинку в альбомной (горизонтальной) ориентации"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.path) {
        update({ heroImage: data.path });
      } else {
        alert("Ошибка загрузки: " + (data.error || "неизвестная ошибка"));
      }
    } catch { alert("Ошибка загрузки файла"); }
    finally { setUploading(false); if (heroFileRef.current) heroFileRef.current.value = ""; }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug (URL)*" value={f.slug} onChange={(v) => update({ slug: v })} />
        <Field label="Название*" value={f.title} onChange={(v) => update({ title: v })} />
      </div>
      <Field label="Подзаголовок" value={f.subtitle} onChange={(v) => update({ subtitle: v })} />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Категория*</Label>
          <select className="w-full h-10 rounded-md border px-3 text-sm mt-1" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} value={f.category} onChange={(e) => update({ category: e.target.value, categoryLabel: CATEGORY_LABELS[e.target.value] || "" })}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <Field label="Метка категории" value={f.categoryLabel} onChange={(v) => update({ categoryLabel: v })} />
        <div>
          <Label className="text-xs">Изображение (hero)</Label>
          <div className="flex gap-1 mt-1">
            <Input value={f.heroImage} onChange={(e) => update({ heroImage: e.target.value })} placeholder="/uploads/recipes/..." className="flex-1" />
            <input ref={heroFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleHeroUpload} />
            <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => heroFileRef.current?.click()} className="shrink-0 h-10">
              {uploading ? "..." : <Upload size={14} />}
            </Button>
          </div>
          {f.heroImage && (
            <img src={f.heroImage} alt="Превью" className="mt-2 h-20 rounded object-cover" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Field label="Крепость (ABV)" value={f.abv} onChange={(v) => update({ abv: v })} />
        <Field label="Время" value={f.time} onChange={(v) => update({ time: v })} />
        <div>
          <Label className="text-xs">Сложность</Label>
          <select className="w-full h-10 rounded-md border px-3 text-sm mt-1" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} value={f.difficulty} onChange={(e) => update({ difficulty: e.target.value })}>
            <option value="">—</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <Field label="Год / Период" value={f.year} onChange={(v) => update({ year: v })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Рейтинг" value={f.rating} onChange={(v) => update({ rating: v })} />
        <Field label="Отзывы (число)" value={String(f.reviews)} onChange={(v) => update({ reviews: num(v) })} />
        <Field label="Происхождение" value={f.origin} onChange={(v) => update({ origin: v })} />
      </div>

      <h3 className="font-semibold mt-4" style={{ color: "var(--accent)" }}>История</h3>
      <Field label="Заголовок истории" value={f.historyTitle} onChange={(v) => update({ historyTitle: v })} />
      <Area label="Текст истории" value={f.historyText} onChange={(v) => update({ historyText: v })} />

      <h3 className="font-semibold mt-4" style={{ color: "var(--accent)" }}>Дегустация</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Цвет" value={f.tastingColor} onChange={(v) => update({ tastingColor: v })} />
        <Field label="Температура подачи" value={f.tastingTemp} onChange={(v) => update({ tastingTemp: v })} />
      </div>
      <Field label="Бокал" value={f.tastingGlass} onChange={(v) => update({ tastingGlass: v })} />
      <Area label="Описание вкуса" value={f.tastingDescription} onChange={(v) => update({ tastingDescription: v })} />
      <Area label="Сочетания (по строкам)" value={pairingStr} onChange={setPairingStr} placeholder="Сыр\nШоколад\nМясо" />

      <h3 className="font-semibold mt-4" style={{ color: "var(--accent)" }}>Вкусовой профиль (0-100)</h3>
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ["sweet", "Сладость"],
            ["sour", "Кислотность"],
            ["bitter", "Горечь"],
            ["spicy", "Острота"],
            ["fruity", "Фруктовость"],
            ["herbal", "Травянистость"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              type="number" min={0} max={100}
              value={f[key]}
              onChange={(e) => update({ [key]: num(e.target.value) })}
            />
          </div>
        ))}
      </div>

      <Area label="Советы (по строкам)" value={tipsStr} onChange={setTipsStr} placeholder="Совет 1\nСовет 2" />

      <h3 className="font-semibold mt-4" style={{ color: "var(--accent)" }}>Автор</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Имя автора" value={f.authorName} onChange={(v) => update({ authorName: v })} />
        <Field label="Дата" value={f.authorDate} onChange={(v) => update({ authorDate: v })} />
      </div>

      {/* Ингредиенты */}
      <div className="flex items-center justify-between mt-4">
        <h3 className="font-semibold" style={{ color: "var(--accent)" }}>Ингредиенты ({f.ingredients.length})</h3>
        <Button type="button" size="sm" variant="outline" onClick={() => update({ ingredients: [...f.ingredients, { name: "", amount: "", note: "" }] })}>
          <Plus size={14} className="mr-1" /> Добавить
        </Button>
      </div>
      {f.ingredients.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Нет ингредиентов</p>}
      {f.ingredients.map((ing, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5">
            <Label className="text-xs">Название</Label>
            <Input value={ing.name} onChange={(e) => {
              const arr = [...f.ingredients]; arr[i] = { ...arr[i], name: e.target.value }; update({ ingredients: arr });
            }} />
          </div>
          <div className="col-span-3">
            <Label className="text-xs">Количество</Label>
            <Input value={ing.amount ?? ""} onChange={(e) => {
              const arr = [...f.ingredients]; arr[i] = { ...arr[i], amount: e.target.value }; update({ ingredients: arr });
            }} />
          </div>
          <div className="col-span-3">
            <Label className="text-xs">Примечание</Label>
            <Input value={ing.note ?? ""} onChange={(e) => {
              const arr = [...f.ingredients]; arr[i] = { ...arr[i], note: e.target.value }; update({ ingredients: arr });
            }} />
          </div>
          <div className="col-span-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => update({ ingredients: f.ingredients.filter((_, j) => j !== i) })}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}

      {/* Шаги */}
      <div className="flex items-center justify-between mt-4">
        <h3 className="font-semibold" style={{ color: "var(--accent)" }}>Шаги ({f.steps.length})</h3>
        <Button type="button" size="sm" variant="outline" onClick={() => {
          const next = f.steps.length > 0 ? Math.max(...f.steps.map((s) => s.stepNum)) + 1 : 1;
          update({ steps: [...f.steps, { stepNum: next, title: "", text: "" }] });
        }}>
          <Plus size={14} className="mr-1" /> Добавить
        </Button>
      </div>
      {f.steps.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Нет шагов</p>}
      {f.steps.map((s, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="col-span-1">
            <Label className="text-xs">№</Label>
            <Input type="number" value={s.stepNum} onChange={(e) => {
              const arr = [...f.steps]; arr[i] = { ...arr[i], stepNum: Number(e.target.value) }; update({ steps: arr });
            }} />
          </div>
          <div className="col-span-3">
            <Label className="text-xs">Заголовок</Label>
            <Input value={s.title ?? ""} onChange={(e) => {
              const arr = [...f.steps]; arr[i] = { ...arr[i], title: e.target.value }; update({ steps: arr });
            }} />
          </div>
          <div className="col-span-7">
            <Label className="text-xs">Описание</Label>
            <Textarea value={s.text} onChange={(e) => {
              const arr = [...f.steps]; arr[i] = { ...arr[i], text: e.target.value }; update({ steps: arr });
            }} className="min-h-[60px]" />
          </div>
          <div className="col-span-1 pt-5">
            <Button type="button" size="sm" variant="ghost" onClick={() => update({ steps: f.steps.filter((_, j) => j !== i) })}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}

      {/* Этапы Трекера созревания — отдельный внутренний блок, НЕ показывается на странице рецепта.
          Не привязан к шагам выше: один шаг рецепта может содержать несколько таких этапов или ни одного. */}
      <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px dashed var(--border)" }}>
        <div>
          <h3 className="font-semibold" style={{ color: "var(--accent)" }}>Этапы Трекера созревания ({f.trackerStages.length})</h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Не отображается на странице рецепта — используется только для автозаполнения трекера</p>
        </div>
        <div className="flex gap-2">
          {editRecipeId && (
            <Button type="button" size="sm" variant="outline" disabled={aiTrackerStages.isPending}
              onClick={() => aiTrackerStages.mutate({ recipeId: editRecipeId })}>
              <Sparkles size={14} className="mr-1" /> {aiTrackerStages.isPending ? "Разметка..." : "Разметить через ИИ"}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline"
            onClick={() => update({ trackerStages: [...f.trackerStages, { stageType: "pour", title: "", dayOffset: 0 }] })}>
            <Plus size={14} className="mr-1" /> Добавить
          </Button>
        </div>
      </div>
      {!editRecipeId && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Разметка через ИИ доступна после первого сохранения рецепта.</p>
      )}
      {f.trackerStages.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Этапов нет — трекер будет использовать обобщённый запасной план</p>}
      {f.trackerStages.map((s, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="col-span-3">
            <Label className="text-xs">Тип этапа</Label>
            <select
              value={s.stageType}
              onChange={(e) => {
                const arr = [...f.trackerStages]; arr[i] = { ...arr[i], stageType: e.target.value }; update({ trackerStages: arr });
              }}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
            >
              <option value="pour">Поставить</option>
              <option value="shake">Взболтать</option>
              <option value="strain">Слить/процедить</option>
              <option value="rest">Дать отстояться</option>
              <option value="add_ingredient">Добавить ингредиент</option>
              <option value="taste">Дегустация</option>
              <option value="custom">Другое</option>
            </select>
          </div>
          <div className="col-span-5">
            <Label className="text-xs">Название</Label>
            <Input value={s.title} onChange={(e) => {
              const arr = [...f.trackerStages]; arr[i] = { ...arr[i], title: e.target.value }; update({ trackerStages: arr });
            }} placeholder="напр. Взболтать" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">День от старта</Label>
            <Input type="number" min={0} value={s.dayOffset} onChange={(e) => {
              const arr = [...f.trackerStages]; arr[i] = { ...arr[i], dayOffset: Number(e.target.value) }; update({ trackerStages: arr });
            }} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">Повтор, дн.</Label>
            <Input type="number" min={1} value={s.repeatEveryDays ?? ""} placeholder="—" onChange={(e) => {
              const arr = [...f.trackerStages]; arr[i] = { ...arr[i], repeatEveryDays: e.target.value ? Number(e.target.value) : undefined }; update({ trackerStages: arr });
            }} />
          </div>
          <div className="col-span-1 pt-5">
            <Button type="button" size="sm" variant="ghost" onClick={() => update({ trackerStages: f.trackerStages.filter((_, j) => j !== i) })}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   PlaceForm
   ═══════════════════════════════════════ */
function PlaceForm({
  form, setForm,
  tagsStr, setTagsStr,
  prosStr, setProsStr,
  consStr, setConsStr,
}: {
  form: typeof EMPTY_PLACE; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_PLACE>>;
  tagsStr: string; setTagsStr: (v: string) => void;
  prosStr: string; setProsStr: (v: string) => void;
  consStr: string; setConsStr: (v: string) => void;
}) {
  const f = form;
  const update = (patch: Partial<typeof f>) => setForm((prev) => ({ ...prev, ...patch }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug (URL)*" value={f.slug} onChange={(v) => update({ slug: v })} />
        <Field label="Название*" value={f.name} onChange={(v) => update({ name: v })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Город" value={f.city} onChange={(v) => update({ city: v })} />
        <Field label="Адрес" value={f.address} onChange={(v) => update({ address: v })} />
        <Field label="Метро" value={f.metro} onChange={(v) => update({ metro: v })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Телефон" value={f.phone} onChange={(v) => update({ phone: v })} />
        <Field label="Сайт" value={f.website} onChange={(v) => update({ website: v })} />
        <Field label="Часы работы" value={f.hours} onChange={(v) => update({ hours: v })} />
      </div>
      <div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Широта (lat)" value={f.lat} onChange={(v) => update({ lat: v })} placeholder="55.751244" />
          <Field label="Долгота (lng)" value={f.lng} onChange={(v) => update({ lng: v })} placeholder="37.618423" />
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Откройте заведение на Яндекс.Картах → нажмите на точку → в адресной строке появится <code>ll=37.618423%2C55.751244</code> (это долгота,широта — в обратном порядке!) либо возьмите координаты из панели «Поделиться». Вставьте широту и долготу в соответствующие поля.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Рейтинг" value={f.rating} onChange={(v) => update({ rating: v })} />
        <Field label="Отзывы (число)" value={String(f.reviews)} onChange={(v) => update({ reviews: num(v) })} />
        <Field label="Ценовая категория" value={f.price} onChange={(v) => update({ price: v })} />
      </div>
      <Field label="Изображение" value={f.image} onChange={(v) => update({ image: v })} placeholder="place-name.jpg" />
      <Area label="Теги (по строкам)" value={tagsStr} onChange={setTagsStr} placeholder="настойки\nавторские коктейли" />
      <Area label="Описание" value={f.description} onChange={(v) => update({ description: v })} />
      <Field label="Изюминка настоек" value={f.infusionsHighlight} onChange={(v) => update({ infusionsHighlight: v })} />
      <Field label="Фирменная настойка" value={f.infusionsSignature} onChange={(v) => update({ infusionsSignature: v })} />
      <Field label="Внешний источник" value={f.externalSource} onChange={(v) => update({ externalSource: v })} />
      <Area label="Резюме из внешнего источника" value={f.externalSummary} onChange={(v) => update({ externalSummary: v })} />
      <Area label="Плюсы (по строкам)" value={prosStr} onChange={setProsStr} />
      <Area label="Минусы (по строкам)" value={consStr} onChange={setConsStr} />
    </div>
  );
}

const FEEDBACK_TOPIC_LABELS: Record<string, string> = {
  general: "Общий вопрос",
  recipe: "Рецепт / Ошибка",
  bug: "Баг на сайте",
  feature: "Предложение",
  place: "Добавить заведение",
  other: "Другое",
};

function FeedbackTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string>("new");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");

  const { data: items, isLoading } = trpc.feedback.list.useQuery();

  const reply = trpc.feedback.reply.useMutation({
    onSuccess: () => {
      utils.feedback.list.invalidate();
      setExpandedId(null);
      setAnswerDraft("");
    },
  });
  const setStatus = trpc.feedback.setStatus.useMutation({
    onSuccess: () => utils.feedback.list.invalidate(),
  });

  const filtered = (items ?? []).filter((f) => {
    if (filter === "all") return true;
    return f.status === filter;
  });

  const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
    new: { label: "Новое", bg: "#fef3c7", color: "#92400e" },
    read: { label: "Прочитано", bg: "#eff6ff", color: "#1e40af" },
    replied: { label: "Отвечено", bg: "#d8f3dc", color: "#386641" },
    archived: { label: "В архиве", bg: "#f1f1f1", color: "#666" },
  };

  const deleteFeedback = trpc.feedback.delete.useMutation({
    onSuccess: () => utils.feedback.list.invalidate(),
  });

  function startReply(f: NonNullable<typeof items>[0]) {
    setExpandedId(f.id);
    setAnswerDraft(f.answer ?? "");
    if (f.status === "new") setStatus.mutate({ id: f.id, status: "read" });
  }

  function submitReply(id: number) {
    if (!answerDraft.trim()) return;
    reply.mutate({ id, answer: answerDraft.trim() });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail size={20} style={{ color: "var(--accent)" }} />
          Обращения пользователей
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: `Все (${items?.length ?? 0})` },
            { key: "new", label: `Новые (${items?.filter((f) => f.status === "new").length ?? 0})` },
            { key: "read", label: `Прочитаны (${items?.filter((f) => f.status === "read").length ?? 0})` },
            { key: "replied", label: `Отвечены (${items?.filter((f) => f.status === "replied").length ?? 0})` },
            { key: "archived", label: `Архив (${items?.filter((f) => f.status === "archived").length ?? 0})` },
          ].map((opt) => (
            <Button key={opt.key} size="sm" variant={filter === opt.key ? "default" : "outline"} onClick={() => setFilter(opt.key)}>
              {opt.label}
            </Button>
          ))}
        </div>

        {isLoading && <div className="text-sm" style={{ color: "var(--text-muted)" }}>Загрузка...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Обращений нет</div>
        )}

        <div className="space-y-3">
          {filtered.map((f) => {
            const meta = statusMeta[f.status] || statusMeta.new;
            const isExpanded = expandedId === f.id;
            return (
              <div key={f.id} className="rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-3 p-4 cursor-pointer" onClick={() => (isExpanded ? setExpandedId(null) : startReply(f))}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{FEEDBACK_TOPIC_LABELS[f.topic] ?? f.topic}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      {f.name} · {f.email} · {new Date(f.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.message}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {f.status === "archived" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: f.id, status: "new" })}>
                        Вернуть
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: f.id, status: "archived" })}>
                        В архив
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Удалить обращение насовсем? Это необратимо.")) deleteFeedback.mutate({ id: f.id }); }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
                    {f.answer && (
                      <div className="text-xs mt-3 mb-1" style={{ color: "var(--text-muted)" }}>
                        Уже отвечено {f.answeredAt ? new Date(f.answeredAt).toLocaleDateString("ru-RU") : ""} — можно отредактировать ответ ниже.
                      </div>
                    )}
                    <Textarea
                      value={answerDraft}
                      onChange={(e) => setAnswerDraft(e.target.value)}
                      placeholder="Ваш ответ пользователю..."
                      className="mt-2"
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitReply(f.id)} disabled={!answerDraft.trim() || reply.isPending}>
                        <Reply size={14} className="mr-1" /> {reply.isPending ? "Отправка..." : "Отправить ответ"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setExpandedId(null)}>Закрыть</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ModerationTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);

  const { data: submissions, isLoading } = trpc.submission.listAll.useQuery();
  const approve = trpc.submission.approve.useMutation({
    onSuccess: () => { utils.submission.listAll.invalidate(); },
  });
  const reject = trpc.submission.reject.useMutation({
    onSuccess: () => { utils.submission.listAll.invalidate(); setRejectId(null); setRejectNote(""); },
  });
  const publishRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => { utils.recipe.list.invalidate(); },
  });

  const filtered = (submissions ?? []).filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const statusMeta: Record<string, { label: string; bg: string; color: string; icon: ReactNode }> = {
    draft: { label: "Черновик", bg: "#f3f4f6", color: "#6b7280", icon: <Clock size={14} /> },
    ai_processed: { label: "Обработан ИИ", bg: "#eff6ff", color: "#1e40af", icon: <Sparkles size={14} /> },
    pending: { label: "На проверке", bg: "#fef3c7", color: "#92400e", icon: <Gavel size={14} /> },
    approved: { label: "Одобрен", bg: "#d8f3dc", color: "#386641", icon: <Check size={14} /> },
    rejected: { label: "Отклонён", bg: "#fee2e2", color: "#991b1b", icon: <X size={14} /> },
  };

  function handleApprove(s: NonNullable<typeof submissions>[0]) {
    if (!confirm(`Одобрить и опубликовать рецепт «${s.title || s.rawTitle}»?`)) return;
    /* Approve submission */
    approve.mutate({ id: s.id });
    /* Publish to recipes table */
    if (s.title && s.slug) {
      publishRecipe.mutate({
        slug: s.slug,
        title: s.title,
        subtitle: s.subtitle ?? undefined,
        category: s.category || "sweet",
        categoryLabel: s.categoryLabel ?? undefined,
        abv: s.abv ?? undefined,
        time: s.time ?? undefined,
        difficulty: s.difficulty ?? undefined,
        year: s.year ?? undefined,
        origin: s.origin ?? undefined,
        historyTitle: s.historyTitle ?? undefined,
        historyText: s.historyText ?? undefined,
        tastingColor: s.tastingColor ?? undefined,
        tastingDescription: s.tastingDescription ?? undefined,
        tastingTemp: s.tastingTemp ?? undefined,
        tastingGlass: s.tastingGlass ?? undefined,
        authorName: s.authorName ?? undefined,
        authorDate: s.authorDate ?? undefined,
        sweet: s.sweet ?? undefined,
        sour: s.sour ?? undefined,
        bitter: s.bitter ?? undefined,
        spicy: s.spicy ?? undefined,
        fruity: s.fruity ?? undefined,
        herbal: s.herbal ?? undefined,
      });
    }
  }

  function handleReject(id: number) {
    if (!rejectNote.trim()) {
      setRejectId(id);
      return;
    }
    reject.mutate({ id, adminNotes: rejectNote });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel size={20} style={{ color: "var(--accent)" }} />
          Заявки на добавление рецептов
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: `Все (${submissions?.length ?? 0})` },
            { key: "pending", label: `На проверке (${submissions?.filter((s) => s.status === "pending").length ?? 0})` },
            { key: "approved", label: `Одобрены (${submissions?.filter((s) => s.status === "approved").length ?? 0})` },
            { key: "rejected", label: `Отклонены (${submissions?.filter((s) => s.status === "rejected").length ?? 0})` },
            { key: "draft", label: `Черновики (${submissions?.filter((s) => s.status === "draft").length ?? 0})` },
            { key: "ai_processed", label: `Обработаны ИИ (${submissions?.filter((s) => s.status === "ai_processed").length ?? 0})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: filter === f.key ? "var(--accent)" : "var(--surface)",
                color: filter === f.key ? "#fff" : "var(--text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p>Загрузка...</p>
        ) : !filtered.length ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>Нет заявок в выбранной категории</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const meta = statusMeta[s.status] || statusMeta.draft;
              const isExpanded = expandedId === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}
                >
                  {/* Header row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:opacity-80"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <span
                      className="shrink-0 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    <span className="font-medium text-sm flex-1 truncate" style={{ fontFamily: "var(--font-body)" }}>
                      {s.title || s.rawTitle || "(без названия)"}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      <User size={12} className="inline mr-1" />
                      {s.authorName || "Аноним"}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString("ru-RU") : ""}
                    </span>
                    <Eye size={16} style={{ color: "var(--text-muted)" }} />
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                      {/* Raw input */}
                      <div className="pt-3 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                          Исходные данные пользователя
                        </h4>
                        {s.rawDescription && (
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.rawDescription}</p>
                        )}
                        {s.rawIngredients && (
                          <div>
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ингредиенты:</span>
                            <pre className="text-sm mt-1 p-2 rounded" style={{ background: "var(--surface)", whiteSpace: "pre-wrap" }}>{s.rawIngredients}</pre>
                          </div>
                        )}
                        {s.rawSteps && (
                          <div>
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Шаги:</span>
                            <pre className="text-sm mt-1 p-2 rounded" style={{ background: "var(--surface)", whiteSpace: "pre-wrap" }}>{s.rawSteps}</pre>
                          </div>
                        )}
                        {s.rawNotes && (
                          <div>
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Заметки:</span>
                            <p className="text-sm mt-1">{s.rawNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* AI-processed data */}
                      {(s.slug || s.title) && (
                        <div className="space-y-2 p-3 rounded-lg" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                            Обработанные данные
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span style={{ color: "var(--text-muted)" }}>Slug:</span> {s.slug}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Категория:</span> {s.categoryLabel || s.category}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Крепость:</span> {s.abv}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Время:</span> {s.time}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Сложность:</span> {s.difficulty}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Происхождение:</span> {s.origin}</div>
                          </div>
                          {s.tastingDescription && (
                            <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>Описание:</span> {s.tastingDescription}</p>
                          )}
                          {s.historyText && (
                            <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>История:</span> {s.historyText.slice(0, 200)}...</p>
                          )}
                          {/* Taste profile */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[
                              ["sweet", "Сладость"],
                              ["sour", "Кислотность"],
                              ["bitter", "Горечь"],
                              ["spicy", "Острота"],
                              ["fruity", "Фруктовость"],
                              ["herbal", "Травянистость"],
                            ].map(([key, label]) => {
                              const val = (s as Record<string, unknown>)[key];
                              if (val === null || val === undefined) return null;
                              return (
                                <span key={key} className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--surface)" }}>
                                  {label}: {val}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Admin notes (if rejected) */}
                      {s.adminNotes && (
                        <div className="p-2 rounded text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                          <strong>Причина отклонения:</strong> {s.adminNotes}
                        </div>
                      )}

                      {/* Actions */}
                      {s.status === "pending" && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(s)}
                            disabled={approve.isPending}
                            style={{ background: "#386641", color: "#fff" }}
                          >
                            <Check size={16} className="mr-1" />
                            {approve.isPending ? "Публикуем..." : "Одобрить и опубликовать"}
                          </Button>
                          {rejectId === s.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Причина отклонения..."
                                className="text-sm"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(s.id)}
                                disabled={!rejectNote.trim() || reject.isPending}
                              >
                                {reject.isPending ? "..." : "Отклонить"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectNote(""); }}>
                                Отмена
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="destructive" onClick={() => setRejectId(s.id)}>
                              <X size={16} className="mr-1" /> Отклонить
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════
   LabelTemplatesAdmin — CRUD шаблонов этикеток
   ═══════════════════════════════════════ */
function LabelTemplatesAdmin() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.labelTemplate.list.useQuery();

  const upsert = trpc.labelTemplate.upsert.useMutation({
    onSuccess: () => { utils.labelTemplate.list.invalidate(); setEditId(null); resetForm(); setView("list"); },
  });
  const del = trpc.labelTemplate.delete.useMutation({
    onSuccess: () => utils.labelTemplate.list.invalidate(),
  });
  const toggle = trpc.labelTemplate.toggleActive.useMutation({
    onSuccess: () => utils.labelTemplate.list.invalidate(),
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const [isBase, setIsBase] = useState(0);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const labelFileRef = useRef<HTMLInputElement>(null);
  const [bg, setBg] = useState("");
  const [border, setBorder] = useState("");
  const [accent, setAccent] = useState("#8B4513");
  const [fontFamily, setFontFamily] = useState("serif");
  const [zones, setZones] = useState(`[
  { "id": "image",    "x": 194, "y": 258, "w": 700, "h": 598 },
  { "id": "title",    "x": 140, "y": 992, "w": 799, "h": 110, "fontSize": 77, "align": "center" },
  { "id": "date",     "x": 230, "y": 1121, "w": 233, "h": 90,  "fontSize": 58, "align": "center" },
  { "id": "strength", "x": 601, "y": 1121, "w": 240, "h": 90,  "fontSize": 58, "align": "center" }
]`);
  const [zonesError, setZonesError] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(1);

  async function handleLabelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-label", { method: "POST", body: fd });
      const data = await res.json();
      if (data.path) setImage(data.path);
    } catch {
      alert("Ошибка загрузки файла");
    } finally {
      setImageUploading(false);
    }
  }

  function resetForm() {
    setIsBase(0);
    setEditId(null);
    setName(""); setImage(""); setBg(""); setBorder("");
    setAccent("#8B4513"); setFontFamily("serif");
    setZonesError("");
    setSortOrder(0); setIsActive(1);
  }

  function startEdit(t: NonNullable<typeof templates>[0]) {
    setEditId(t.id);
    setName(t.name); setImage(t.image ?? ""); setBg(t.bg ?? "");
    setBorder(t.border ?? ""); setAccent(t.accent); setFontFamily(t.fontFamily);
    setZones(t.zones ? JSON.stringify(t.zones, null, 2) : "[]");
    setZonesError("");
    setSortOrder(t.sortOrder); setIsActive(t.isActive);
    setIsBase((t as any).isBase ?? 0);
    setView("form");
  }

  function handleSave() {
    // Для не-базового шаблона зоны/цвет/фон/шрифт не имеют смысла — не отправляем их
    if (isBase !== 1) {
      upsert.mutate({
        id: editId ?? undefined,
        typeId: null,
        isBase: 0,
        name,
        image: image || undefined,
        sortOrder, isActive,
      });
      return;
    }
    let parsedZones: unknown = null;
    try {
      parsedZones = zones.trim() ? JSON.parse(zones) : null;
      setZonesError("");
    } catch {
      setZonesError("Ошибка в JSON — проверьте синтаксис");
      return;
    }
    upsert.mutate({
      id: editId ?? undefined,
      typeId: null,
      isBase: 1,
      name, image: image || undefined, bg: bg || undefined,
      border: border || undefined, accent, fontFamily,
      zones: parsedZones,
      sortOrder, isActive,
    });
  }

  // Sort state
  const [sortCol, setSortCol] = useState<"id" | "name" | "sortOrder" | "isActive">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sortedTemplates = [...(templates ?? [])].sort((a, b) => {
    let av: string | number = "", bv: string | number = "";
    if (sortCol === "id") { av = a.id; bv = b.id; }
    else if (sortCol === "name") { av = a.name; bv = b.name; }
    else if (sortCol === "sortOrder") { av = a.sortOrder; bv = b.sortOrder; }
    else if (sortCol === "isActive") { av = a.isActive; bv = b.isActive; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function SortHead({ col, children }: { col: typeof sortCol; children: React.ReactNode }) {
    const active = sortCol === col;
    return (
      <TableHead
        onClick={() => toggleSort(col)}
        className="cursor-pointer select-none"
        style={{ userSelect: "none", whiteSpace: "nowrap" }}
      >
        {children} {active ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
      </TableHead>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {view === "list" ? `Шаблоны этикеток (${templates?.length ?? 0})`
            : editId ? "Редактировать шаблон" : "Новый шаблон"}
        </CardTitle>
        <div className="flex gap-2">
          {view === "list" && (
            <Button size="sm" onClick={() => { resetForm(); setView("form"); }}>+ Добавить шаблон</Button>
          )}
          {view === "form" && (
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setView("list"); }}>← Назад к списку</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Edit form */}
        {view === "form" && (
        <div className="p-4 rounded-xl space-y-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <h4 className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            {editId ? "Редактировать шаблон" : "Новый шаблон"}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Название *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Изображение шаблона</Label>
              <div className="flex gap-2 mt-1">
                <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/labels/template-01.jpg" className="flex-1" />
                <input ref={labelFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLabelUpload} />
                <Button size="sm" variant="outline" onClick={() => labelFileRef.current?.click()} disabled={imageUploading} type="button">
                  {imageUploading ? "..." : "📁 Загрузить"}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Порядок сортировки</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="mt-1" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isActive === 1} onChange={(e) => setIsActive(e.target.checked ? 1 : 0)} />
                <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>Активен</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isBase" checked={isBase === 1} onChange={e => setIsBase(e.target.checked ? 1 : 0)} />
            <label htmlFor="isBase" className="text-xs" style={{ color: "var(--text-muted)" }}>
              Базовый редактируемый шаблон (название/дата/крепость/фото — вставляются пользователем)
            </label>
          </div>

          {/* Расширенные настройки — только для базового шаблона */}
          {isBase === 1 && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: "var(--bg-primary)", border: "1px dashed var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Настройки ниже влияют на то, как вставляются фото и текст пользователя — актуально только для базового шаблона.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">CSS фон (bg)</Label>
                  <Input value={bg} onChange={(e) => setBg(e.target.value)} placeholder="linear-gradient(...)" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">CSS рамка (border)</Label>
                  <Input value={border} onChange={(e) => setBorder(e.target.value)} placeholder="3px solid #8B4513" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Цвет акцента</Label>
                  <div className="flex gap-2 mt-1">
                    {["#8B4513","#2d2d2d","#b8860b","#ffffff","#c9a227","#9b2226","#2a9d8f","#7209b7"].map((c) => (
                      <button key={c} onClick={() => setAccent(c)} className="w-6 h-6 rounded-full" style={{ background: c, border: accent === c ? "2px solid var(--accent)" : "1px solid var(--border)" }} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Шрифт</Label>
                  <div className="flex gap-1 mt-1">
                    {["serif","sans","mono"].map((f) => (
                      <button key={f} onClick={() => setFontFamily(f)} className="px-2 py-1 rounded text-xs font-medium" style={{ background: fontFamily === f ? "var(--accent)" : "var(--surface)", color: fontFamily === f ? "#fff" : "var(--text-secondary)" }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">
                  Зоны текста и фото (JSON)
                </Label>
                <Textarea
                  value={zones}
                  onChange={(e) => { setZones(e.target.value); setZonesError(""); }}
                  className="mt-1 font-mono text-xs"
                  rows={8}
                />
                {zonesError && (
                  <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{zonesError}</p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  x/y/w/h — прямоугольник в пикселях PNG. id: image = зона фото, title = название, date = дата, strength = крепость. fontSize/align — только для текстовых полей.
                </p>
              </div>
            </div>
          )}

          {/* Mini preview */}
          {(image || bg) && (
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Превью:</span>
              <div
                className="rounded flex items-center justify-center text-center overflow-hidden"
                style={{ width: 60, height: 80, background: bg || "#fff", border: border || "1px solid #ccc", color: accent, fontSize: 8, fontWeight: "bold" }}
              >
                {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : "Aa"}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || upsert.isPending}>
              {upsert.isPending ? "Сохраняю..." : "Сохранить"}
            </Button>
            {editId && (
              <Button size="sm" variant="outline" onClick={() => { resetForm(); setView("list"); }}>Отмена</Button>
            )}
            {editId && (
              <Button
                size="sm"
                onClick={() => { if (confirm("Удалить шаблон? Это действие нельзя отменить.")) { del.mutate({ id: editId! }); resetForm(); setView("list"); } }}
                style={{ background: "#dc2626", color: "#fff", border: "none" }}
              >
                🗑 Удалить шаблон
              </Button>
            )}
          </div>
        </div>
        )}

        {/* Table */}
        {view === "list" && (isLoading ? <p>Загрузка...</p> : !templates?.length ? (
          <p className="text-muted-foreground">Нет шаблонов</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead col="id">ID</SortHead>
                <TableHead style={{ minWidth: 60 }}>Превью</TableHead>
                <SortHead col="name">Название</SortHead>
                <SortHead col="sortOrder">Порядок</SortHead>
                <SortHead col="isActive">Статус</SortHead>
                <TableHead className="text-right" style={{ minWidth: 180 }}>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTemplates.map((t) => (
                <TableRow key={t.id} style={!t.isActive ? { opacity: 0.5 } : undefined}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell>
                    <div className="rounded overflow-hidden" style={{ width: 36, height: 48, background: t.bg ?? "#fff", border: t.border ?? "1px solid #ccc" }}>
                      {t.image && <img src={t.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {t.name}
                    {(t as any).isBase === 1 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--accent)", color: "#fff" }}>база</span>
                    )}
                  </TableCell>
                  <TableCell>{t.sortOrder}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggle.mutate({ id: t.id, isActive: t.isActive ? 0 : 1 })}
                      className="px-2 py-0.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: t.isActive ? "#d8f3dc" : "#fee2e2",
                        color: t.isActive ? "#386641" : "#991b1b",
                      }}
                    >
                      {t.isActive ? "Активен" : "Неактивен"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Изменить</Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm("Удалить?")) del.mutate({ id: t.id }); }}>Удалить</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
      </CardContent>
    </Card>
  );
}

function PlaceModerationTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectId, setRejectId] = useState<number | null>(null);

  const { data: submissions, isLoading } = trpc.placeSubmission.listAll.useQuery();
  const approve = trpc.placeSubmission.approve.useMutation({
    onSuccess: () => {
      utils.placeSubmission.listAll.invalidate();
      utils.place.list.invalidate();
    },
  });
  const reject = trpc.placeSubmission.reject.useMutation({
    onSuccess: () => { utils.placeSubmission.listAll.invalidate(); setRejectId(null); setRejectNote(""); },
  });

  const filtered = (submissions ?? []).filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const statusMeta: Record<string, { label: string; bg: string; color: string; icon: ReactNode }> = {
    draft: { label: "Черновик", bg: "#f3f4f6", color: "#6b7280", icon: <Clock size={14} /> },
    ai_processed: { label: "Обработан ИИ", bg: "#eff6ff", color: "#1e40af", icon: <Sparkles size={14} /> },
    pending: { label: "На проверке", bg: "#fef3c7", color: "#92400e", icon: <Gavel size={14} /> },
    approved: { label: "Одобрена", bg: "#d8f3dc", color: "#386641", icon: <Check size={14} /> },
    rejected: { label: "Отклонена", bg: "#fee2e2", color: "#991b1b", icon: <X size={14} /> },
  };

  function handleApprove(s: NonNullable<typeof submissions>[0]) {
    if (!s.slug || !s.name) {
      alert("У заявки не заполнены slug или название — отредактируйте данные перед одобрением (пока редактирование заявок не реализовано, отклоните и попросите отправить заново).");
      return;
    }
    if (!confirm(`Одобрить и опубликовать заведение «${s.name}»? Оно сразу появится на барной карте.`)) return;
    approve.mutate({ id: s.id });
  }

  function handleReject(id: number) {
    if (!rejectNote.trim()) {
      setRejectId(id);
      return;
    }
    reject.mutate({ id, adminNotes: rejectNote });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel size={20} style={{ color: "var(--accent)" }} />
          Заявки на добавление заведений
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: `Все (${submissions?.length ?? 0})` },
            { key: "pending", label: `На проверке (${submissions?.filter((s) => s.status === "pending").length ?? 0})` },
            { key: "approved", label: `Одобрены (${submissions?.filter((s) => s.status === "approved").length ?? 0})` },
            { key: "rejected", label: `Отклонены (${submissions?.filter((s) => s.status === "rejected").length ?? 0})` },
            { key: "draft", label: `Черновики (${submissions?.filter((s) => s.status === "draft").length ?? 0})` },
            { key: "ai_processed", label: `Обработаны ИИ (${submissions?.filter((s) => s.status === "ai_processed").length ?? 0})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: filter === f.key ? "var(--accent)" : "var(--surface)",
                color: filter === f.key ? "#fff" : "var(--text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p>Загрузка...</p>
        ) : !filtered.length ? (
          <div className="text-center py-8">
            <AlertCircle size={32} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p style={{ color: "var(--text-muted)" }}>Нет заявок в выбранной категории</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const meta = statusMeta[s.status] || statusMeta.draft;
              const isExpanded = expandedId === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-primary)" }}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:opacity-80"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <span
                      className="shrink-0 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                    <span className="font-medium text-sm flex-1 truncate" style={{ fontFamily: "var(--font-body)" }}>
                      {s.name || "(без названия)"}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      <User size={12} className="inline mr-1" />
                      {s.authorName || "Аноним"}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString("ru-RU") : ""}
                    </span>
                    <Eye size={16} style={{ color: "var(--text-muted)" }} />
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="pt-3 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                          Исходные данные
                        </h4>
                        {s.rawUrl && (
                          <p className="text-sm">
                            <span style={{ color: "var(--text-muted)" }}>Ссылка:</span>{" "}
                            <a href={s.rawUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{s.rawUrl}</a>
                          </p>
                        )}
                        {s.rawCoords && (
                          <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>Координаты:</span> {s.rawCoords}</p>
                        )}
                        {s.rawAddress && (
                          <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>Адрес:</span> {s.rawAddress}</p>
                        )}
                        {s.rawReviews && (
                          <div>
                            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Отзывы (вставленные):</span>
                            <pre className="text-sm mt-1 p-2 rounded" style={{ background: "var(--surface)", whiteSpace: "pre-wrap" }}>{s.rawReviews}</pre>
                          </div>
                        )}
                        {s.rawNotes && (
                          <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>Заметки:</span> {s.rawNotes}</p>
                        )}
                      </div>

                      {(s.slug || s.name) && (
                        <div className="space-y-2 p-3 rounded-lg" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                            Обработанные данные
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span style={{ color: "var(--text-muted)" }}>Slug:</span> {s.slug}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Город:</span> {s.city}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Метро:</span> {s.metro}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Часы:</span> {s.hours}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Широта:</span> {s.lat ?? "—"}</div>
                            <div><span style={{ color: "var(--text-muted)" }}>Долгота:</span> {s.lng ?? "—"}</div>
                          </div>
                          {s.description && (
                            <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>Описание:</span> {s.description}</p>
                          )}
                          {s.externalSummary && (
                            <p className="text-sm"><span style={{ color: "var(--text-muted)" }}>Резюме из отзывов:</span> {s.externalSummary}</p>
                          )}
                          {Array.isArray(s.externalPros) && s.externalPros.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {s.externalPros.map((p, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: "#d8f3dc", color: "#386641" }}>+ {p}</span>
                              ))}
                            </div>
                          )}
                          {Array.isArray(s.externalCons) && s.externalCons.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {s.externalCons.map((c, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: "#fee2e2", color: "#991b1b" }}>− {c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {s.adminNotes && (
                        <div className="p-2 rounded text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                          <strong>Причина отклонения:</strong> {s.adminNotes}
                        </div>
                      )}

                      {s.status === "pending" && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(s)}
                            disabled={approve.isPending}
                            style={{ background: "#386641", color: "#fff" }}
                          >
                            <Check size={16} className="mr-1" />
                            {approve.isPending ? "Публикуем..." : "Одобрить и опубликовать"}
                          </Button>
                          {rejectId === s.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Причина отклонения..."
                                className="text-sm"
                              />
                              <Button size="sm" variant="destructive" onClick={() => handleReject(s.id)} disabled={reject.isPending}>
                                Подтвердить
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleReject(s.id)}>
                              <X size={16} className="mr-1" /> Отклонить
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1" />
    </div>
  );
}
function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 min-h-[60px]" />
    </div>
  );
}
const roleLabels: Record<string, string> = {
  user: "Пользователь",
  editor: "Редактор",
  admin: "Админ",
};

const roleColors: Record<string, string> = {
  user: "#6b7280",
  editor: "#2563eb",
  admin: "#dc2626",
};

/* Строка таблицы пользователей вынесена в отдельный компонент, чтобы у полей
   ввода "выдать запросы" / "начислить баланс" было своё локальное состояние —
   иначе один инпут на всю таблицу путал бы значения между строками. */
function UserRow({
  u,
  busy,
  onRoleChange,
  onDelete,
  onGrantRequests,
  onGrantBalance,
}: {
  u: { id: number; name: string | null; email: string; role: string; createdAt: Date | string; freeRequestsLeft: number; balanceKopecks: number };
  busy: boolean;
  onRoleChange: (role: string) => void;
  onDelete: () => void;
  onGrantRequests: (amount: number) => void;
  onGrantBalance: (amountRub: number) => void;
}) {
  const [requestsAmount, setRequestsAmount] = useState(5);
  const [balanceAmount, setBalanceAmount] = useState(100);

  return (
    <TableRow>
      <TableCell>{u.id}</TableCell>
      <TableCell>{u.name ?? "—"}</TableCell>
      <TableCell>{u.email}</TableCell>
      <TableCell>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ background: roleColors[u.role] ?? "#6b7280" }}
        >
          {roleLabels[u.role] ?? u.role}
        </span>
      </TableCell>
      <TableCell>
        {new Date(u.createdAt).toLocaleDateString("ru-RU")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="text-sm" style={{ minWidth: 16 }}>{u.freeRequestsLeft}</span>
          <input
            type="number"
            min={1}
            value={requestsAmount}
            onChange={(e) => setRequestsAmount(Number(e.target.value))}
            className="w-14 text-sm rounded px-1 py-0.5"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}
          />
          <button
            disabled={busy || requestsAmount < 1}
            onClick={() => onGrantRequests(requestsAmount)}
            className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }}
          >
            Выдать
          </button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="text-sm" style={{ minWidth: 40 }}>{(u.balanceKopecks / 100).toFixed(0)} ₽</span>
          <input
            type="number"
            min={1}
            value={balanceAmount}
            onChange={(e) => setBalanceAmount(Number(e.target.value))}
            className="w-16 text-sm rounded px-1 py-0.5"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}
          />
          <button
            disabled={busy || balanceAmount < 1}
            onClick={() => onGrantBalance(balanceAmount)}
            className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac" }}
          >
            Начислить
          </button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <select
            value={u.role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="text-sm rounded px-2 py-1"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}
          >
            <option value="user">Пользователь</option>
            <option value="editor">Редактор</option>
            <option value="admin">Админ</option>
          </select>
          <button
            onClick={onDelete}
            className="text-sm px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
          >
            Удалить
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function UsersTab() {
  const { data: usersList, refetch } = trpc.user.list.useQuery();
  const setRoleMutation = trpc.user.setRole.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.user.delete.useMutation({ onSuccess: () => refetch() });
  const grantRequestsMutation = trpc.user.grantFreeRequests.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => alert("Ошибка: " + err.message),
  });
  const grantBalanceMutation = trpc.user.grantBalance.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => alert("Ошибка: " + err.message),
  });

  const busy = grantRequestsMutation.isPending || grantBalanceMutation.isPending;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-heading)" }}>
        Пользователи ({usersList?.length ?? 0})
      </h2>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Дата регистрации</TableHead>
              <TableHead>Бесплатные запросы</TableHead>
              <TableHead>Баланс</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(usersList ?? []).map((u) => (
              <UserRow
                key={u.id}
                u={u}
                busy={busy}
                onRoleChange={(role) => setRoleMutation.mutate({ userId: Number(u.id), role: role as "user" | "editor" | "admin" })}
                onDelete={() => { if (confirm(`Удалить ${u.email}?`)) deleteMutation.mutate({ userId: Number(u.id) }); }}
                onGrantRequests={(amount) => grantRequestsMutation.mutate({ userId: Number(u.id), amount })}
                onGrantBalance={(amountRub) => grantBalanceMutation.mutate({ userId: Number(u.id), amountRub })}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}