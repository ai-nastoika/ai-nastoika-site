import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link2, FileText, Check, Loader2, BookOpen, FlaskConical } from "lucide-react";

/* Раньше здесь была многошаговая форма с "ИИ-обработкой" рецепта. При ближайшем
   рассмотрении она такой и не была: ключ для Moonshot читался из
   localStorage.getItem("moonshot-api-key") — реальным пользователям взять его
   неоткуда, так что фактически всегда срабатывал processFallback() с общими
   заглушками (крепость всегда "25%", категория всегда "sweet" и т.п.), а не
   настоящая генерация. Решили убрать ИИ из пользовательской формы совсем —
   администратор и так проверяет и публикует рецепты вручную (например, через
   AI-парсер на основе присланного текста — там ИИ настоящий, через Timeweb Gateway).

   Теперь — просто и честно: либо ссылка на рецепт, либо несколько обязательных
   полей текстом. Сразу уходит на модерацию, без промежуточного "ИИ-обработка". */

type Mode = "link" | "manual";

function isLikelyUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AddRecipeForm({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("link");
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const createSubmission = trpc.submission.create.useMutation();
  const submitForReview = trpc.submission.submit.useMutation();

  const canSubmit =
    authorName.trim() !== "" &&
    title.trim() !== "" &&
    (mode === "link" ? isLikelyUrl(url) : ingredients.trim() !== "" && steps.trim() !== "");

  async function handleSubmit() {
    if (!canSubmit) return;
    const { id } = await createSubmission.mutateAsync({
      authorName: authorName.trim(),
      rawTitle: title.trim(),
      rawDescription: mode === "link" ? `Ссылка на рецепт: ${url.trim()}` : undefined,
      rawIngredients: mode === "manual" ? ingredients.trim() : undefined,
      rawSteps: mode === "manual" ? steps.trim() : undefined,
      rawNotes: mode === "manual" && notes.trim() ? notes.trim() : undefined,
    });
    await submitForReview.mutateAsync({ id });
    setDone(true);
  }

  const submitting = createSubmission.isPending || submitForReview.isPending;

  if (done) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
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
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            Готово
          </button>
          <button
            onClick={() => { setDone(false); setTitle(""); setUrl(""); setIngredients(""); setSteps(""); setNotes(""); }}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <BookOpen size={18} /> Добавить ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <FlaskConical size={24} className="inline mr-2" style={{ color: "var(--accent)" }} />
          Добавить <span style={{ color: "var(--accent)" }}>свой рецепт</span>
        </h2>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
        >
          Скрыть
        </button>
      </div>

      <p className="text-sm mb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
        Пришлите рецепт — ссылкой на страницу или коротко текстом. Администратор проверит и, если всё в порядке, оформит и опубликует его в общей базе.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode("link")}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          style={{
            background: mode === "link" ? "var(--accent)" : "var(--bg-card)",
            color: mode === "link" ? "#fff" : "var(--text-secondary)",
            border: mode === "link" ? "none" : "1px solid var(--border)",
            fontFamily: "var(--font-body)",
          }}
        >
          <Link2 size={16} /> Ссылка на рецепт
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          style={{
            background: mode === "manual" ? "var(--accent)" : "var(--bg-card)",
            color: mode === "manual" ? "#fff" : "var(--text-secondary)",
            border: mode === "manual" ? "none" : "1px solid var(--border)",
            fontFamily: "var(--font-body)",
          }}
        >
          <FileText size={16} /> Заполнить вручную
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm">Ваше имя *</Label>
          <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Как вас подписать?" className="mt-1" />
        </div>

        <div>
          <Label className="text-sm">Название рецепта *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Облепиховка с мёдом" className="mt-1" />
        </div>

        {mode === "link" ? (
          <div>
            <Label className="text-sm">Ссылка на рецепт *</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
            {url.trim() !== "" && !isLikelyUrl(url) && (
              <p className="text-xs mt-1" style={{ color: "#dc2626" }}>Похоже, это не ссылка — проверьте формат (должна начинаться с http:// или https://)</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <Label className="text-sm">Ингредиенты *</Label>
              <Textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder={`Облепиха свежая — 1 кг\nМёд натуральный — 400 г\nВодка 40% — 0.5 л\n...`}
                className="mt-1 min-h-[120px]"
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Каждый ингредиент с новой строки: название — количество
              </p>
            </div>
            <div>
              <Label className="text-sm">Способ приготовления *</Label>
              <Textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={`1. Промыть облепиху, удалить веточки\n2. Залить ягоды водкой, настоять 14 дней\n3. Процедить, добавить мёд\n4. Настоять ещё 7 дней\n...`}
                className="mt-1 min-h-[140px]"
              />
            </div>
            <div>
              <Label className="text-sm">Особенности и советы (необязательно)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="С чем подавать, как хранить, личные наблюдения..."
                className="mt-1 min-h-[60px]"
              />
            </div>
          </>
        )}

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full" style={{ background: "var(--accent)", color: "#fff" }}>
          {submitting ? <><Loader2 size={18} className="mr-2 animate-spin" /> Отправляем...</> : "Отправить на модерацию"}
        </Button>
      </div>
    </div>
  );
}
