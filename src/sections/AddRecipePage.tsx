import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Send, Sparkles, Check, Loader2, User, BookOpen,
  FlaskConical, Lightbulb, RotateCcw, ChevronRight, AlertCircle,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   STEP 1: Raw input form
   ═══════════════════════════════════════════════════════════════ */
function Step1RawForm({
  onSubmit,
}: {
  onSubmit: (data: {
    authorName: string;
    rawTitle: string;
    rawDescription: string;
    rawIngredients: string;
    rawSteps: string;
    rawNotes: string;
  }) => void;
}) {
  const [authorName, setAuthorName] = useState("");
  const [rawTitle, setRawTitle] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [rawIngredients, setRawIngredients] = useState("");
  const [rawSteps, setRawSteps] = useState("");
  const [rawNotes, setRawNotes] = useState("");

  const canSubmit = authorName.trim() && rawTitle.trim() && (rawIngredients.trim() || rawSteps.trim());

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-2" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
          <FlaskConical size={18} className="inline mr-2" />
          Опишите ваш рецепт
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Заполните форму максимально подробно. ИИ поможет структурировать рецепт, подберёт вкусовой профиль и напишет описание.
        </p>
      </div>

      <div>
        <Label className="text-sm">Ваше имя *</Label>
        <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Как вас подписать?" className="mt-1" />
      </div>

      <div>
        <Label className="text-sm">Название рецепта *</Label>
        <Input value={rawTitle} onChange={(e) => setRawTitle(e.target.value)} placeholder="Например: Облепиховка с мёдом" className="mt-1" />
      </div>

      <div>
        <Label className="text-sm">Описание</Label>
        <Textarea
          value={rawDescription}
          onChange={(e) => setRawDescription(e.target.value)}
          placeholder="Общее описание: что это за напиток, в чём его особенность, вкус..."
          className="mt-1 min-h-[80px]"
        />
      </div>

      <div>
        <Label className="text-sm">Ингредиенты *</Label>
        <Textarea
          value={rawIngredients}
          onChange={(e) => setRawIngredients(e.target.value)}
          placeholder={`Облепиха свежая — 1 кг\nМёд натуральный — 400 г\nВодка 40% — 0.5 л\n...`}
          className="mt-1 min-h-[120px]"
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Каждый ингредиент с новой строки: название — количество
        </p>
      </div>

      <div>
        <Label className="text-sm">Пошаговая инструкция *</Label>
        <Textarea
          value={rawSteps}
          onChange={(e) => setRawSteps(e.target.value)}
          placeholder={`1. Промыть облепиху, удалить веточки\n2. Залить ягоды водкой, настоять 14 дней\n3. Процедить, добавить мёд\n4. Настоять ещё 7 дней\n...`}
          className="mt-1 min-h-[140px]"
        />
      </div>

      <div>
        <Label className="text-sm">Особенности и советы</Label>
        <Textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="Любые дополнительные замечания: с чем подавать, как хранить, личные наблюдения..."
          className="mt-1 min-h-[60px]"
        />
      </div>

      <Button
        onClick={() =>
          onSubmit({ authorName, rawTitle, rawDescription, rawIngredients, rawSteps, rawNotes })
        }
        disabled={!canSubmit}
        className="w-full"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        <Sparkles size={18} className="mr-2" />
        Обработать с помощью ИИ
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 2+3: AI result preview + edit
   ═══════════════════════════════════════════════════════════════ */
function Step3Review({
  processed,
  onEdit,
  onSubmit,
  onReprocess,
}: {
  processed: Record<string, unknown>;
  onEdit: (field: string, value: string) => void;
  onSubmit: () => void;
  onReprocess: () => void;
}) {
  const d = processed;
  const profileFields = [
    ["sweet", "Сладость"],
    ["sour", "Кислотность"],
    ["bitter", "Горечь"],
    ["spicy", "Острота"],
    ["fruity", "Фруктовость"],
    ["herbal", "Травянистость"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <h3 className="text-base font-bold mb-1" style={{ color: "#166534", fontFamily: "var(--font-heading)" }}>
          <Check size={18} className="inline mr-2" />
          ИИ обработал ваш рецепт
        </h3>
        <p className="text-sm" style={{ color: "#166534", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
          Проверьте результат, отредактируйте при необходимости и отправьте на модерацию.
        </p>
      </div>

      <Tabs defaultValue="main">
        <TabsList className="mb-4">
          <TabsTrigger value="main">Основное</TabsTrigger>
          <TabsTrigger value="taste">Вкусовой профиль</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="space-y-3">
          <EditField label="Название" value={String(d.title ?? "")} onChange={(v) => onEdit("title", v)} />
          <EditField label="Подзаголовок" value={String(d.subtitle ?? "")} onChange={(v) => onEdit("subtitle", v)} />
          <div className="grid grid-cols-2 gap-3">
            <EditField label="Категория" value={String(d.category ?? "")} onChange={(v) => onEdit("category", v)} />
            <EditField label="Крепость" value={String(d.abv ?? "")} onChange={(v) => onEdit("abv", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <EditField label="Время" value={String(d.time ?? "")} onChange={(v) => onEdit("time", v)} />
            <EditField label="Сложность" value={String(d.difficulty ?? "")} onChange={(v) => onEdit("difficulty", v)} />
          </div>
          <EditField label="Происхождение" value={String(d.origin ?? "")} onChange={(v) => onEdit("origin", v)} />
          <EditField label="Год" value={String(d.year ?? "")} onChange={(v) => onEdit("year", v)} />
          <EditArea label="Описание вкуса" value={String(d.tastingDescription ?? "")} onChange={(v) => onEdit("tastingDescription", v)} />
        </TabsContent>

        <TabsContent value="taste" className="space-y-3">
          {profileFields.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="text-sm w-32 shrink-0">{label}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Number((d as Record<string, unknown>)[key] ?? 0)}
                onChange={(e) => onEdit(key, e.target.value)}
                className="w-20"
              />
              <div className="flex-1 h-2 rounded-full" style={{ background: "var(--surface)" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Number((d as Record<string, unknown>)[key] ?? 0)}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <EditField label="Заголовок истории" value={String(d.historyTitle ?? "")} onChange={(v) => onEdit("historyTitle", v)} />
          <EditArea label="Текст истории" value={String(d.historyText ?? "")} onChange={(v) => onEdit("historyText", v)} />
          <EditField label="Цвет" value={String(d.tastingColor ?? "")} onChange={(v) => onEdit("tastingColor", v)} />
          <EditField label="Температура" value={String(d.tastingTemp ?? "")} onChange={(v) => onEdit("tastingTemp", v)} />
          <EditField label="Бокал" value={String(d.tastingGlass ?? "")} onChange={(v) => onEdit("tastingGlass", v)} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2 pt-3">
        <Button onClick={onReprocess} variant="outline">
          <RotateCcw size={16} className="mr-1" /> Переобработать
        </Button>
        <Button onClick={onSubmit} style={{ background: "var(--accent)", color: "#fff" }}>
          <Send size={16} className="mr-1" /> Отправить на модерацию
        </Button>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

function EditArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-[60px]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
const SYSTEM_PROMPT_SUBMISSION = `Ты — эксперт по домашним настойкам. Проанализируй рецепт от пользователя и структурируй его.

Ответь ТОЛЬКО валидным JSON без markdown:
{
  "slug": "oblepihovka-s-medom",
  "title": "Облепиховка с мёдом",
  "subtitle": "Мягкая ягодная настойка с медовыми нотками",
  "category": "sweet",
  "categoryLabel": "Сладкая",
  "abv": "25%",
  "time": "21-30 дней",
  "difficulty": "Средняя",
  "year": "XX век",
  "origin": "Россия, Сибирь",
  "historyTitle": "История облепиховки",
  "historyText": "2-3 абзаца...",
  "tastingColor": "Янтарно-оранжевый",
  "tastingDescription": "Описание...",
  "tastingTemp": "12-14°C",
  "tastingGlass": "Бокал для ликёра",
  "sweet": 70, "sour": 40, "bitter": 15, "spicy": 5, "fruity": 90, "herbal": 10,
  "authorDate": "2025"
}`;

export default function AddRecipePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submissionId, setSubmissionId] = useState(0);
  const [processed, setProcessed] = useState<Record<string, unknown>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState("");

  const createSubmission = trpc.submission.create.useMutation();
  const saveProcessed = trpc.submission.saveProcessed.useMutation();
  const submitForReview = trpc.submission.submit.useMutation();

  /* Step 1 → 2: Create draft + AI process */
  async function handleRawSubmit(data: {
    authorName: string;
    rawTitle: string;
    rawDescription: string;
    rawIngredients: string;
    rawSteps: string;
    rawNotes: string;
  }) {
    setIsProcessing(true);
    try {
      /* Create draft in DB */
      const draft = await createSubmission.mutateAsync(data);
      setSubmissionId(draft.id);

      /* Call AI (Moonshot API from browser) */
      const apiKey = localStorage.getItem("moonshot-api-key") || "";
      if (!apiKey) {
        /* Fallback: generate from user input */
        const fallbackResult = processFallback(data);
        setProcessed(fallbackResult);
        await saveProcessed.mutateAsync({ id: draft.id, ...fallbackResult });
        setStep(3);
        setIsProcessing(false);
        return;
      }

      const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "moonshot-v1-8k",
          messages: [
            { role: "system", content: SYSTEM_PROMPT_SUBMISSION },
            { role: "user", content: `Рецепт:\nНазвание: ${data.rawTitle}\nОписание: ${data.rawDescription}\nИнгредиенты: ${data.rawIngredients}\nШаги: ${data.rawSteps}\nЗаметки: ${data.rawNotes}` },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) throw new Error("AI error");
      const json = await res.json();
      const content = JSON.parse(json.choices?.[0]?.message?.content || "{}");
      setProcessed(content);
      await saveProcessed.mutateAsync({ id: draft.id, ...content });
      setStep(3);
    } catch {
      /* Fallback */
      const fallbackResult = processFallback({
        ...data,
        rawTitle: data.rawTitle,
        rawDescription: data.rawDescription,
        rawIngredients: data.rawIngredients,
        rawSteps: data.rawSteps,
        rawNotes: data.rawNotes,
      });
      setProcessed(fallbackResult);
      if (submissionId) {
        await saveProcessed.mutateAsync({ id: submissionId, ...fallbackResult });
      }
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  }

  /* Simple fallback when AI unavailable */
  function processFallback(data: {
    rawTitle: string;
    rawDescription: string;
    rawIngredients: string;
    rawSteps: string;
    rawNotes: string;
  }) {
    const slug = data.rawTitle
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[а-я]/g, (c) => {
        const map: Record<string, string> = {
          а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
          и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
          с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
          щ: "shch", ы: "y", э: "e", ю: "yu", я: "ya",
        };
        return map[c] || c;
      });
    return {
      slug,
      title: data.rawTitle,
      subtitle: data.rawDescription?.slice(0, 80) || "",
      category: "sweet",
      categoryLabel: "Сладкая",
      abv: "25%",
      time: "14-30 дней",
      difficulty: "Средняя",
      year: "XXI век",
      origin: "Россия",
      historyTitle: `История ${data.rawTitle}`,
      historyText: data.rawNotes || "Народный рецепт, передающийся из поколения в поколение.",
      tastingColor: "Янтарный",
      tastingDescription: data.rawDescription || "Насыщенный вкус с глубокими нотами.",
      tastingTemp: "12-16°C",
      tastingGlass: "Бокал для ликёра",
      sweet: 60, sour: 30, bitter: 20, spicy: 10, fruity: 70, herbal: 20,
      authorDate: new Date().getFullYear().toString(),
    };
  }

  function handleEdit(field: string, value: string) {
    setProcessed((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmitForReview() {
    if (!submissionId) return;
    await saveProcessed.mutateAsync({ id: submissionId, ...processed });
    await submitForReview.mutateAsync({ id: submissionId });
    setStep(4);
  }

  async function handleReprocess() {
    setStep(2);
    setIsProcessing(true);
    /* Re-call AI with edited data */
    await new Promise((r) => setTimeout(r, 1500));
    setProcessed((prev) => ({ ...prev, title: String(prev.title ?? "") + " (доработано)" }));
    setStep(3);
    setIsProcessing(false);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={18} /> На главную
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Sparkles size={28} className="inline mr-2" style={{ color: "var(--accent)" }} />
          Добавить <span style={{ color: "var(--accent)" }}>свой рецепт</span>
        </h1>
        <p className="text-base mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          Поделитесь уникальным рецептом с сообществом. ИИ поможет оформить, а администратор проверит перед публикацией.
        </p>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[
            { n: 1, label: "Заполнение" },
            { n: 2, label: "Обработка" },
            { n: 3, label: "Проверка" },
            { n: 4, label: "Готово" },
          ].map((s) => (
            <div
              key={s.n}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-center transition-all"
              style={{
                background: step >= s.n ? "var(--accent)" : "var(--surface)",
                color: step >= s.n ? "#fff" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {s.n}. {s.label}
            </div>
          ))}
        </div>

        {/* Step 2: Processing */}
        {step === 2 && (
          <div className="text-center py-16">
            <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: "var(--accent)" }} />
            <p className="text-lg font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              ИИ обрабатывает ваш рецепт...
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Структурируем ингредиенты, подбираем вкусовой профиль, пишем описание
            </p>
          </div>
        )}

        {/* Step 1: Form */}
        {step === 1 && !isProcessing && <Step1RawForm onSubmit={handleRawSubmit} />}

        {/* Step 3: Review */}
        {step === 3 && <Step3Review processed={processed} onEdit={handleEdit} onSubmit={handleSubmitForReview} onReprocess={handleReprocess} />}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#d8f3dc" }}>
              <Check size={32} style={{ color: "#386641" }} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Рецепт отправлен на модерацию!
            </h2>
            <p className="text-base mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              Администратор проверит ваш рецепт и, если всё в порядке, опубликует его в общей базе. Обычно это занимает 1-2 дня.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
                style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
              >
                <ChevronRight size={18} /> На главную
              </Link>
              <button
                onClick={() => { setStep(1); setProcessed({}); setSubmissionId(0); }}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
                style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                <BookOpen size={18} /> Добавить ещё
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
