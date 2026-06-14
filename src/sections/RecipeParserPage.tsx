import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Sparkles, Copy, Check,
  Plus, Trash2, Save, Bot, FileJson, Wand2,
  Image as ImageIcon, Upload, X,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Готовый промпт для Kimi
   ═══════════════════════════════════════════ */
const KIMI_PROMPT = `Ты — эксперт по домашним настойкам. Разбери следующий текст рецепта и заполни ВСЕ поля JSON.

ВАЖНЫЕ ПРАВИЛА:
1. Если параметр не указан в тексте — заполни его сам на основе знаний о данном типе настойки (типичная крепость, время, вкусовой профиль)
2. Для вкусового профиля используй шкалу 0-100 (0 = нет, 100 = максимум)
3. Для historyText напиши 2-3 предложения об истории этого типа настойки
4. Для tastingDescription опиши вкус, цвет, аромат
5. Для tastingPairing укажи 3-5 продуктов, с которыми подаётся
6. Для tips дай 2-3 полезных совета
7. Определи category из списка: sweet, bitter, herbal, spicy, citrus, coffee, honey
8. Определи categoryLabel по-русски (например: "Сладкая", "Острая", "Травяная")
9. difficulty: "Легко", "Средне" или "Сложно"
10. Для imagePrompt напиши описание на АНГЛИЙСКОМ для генерации красивой фотореалистичной картинки настойки. Описывай: цвет напитка в стеклянной бутылке/графине, ингредиенты рядом, фон (деревянный стол, тёмный фон), освещение (тёплое, мягкое). Стиль: food photography, dark moody, rustic.

Верни ТОЛЬКО JSON, без markdown, без объяснений:

{
  "title": "название",
  "subtitle": "краткое описание",
  "category": "sweet",
  "categoryLabel": "Сладкая",
  "abv": "25%",
  "time": "14 дней",
  "difficulty": "Легко",
  "year": "XVIII век",
  "origin": "Россия",
  "historyTitle": "Заголовок истории",
  "historyText": "2-3 предложения об истории",
  "tastingColor": "описание цвета",
  "tastingDescription": "описание вкуса, аромата",
  "tastingTemp": "10-12°C",
  "tastingGlass": "тип бокала",
  "tastingPairing": ["Шоколад", "Сыр", "Мясо"],
  "sweet": 85,
  "sour": 30,
  "bitter": 25,
  "spicy": 10,
  "fruity": 90,
  "herbal": 5,
  "tips": ["Совет 1", "Совет 2", "Совет 3"],
  "imagePrompt": "A beautiful glass bottle of deep ruby cherry infusion on a dark wooden table, fresh ripe cherries scattered around, warm soft lighting, food photography, dark moody rustic style",
  "authorName": "",
  "authorDate": "",
  "ingredients": [
    {"name": "Название", "amount": "500 мл", "note": "примечание"}
  ],
  "steps": [
    {"stepNum": 1, "title": "Заголовок шага", "text": "Описание действия"}
  ]
}

Вот текст рецепта:`;

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
type IngredientInput = { name: string; amount: string; note: string };
type StepInput = { stepNum: number; title: string; text: string };

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
  ingredients: IngredientInput[]; steps: StepInput[];
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
    ingredients: [], steps: [],
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
  const [tab, setTab] = useState("prompt");
  const [recipeText, setRecipeText] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [copied, setCopied] = useState(false);
  const [copiedImagePrompt, setCopiedImagePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const upsertRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => {
      utils.recipe.list.invalidate();
      setSaving(false);
      alert("Рецепт сохранён!");
    },
    onError: (err) => {
      setSaving(false);
      alert("Ошибка сохранения: " + err.message);
    },
  });

  /* ── Copy prompt ── */
  const fullPrompt = KIMI_PROMPT + "\n\n" + recipeText;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Copy image prompt ── */
  const handleCopyImagePrompt = async () => {
    if (!form.imagePrompt) return;
    await navigator.clipboard.writeText(form.imagePrompt);
    setCopiedImagePrompt(true);
    setTimeout(() => setCopiedImagePrompt(false), 2000);
  };

  /* ── Upload image ── */
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

  /* ── Parse JSON from Kimi ── */
  const handleParseJson = () => {
    try {
      const raw = jsonInput.trim();
      // Remove markdown code blocks if present
      const jsonStr = raw.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
      const data = JSON.parse(jsonStr);

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
      };

      setForm(newForm);
      setTab("edit");
    } catch (e) {
      alert("Ошибка парсинга JSON. Убедитесь, что вставили валидный JSON от Kimi.\n\nСовет: скопируйте ТОЛЬКО текст между фигурными скобками { ... }");
    }
  };

  /* ── Save ── */
  const handleSave = () => {
    if (!form.slug || !form.title) { alert("Slug и название обязательны!"); return; }
    setSaving(true);
    upsertRecipe.mutate({
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
    });
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

  return (
    <main className="min-h-screen px-4 py-8 md:px-8" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm mb-2 transition-opacity hover:opacity-70" style={{ color: "var(--accent)" }}>
          <ArrowLeft size={16} /> Назад
        </button>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--accent)" }}>
          <Bot size={28} className="inline mr-2" />
          AI-парсер рецептов (через Kimi)
        </h1>
        <p className="mt-1 mb-8" style={{ color: "var(--text-secondary)" }}>
          Kimi разбирает текст рецепта и заполняет все поля — даже те, что не указаны явно
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="prompt">1. Вставить текст</TabsTrigger>
            <TabsTrigger value="json" disabled={!recipeText}>2. Вставить JSON от Kimi</TabsTrigger>
            <TabsTrigger value="edit" disabled={!form.title}>3. Редактировать</TabsTrigger>
          </TabsList>

          {/* ═════ STEP 1: Source text ═════ */}
          <TabsContent value="prompt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson size={20} />
                  Шаг 1: Вставьте текст рецепта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder={`Вставьте сюда текст рецепта с любого сайта или форума. Может быть в любом формате — хоть списком, хоть описательным текстом.

Пример:
"Вот отличный рецепт вишнёвой настойки, который достался мне от бабушки. Берём килограмм спелой вишни, заливаем пол-литра хорошей водки, добавляем стакан сахара и настаиваем две недели в тёмном месте. Получается очень мягкий и сладкий напиток, крепостью около 25 градусов. Отлично подаётся к шоколадному торту."`}
                  className="min-h-[250px]"
                />

                <div className="rounded-xl p-4" style={{ background: "var(--accent)", color: "#fff" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={18} />
                    <span className="font-semibold">Что дальше?</span>
                  </div>
                  <ol className="space-y-1 text-sm opacity-95 list-decimal list-inside">
                    <li>Нажмите кнопку «Скопировать промпт» ниже</li>
                    <li>Откройте <a href="https://kimi.ai" target="_blank" rel="noopener noreferrer" className="underline font-medium">kimi.ai</a> в новой вкладке</li>
                    <li>Вставьте промпт в чат Kimi и отправьте</li>
                    <li>Kimi вернёт заполненный JSON со всеми полями + промпт для картинки</li>
                    <li>Скопируйте JSON и вернитесь на вкладку «Вставить JSON»</li>
                  </ol>
                </div>

                <Button onClick={handleCopy} disabled={!recipeText.trim()} size="lg" className="w-full">
                  {copied ? <><Check size={18} className="mr-2" /> Скопировано! Откройте Kimi →</> : <><Copy size={18} className="mr-2" /> Скопировать промпт для Kimi</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═════ STEP 2: JSON from Kimi ═════ */}
          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 size={20} />
                  Шаг 2: Вставьте ответ Kimi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`Вставьте сюда JSON, который вернул Kimi. Пример:

{
  "title": "Вишнёвая настойка",
  "subtitle": "Классический домашний рецепт",
  "category": "sweet",
  "categoryLabel": "Сладкая",
  "abv": "25%",
  "time": "14 дней",
  "imagePrompt": "A beautiful glass bottle of deep ruby cherry infusion...",
  ...
}`}
                  className="min-h-[300px] font-mono text-sm"
                />
                <Button onClick={handleParseJson} disabled={!jsonInput.trim()} size="lg">
                  <Sparkles size={18} className="mr-2" />
                  Разобрать JSON и перейти к редактированию
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═════ STEP 3: Edit form ═════ */}
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
                      <select className="w-full h-10 rounded-md border px-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} value={form.category} onChange={(e) => patch({ category: e.target.value })}>
                        {["sweet","bitter","herbal","spicy","citrus","coffee","honey"].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div><Label>Метка</Label><Input value={form.categoryLabel} onChange={(e) => patch({ categoryLabel: e.target.value })} /></div>
                    <div><Label>ABV</Label><Input value={form.abv} onChange={(e) => patch({ abv: e.target.value })} /></div>
                    <div><Label>Время</Label><Input value={form.time} onChange={(e) => patch({ time: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Сложность</Label>
                      <select className="w-full h-10 rounded-md border px-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} value={form.difficulty} onChange={(e) => patch({ difficulty: e.target.value })}>
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
                  {/* Image prompt from Kimi */}
                  {form.imagePrompt && (
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Промпт для генерации картинки</Label>
                        <Button size="sm" variant="outline" onClick={handleCopyImagePrompt}>
                          {copiedImagePrompt ? <><Check size={14} className="mr-1" /> Скопировано</> : <><Copy size={14} className="mr-1" /> Скопировать</>}
                        </Button>
                      </div>
                      <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{form.imagePrompt}</p>
                      <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
                        <p>Вставьте этот промпт в генератор картинок:</p>
                        <div className="flex flex-wrap gap-2">
                          <a href="https://fusionbrain.ai" target="_blank" rel="noopener noreferrer" className="underline">Kandinsky</a>
                          <span>·</span>
                          <a href="https://ideogram.ai" target="_blank" rel="noopener noreferrer" className="underline">Ideogram</a>
                          <span>·</span>
                          <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="underline">ChatGPT</a>
                        </div>
                      </div>
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
                <Button variant="outline" onClick={() => setTab("json")}>← Назад к JSON</Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setForm(emptyForm()); setImagePreview(null); setTab("prompt"); }}>Новый рецепт</Button>
                  <Button onClick={handleSave} disabled={saving} size="lg">
                    <Save size={18} className="mr-2" />
                    {saving ? "Сохранение..." : "Сохранить рецепт"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
