import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Sparkles, Loader2,
  Plus, Trash2, Save, Bot, Wand2, Film, FileText,
  Image as ImageIcon, Upload, X, RefreshCw,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
type IngredientInput = { name: string; amount: string; note: string };
type StepInput = { stepNum: number; title: string; text: string };
type TrackerStageInput = { stageType: string; title: string; dayOffset: number; repeatEveryDays?: number };

interface RecipeForm {
  slug: string; title: string; subtitle: string;
  category: string; categoryLabel: string;
  heroImage: string;
  abv: string; time: string; difficulty: string;
  year: string; origin: string;
  historyTitle: string; historyText: string;
  tastingColor: string; tastingDescription: string;
  tastingTemp: string; tastingGlass: string;
  tastingPairing: string[];
  sweet: number; sour: number; bitter: number;
  spicy: number; fruity: number; herbal: number;
  tips: string[]; authorName: string; authorDate: string;
  imagePrompt: string;
  ingredients: IngredientInput[]; steps: StepInput[]; trackerStages: TrackerStageInput[];
}

function emptyForm(): RecipeForm {
  return {
    slug: "", title: "", subtitle: "", category: "sweet", categoryLabel: "Сладкая",
    heroImage: "",
    abv: "", time: "", difficulty: "Легко", year: "", origin: "",
    historyTitle: "", historyText: "", tastingColor: "", tastingDescription: "",
    tastingTemp: "", tastingGlass: "", tastingPairing: [],
    sweet: 50, sour: 30, bitter: 20, spicy: 10, fruity: 60, herbal: 15,
    tips: [], authorName: "", authorDate: "",
    imagePrompt: "",
    ingredients: [], steps: [], trackerStages: [],
  };
}

function slugify(title: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"shch",ы:"y",э:"e",ю:"yu",я:"ya",
    " ":"-","_":"-","/":"-","\\":"-",
  };
  return title.toLowerCase().split("").map((c) => map[c] || c).join("").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/* ═══════════════════════════════════════════
   Page
   ═══════════════════════════════════════════ */
export default function RecipeParserPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("source");
  const [sourceMode, setSourceMode] = useState<"text" | "video">("text");
  const [recipeText, setRecipeText] = useState("");
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [generating, setGenerating] = useState(false);
  const [generateImageEnabled, setGenerateImageEnabled] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const upsertRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => {
      utils.recipe.list.invalidate();
      setSaving(false);
      navigate("/recipes");
    },
    onError: (err) => {
      setSaving(false);
      alert("Ошибка сохранения: " + err.message);
    },
  });

  /* ── Заполняет форму из ответа ИИ (общий формат что для generate, что для будущего ручного JSON) ── */
  function applyParsedData(data: Record<string, any>) {
    const newForm: RecipeForm = {
      slug: slugify(data.title || ""),
      title: data.title || "",
      subtitle: data.subtitle || "",
      category: data.category || "sweet",
      categoryLabel: data.categoryLabel || "",
      heroImage: data.heroImage || "",
      abv: data.abv || "",
      time: data.time || "",
      difficulty: data.difficulty || "Легко",
      year: data.year || "",
      origin: data.origin || "",
      historyTitle: data.historyTitle || "",
      historyText: data.historyText || "",
      tastingColor: data.tastingColor || "",
      tastingDescription: data.tastingDescription || "",
      tastingTemp: data.tastingTemp || "",
      tastingGlass: data.tastingGlass || "",
      tastingPairing: Array.isArray(data.tastingPairing) ? data.tastingPairing : [],
      sweet: Number(data.sweet) || 0,
      sour: Number(data.sour) || 0,
      bitter: Number(data.bitter) || 0,
      spicy: Number(data.spicy) || 0,
      fruity: Number(data.fruity) || 0,
      herbal: Number(data.herbal) || 0,
      tips: Array.isArray(data.tips) ? data.tips : [],
      authorName: data.authorName || "",
      authorDate: data.authorDate || "",
      imagePrompt: data.imagePrompt || "",
      ingredients: Array.isArray(data.ingredients) ? data.ingredients.map((ing: any) => ({
        name: ing.name || "", amount: ing.amount || "", note: ing.note || "",
      })) : [],
      steps: Array.isArray(data.steps) ? data.steps.map((s: any) => ({
        stepNum: Number(s.stepNum) || 1, title: s.title || "", text: s.text || "",
      })) : [],
      trackerStages: Array.isArray(data.trackerStages) ? data.trackerStages.map((s: any) => ({
        stageType: s.stageType || "custom", title: s.title || "", dayOffset: Number(s.dayOffset) || 0,
        repeatEveryDays: s.repeatEveryDays ? Number(s.repeatEveryDays) : undefined,
      })) : [],
    };
    setForm(newForm);
    setImagePreview(null);
  }

  /* ── Шаг 1 → карточка + картинка одним запросом (Timeweb AI Gateway) ── */
  const generateRecipe = trpc.recipeParser.generate.useMutation({
    onSuccess: (data) => {
      applyParsedData(data);
      setImageWarning(data.imageError ?? null);
      setGenerating(false);
      setTab("edit");
    },
    onError: (err) => {
      setGenerating(false);
      alert("Ошибка генерации: " + err.message);
    },
  });
  const handleGenerate = () => {
    if (!recipeText.trim()) return;
    setGenerating(true);
    generateRecipe.mutate({ rawText: recipeText, generateImage: generateImageEnabled });
  };

  /* ── Видео → расшифровка речи (заполняет текстовое поле, дальше — как обычный текст) ── */
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      alert("Выберите видеофайл");
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      alert("Максимальный размер видео — 150 МБ");
      return;
    }

    setTranscribing(true);
    try {
      const token = localStorage.getItem("auth-token") || "";
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-recipe-video", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (data.success && typeof data.transcript === "string") {
        setRecipeText(data.transcript);
        if (!data.transcript.trim()) {
          alert("Речь в видео не распознана — если рецепт показан текстом на экране без озвучки, впишите его вручную в поле ниже.");
        }
      } else {
        alert("Ошибка распознавания: " + (data.error || "неизвестная ошибка"));
      }
    } catch {
      alert("Ошибка загрузки видео");
    } finally {
      setTranscribing(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  /* ── Перегенерировать картинку (если автоматическая не понравилась) ── */
  const regenerateImage = trpc.recipeParser.regenerateImage.useMutation({
    onSuccess: (data) => {
      patch({ heroImage: data.heroImage });
      setImagePreview(null);
      setImageWarning(null);
      setRegeneratingImage(false);
    },
    onError: (err) => {
      setRegeneratingImage(false);
      alert("Ошибка генерации картинки: " + err.message);
    },
  });
  const handleRegenerateImage = () => {
    if (!form.imagePrompt.trim()) return;
    setRegeneratingImage(true);
    regenerateImage.mutate({ prompt: form.imagePrompt });
  };

  /* ── Upload image (ручная загрузка своей картинки — как запасной вариант) ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка на клиенте
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Допустимые форматы: JPG, PNG, WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Максимальный размер — 5 МБ");
      return;
    }

    // Проверка ориентации
    const img = new Image();
    const url = URL.createObjectURL(file);
    const isLandscape = await new Promise<boolean>((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.width >= img.height);
      };
      img.src = url;
    });

    if (!isLandscape) {
      alert("Используйте картинку в альбомной (горизонтальной) ориентации");
      return;
    }

    // Превью
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Загрузка на сервер
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.path) {
        patch({ heroImage: data.path });
        setImageWarning(null);
      } else {
        alert("Ошибка загрузки: " + (data.error || "неизвестная ошибка"));
      }
    } catch {
      alert("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    patch({ heroImage: "" });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Save (с проверкой на дубликаты) ── */
  const [duplicateMatches, setDuplicateMatches] = useState<
    { id: number; slug: string; title: string; category: string | null; heroImage: string | null; score: number; ingredientOverlapPercent: number }[] | null
  >(null);

  const buildRecipePayload = (overwriteId?: number) => ({
    id: overwriteId,
    slug: form.slug, title: form.title, subtitle: form.subtitle || undefined,
    category: form.category, categoryLabel: form.categoryLabel || undefined,
    heroImage: form.heroImage || undefined,
    abv: form.abv || undefined, time: form.time || undefined, difficulty: form.difficulty || undefined,
    year: form.year || undefined, origin: form.origin || undefined,
    historyTitle: form.historyTitle || undefined, historyText: form.historyText || undefined,
    tastingColor: form.tastingColor || undefined, tastingDescription: form.tastingDescription || undefined,
    tastingPairing: form.tastingPairing.length > 0 ? form.tastingPairing : undefined,
    tastingTemp: form.tastingTemp || undefined, tastingGlass: form.tastingGlass || undefined,
    sweet: form.sweet || undefined, sour: form.sour || undefined, bitter: form.bitter || undefined,
    spicy: form.spicy || undefined, fruity: form.fruity || undefined, herbal: form.herbal || undefined,
    tips: form.tips.length > 0 ? form.tips : undefined,
    authorName: form.authorName || undefined, authorDate: form.authorDate || undefined,
    ingredients: form.ingredients.length > 0 ? form.ingredients : undefined,
    steps: form.steps.length > 0 ? form.steps.map((s) => ({ stepNum: s.stepNum, title: s.title || undefined, text: s.text })) : undefined,
    trackerStages: form.trackerStages.length > 0 ? form.trackerStages : undefined,
  });

  const handleSave = async (opts?: { overwriteId?: number; skipCheck?: boolean }) => {
    if (!form.slug || !form.title) { alert("Slug и название обязательны!"); return; }

    if (!opts?.skipCheck && !opts?.overwriteId) {
      const dupes = await utils.recipe.checkDuplicates.fetch({
        title: form.title,
        category: form.category || undefined,
        ingredients: form.ingredients.map((i) => i.name).filter(Boolean),
      });
      if (dupes.length > 0) {
        setDuplicateMatches(dupes);
        return;
      }
    }

    setDuplicateMatches(null);
    setSaving(true);
    upsertRecipe.mutate(buildRecipePayload(opts?.overwriteId));
  };

  /* ── Form helpers ── */
  const patch = (p: Partial<RecipeForm>) => setForm((f) => ({ ...f, ...p }));
  const updateIng = (i: number, p: Partial<IngredientInput>) => {
    const ings = [...form.ingredients];
    ings[i] = { ...ings[i], ...p };
    patch({ ingredients: ings });
  };
  const addIng = () => patch({ ingredients: [...form.ingredients, { name: "", amount: "", note: "" }] });
  const delIng = (i: number) => patch({ ingredients: form.ingredients.filter((_, j) => j !== i) });
  const updateStep = (i: number, p: Partial<StepInput>) => {
    const steps = [...form.steps];
    steps[i] = { ...steps[i], ...p };
    patch({ steps });
  };
  const addStep = () => {
    const next = form.steps.length > 0 ? Math.max(...form.steps.map((s) => s.stepNum)) + 1 : 1;
    patch({ steps: [...form.steps, { stepNum: next, title: "", text: "" }] });
  };
  const delStep = (i: number) => patch({ steps: form.steps.filter((_, j) => j !== i) });

  const updateTrackerStage = (i: number, p: Partial<TrackerStageInput>) => {
    const arr = [...form.trackerStages];
    arr[i] = { ...arr[i], ...p };
    patch({ trackerStages: arr });
  };
  const addTrackerStage = () => patch({ trackerStages: [...form.trackerStages, { stageType: "pour", title: "", dayOffset: 0 }] });
  const delTrackerStage = (i: number) => patch({ trackerStages: form.trackerStages.filter((_, j) => j !== i) });

  return (
    <main className="min-h-screen px-4 py-8 md:px-8" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm mb-2 transition-opacity hover:opacity-70" style={{ color: "var(--accent)" }}>
          <ArrowLeft size={16} /> Назад
        </button>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--accent)" }}>
          <Bot size={28} className="inline mr-2" />
          AI-парсер рецептов
        </h1>
        <p className="mt-1 mb-8" style={{ color: "var(--text-secondary)" }}>
          Текст, или видео с озвучкой рецепта — ИИ сам разберёт и заполнит карточку, включая картинку
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="source">1. Источник</TabsTrigger>
            <TabsTrigger value="edit" disabled={!form.title}>2. Редактировать</TabsTrigger>
          </TabsList>

          {/* ═════ STEP 1: Text or video → auto-generated card ═════ */}
          <TabsContent value="source">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={20} />
                  Шаг 1: Текст или видео рецепта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Переключатель источника */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={sourceMode === "text" ? "default" : "outline"}
                    onClick={() => setSourceMode("text")}
                    className="flex-1"
                  >
                    <FileText size={16} className="mr-2" /> Текст
                  </Button>
                  <Button
                    type="button"
                    variant={sourceMode === "video" ? "default" : "outline"}
                    onClick={() => setSourceMode("video")}
                    className="flex-1"
                  >
                    <Film size={16} className="mr-2" /> Видео
                  </Button>
                </div>

                {sourceMode === "video" && (
                  <div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={transcribing}
                      className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:opacity-70"
                      style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}
                    >
                      {transcribing ? (
                        <>
                          <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
                          <span className="text-sm font-medium">Распознаём речь...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={28} />
                          <span className="text-sm font-medium">Загрузить видео с рецептом</span>
                          <span className="text-xs">До 150 МБ · речь распознается автоматически</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                      Ссылки на YouTube/TikTok/Instagram пока не поддерживаются — сохраните видео на устройство и загрузите файлом.
                      Если в ролике рецепт показан текстом на экране без озвучки — распознавание речи ничего не найдёт,
                      впишите рецепт в поле ниже вручную (можно поглядывая на видео).
                    </p>
                  </div>
                )}

                <div>
                  {sourceMode === "video" && (
                    <Label className="mb-1 block">Расшифровка (проверьте и поправьте при необходимости)</Label>
                  )}
                  <Textarea
                    value={recipeText}
                    onChange={(e) => setRecipeText(e.target.value)}
                    placeholder={`Вставьте сюда текст рецепта с любого сайта или форума — в любом формате, хоть списком, хоть описательным текстом.

Пример:
"Вот отличный рецепт вишнёвой настойки, который достался мне от бабушки. Берём килограмм спелой вишни, заливаем пол-литра хорошей водки, добавляем стакан сахара и настаиваем две недели в тёмном месте. Получается очень мягкий и сладкий напиток, крепостью около 25 градусов. Отлично подаётся к шоколадному торту."`}
                    className="min-h-[220px]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} style={{ color: "var(--text-muted)" }} />
                    <Label htmlFor="generate-image-toggle" className="cursor-pointer">Генерировать картинку</Label>
                  </div>
                  <Switch id="generate-image-toggle" checked={generateImageEnabled} onCheckedChange={setGenerateImageEnabled} />
                </div>

                <Button onClick={handleGenerate} disabled={!recipeText.trim() || generating} size="lg" className="w-full">
                  {generating ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" /> {generateImageEnabled ? "ИИ собирает карточку и рисует картинку..." : "ИИ собирает карточку..."}</>
                  ) : (
                    <><Wand2 size={18} className="mr-2" /> Сгенерировать карточку</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═════ STEP 2: Edit form ═════ */}
          <TabsContent value="edit">
            <div className="space-y-6">
              {/* Basic */}
              <Card>
                <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Slug (URL)*</Label><Input value={form.slug} onChange={(e) => patch({ slug: e.target.value })} /></div>
                    <div><Label>Название*</Label><Input value={form.title} onChange={(e) => patch({ title: e.target.value, slug: slugify(e.target.value) })} /></div>
                  </div>
                  <div><Label>Подзаголовок</Label><Input value={form.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} /></div>
                  <div className="grid grid-cols-4 gap-4">
                    <div><Label>Категория</Label>
                      <select className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} value={form.category} onChange={(e) => patch({ category: e.target.value })}>
                        {[
                          { value: "sweet", label: "🍒 Сладкая" },
                          { value: "bitter", label: "🌿 Горькая" },
                          { value: "herbal", label: "🌱 Травяная" },
                          { value: "spicy", label: "🌶️ Острая" },
                          { value: "citrus", label: "🍋 Цитрусовая" },
                          { value: "coffee", label: "☕ Кофейная" },
                          { value: "honey", label: "🍯 Медовая" },
                        ].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div><Label>Метка</Label><Input value={form.categoryLabel} onChange={(e) => patch({ categoryLabel: e.target.value })} /></div>
                    <div><Label>ABV</Label><Input value={form.abv} onChange={(e) => patch({ abv: e.target.value })} /></div>
                    <div><Label>Время</Label><Input value={form.time} onChange={(e) => patch({ time: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Сложность</Label>
                      <select className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} value={form.difficulty} onChange={(e) => patch({ difficulty: e.target.value })}>
                        {["Легко","Средне","Сложно"].map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div><Label>Период</Label><Input value={form.year} onChange={(e) => patch({ year: e.target.value })} /></div>
                    <div><Label>Происхождение</Label><Input value={form.origin} onChange={(e) => patch({ origin: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* ═════ IMAGE ═════ */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon size={20} /> Картинка рецепта</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {imageWarning && (
                    <div className="rounded-xl p-3 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      Картинка не сгенерировалась автоматически: {imageWarning}. Можно попробовать ещё раз, загрузить свою или указать ссылку ниже.
                    </div>
                  )}

                  {/* Промпт, по которому сгенерирована/будет сгенерирована картинка — редактируемый */}
                  {(form.imagePrompt || form.heroImage) && (
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="font-semibold">Промпт картинки (можно поправить и перегенерировать)</Label>
                        <Button size="sm" variant="outline" onClick={handleRegenerateImage} disabled={!form.imagePrompt.trim() || regeneratingImage}>
                          {regeneratingImage ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                          {regeneratingImage ? "Рисуем..." : "Перегенерировать"}
                        </Button>
                      </div>
                      <Textarea
                        value={form.imagePrompt}
                        onChange={(e) => patch({ imagePrompt: e.target.value })}
                        className="text-sm font-mono min-h-[80px]"
                      />
                    </div>
                  )}

                  {/* Upload area */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />

                    {form.heroImage || imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                        <img
                          src={imagePreview || form.heroImage}
                          alt="Превью"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                            style={{ background: "rgba(0,0,0,0.6)" }}
                            title="Заменить"
                          >
                            <Upload size={14} />
                          </button>
                          <button
                            onClick={handleRemoveImage}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
                            style={{ background: "rgba(220,38,38,0.8)" }}
                            title="Удалить"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {uploading && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                            <div className="w-8 h-8 border-3 border-t-transparent border-white rounded-full animate-spin" />
                          </div>
                        )}
                        {form.heroImage && (
                          <div className="px-3 py-2 text-xs font-mono" style={{ color: "var(--text-muted)", background: "var(--surface)" }}>
                            {form.heroImage}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full h-40 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:opacity-70"
                        style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}
                      >
                        {uploading ? (
                          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                        ) : (
                          <>
                            <Upload size={32} />
                            <span className="text-sm font-medium">Загрузить картинку</span>
                            <span className="text-xs">JPG, PNG или WebP · до 5 МБ</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Manual URL input */}
                  <div>
                    <Label>Или вставьте URL картинки</Label>
                    <Input
                      value={form.heroImage}
                      onChange={(e) => { patch({ heroImage: e.target.value }); setImagePreview(null); }}
                      placeholder="https://... или /images/recipes/..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Ингредиенты ({form.ingredients.length})</CardTitle>
                  <Button size="sm" variant="outline" onClick={addIng}><Plus size={14} className="mr-1" /> Добавить</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.ingredients.length === 0 && <p className="text-sm text-muted-foreground">Нет ингредиентов</p>}
                  {form.ingredients.map((ing, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5"><Label className="text-xs">Название</Label><Input value={ing.name} onChange={(e) => updateIng(i, { name: e.target.value })} /></div>
                      <div className="col-span-3"><Label className="text-xs">Количество</Label><Input value={ing.amount} onChange={(e) => updateIng(i, { amount: e.target.value })} /></div>
                      <div className="col-span-3"><Label className="text-xs">Примечание</Label><Input value={ing.note} onChange={(e) => updateIng(i, { note: e.target.value })} /></div>
                      <div className="col-span-1"><Button size="sm" variant="ghost" onClick={() => delIng(i)}><Trash2 size={14} /></Button></div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Steps */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Шаги ({form.steps.length})</CardTitle>
                  <Button size="sm" variant="outline" onClick={addStep}><Plus size={14} className="mr-1" /> Добавить</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.steps.length === 0 && <p className="text-sm text-muted-foreground">Нет шагов</p>}
                  {form.steps.map((s, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-1"><Label className="text-xs">№</Label><Input type="number" value={s.stepNum} onChange={(e) => updateStep(i, { stepNum: Number(e.target.value) })} /></div>
                      <div className="col-span-4"><Label className="text-xs">Заголовок</Label><Input value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} /></div>
                      <div className="col-span-6"><Label className="text-xs">Описание</Label><Textarea value={s.text} onChange={(e) => updateStep(i, { text: e.target.value })} className="min-h-[60px]" /></div>
                      <div className="col-span-1 pt-5"><Button size="sm" variant="ghost" onClick={() => delStep(i)}><Trash2 size={14} /></Button></div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tracker stages — отдельный план для Трекера созревания, не показывается на странице рецепта */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Этапы Трекера созревания ({form.trackerStages.length})</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Не отображается на странице рецепта — используется только для автозаполнения трекера</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addTrackerStage}><Plus size={14} className="mr-1" /> Добавить</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {form.trackerStages.length === 0 && <p className="text-sm text-muted-foreground">Этапов нет — трекер будет использовать обобщённый запасной план</p>}
                  {form.trackerStages.map((s, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-3">
                        <Label className="text-xs">Тип этапа</Label>
                        <select
                          value={s.stageType}
                          onChange={(e) => updateTrackerStage(i, { stageType: e.target.value })}
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
                      <div className="col-span-5"><Label className="text-xs">Название</Label><Input value={s.title} onChange={(e) => updateTrackerStage(i, { title: e.target.value })} placeholder="напр. Взболтать" /></div>
                      <div className="col-span-2"><Label className="text-xs">День от старта</Label><Input type="number" min={0} value={s.dayOffset} onChange={(e) => updateTrackerStage(i, { dayOffset: Number(e.target.value) })} /></div>
                      <div className="col-span-1"><Label className="text-xs">Повтор, дн.</Label><Input type="number" min={1} value={s.repeatEveryDays ?? ""} placeholder="—" onChange={(e) => updateTrackerStage(i, { repeatEveryDays: e.target.value ? Number(e.target.value) : undefined })} /></div>
                      <div className="col-span-1 pt-5"><Button size="sm" variant="ghost" onClick={() => delTrackerStage(i)}><Trash2 size={14} /></Button></div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Taste */}
              <Card>
                <CardHeader><CardTitle>Вкусовой профиль</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {(["sweet","sour","bitter","spicy","fruity","herbal"] as const).map((key) => {
                      const labels: Record<string, string> = { sweet: "Сладость", sour: "Кислотность", bitter: "Горечь", spicy: "Пряность", fruity: "Фруктовость", herbal: "Травянистость" };
                      return (
                        <div key={key}>
                          <Label>{labels[key]}</Label>
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} value={form[key]} onChange={(e) => patch({ [key]: Number(e.target.value) })} className="flex-1 accent-amber-600" style={{ accentColor: "var(--accent)" }} />
                            <span className="w-8 text-right text-sm">{form[key]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Цвет</Label><Input value={form.tastingColor} onChange={(e) => patch({ tastingColor: e.target.value })} /></div>
                    <div><Label>Температура</Label><Input value={form.tastingTemp} onChange={(e) => patch({ tastingTemp: e.target.value })} /></div>
                  </div>
                  <div><Label>Бокал</Label><Input value={form.tastingGlass} onChange={(e) => patch({ tastingGlass: e.target.value })} /></div>
                  <div><Label>Описание вкуса</Label><Textarea value={form.tastingDescription} onChange={(e) => patch({ tastingDescription: e.target.value })} /></div>
                  <div><Label>Сочетания (через запятую)</Label>
                    <Input value={form.tastingPairing.join(", ")} onChange={(e) => patch({ tastingPairing: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                </CardContent>
              </Card>

              {/* History */}
              <Card>
                <CardHeader><CardTitle>История</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Заголовок</Label><Input value={form.historyTitle} onChange={(e) => patch({ historyTitle: e.target.value })} /></div>
                  <div><Label>Текст</Label><Textarea value={form.historyText} onChange={(e) => patch({ historyText: e.target.value })} className="min-h-[100px]" /></div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader><CardTitle>Советы</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={form.tips.join("\n")} onChange={(e) => patch({ tips: e.target.value.split("\n").filter(Boolean) })} className="min-h-[80px]" placeholder="Каждый совет с новой строки" />
                </CardContent>
              </Card>

              {/* Save bar */}
              <div className="flex items-center justify-between pt-4 pb-12">
                <Button variant="outline" onClick={() => setTab("source")}>← Назад к источнику</Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setForm(emptyForm()); setRecipeText(""); setImagePreview(null); setImageWarning(null); setTab("source"); }}>Новый рецепт</Button>
                  <Button onClick={() => handleSave()} disabled={saving} size="lg">
                    <Save size={18} className="mr-2" />
                    {saving ? "Сохранение..." : "Сохранить рецепт"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Модалка предупреждения о возможных дубликатах ──
          Способ приготовления мы не сравниваем алгоритмически — только
          название/категорию/состав. Финальное решение всегда за человеком. */}
      {duplicateMatches && duplicateMatches.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Похоже, такой рецепт уже есть
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Похожее название и/или состав ингредиентов. Сравните способ приготовления — если он существенно
              отличается, это можно смело сохранить как отдельный рецепт.
            </p>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                  <img src={m.heroImage || "/bar-1.jpg"} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.title}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>Категория: {m.category}</div>
                    <div className="text-xs" style={{ color: "var(--accent)" }}>
                      Совпадение: {m.score}% · пересечение ингредиентов: {m.ingredientOverlapPercent}%
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleSave({ overwriteId: m.id })}>
                    Заменить
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDuplicateMatches(null)}>Отмена</Button>
              <Button onClick={() => handleSave({ skipCheck: true })}>Способ другой — сохранить как новое</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
