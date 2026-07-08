import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Send, Sparkles, Check, Loader2, MapPin, RotateCcw, Wine,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   STEP 1: Raw input form
   ═══════════════════════════════════════════════════════════════ */
function Step1RawForm({
  onSubmit,
}: {
  onSubmit: (data: {
    authorName: string;
    rawUrl: string;
    rawCoords: string;
    rawAddress: string;
    rawPhone: string;
    rawHours: string;
    rawReviews: string;
    rawNotes: string;
  }) => void;
}) {
  const [authorName, setAuthorName] = useState("");
  const [rawUrl, setRawUrl] = useState("");
  const [rawCoords, setRawCoords] = useState("");
  const [rawAddress, setRawAddress] = useState("");
  const [rawPhone, setRawPhone] = useState("");
  const [rawHours, setRawHours] = useState("");
  const [rawReviews, setRawReviews] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  const resolveUrl = trpc.placeSubmission.resolveUrl.useQuery(
    { url: rawUrl },
    { enabled: false }
  );

  async function handleResolveCoords() {
    if (!rawUrl.trim()) return;
    setResolving(true);
    setResolveError("");
    try {
      const result = await resolveUrl.refetch();
      const data = result.data;
      if (data?.lat != null && data?.lng != null) {
        setRawCoords(`${data.lat}, ${data.lng}`);
      } else {
        setResolveError("Не удалось найти координаты в этой ссылке. Скопируйте их вручную из адресной строки Яндекс.Карт.");
      }
    } catch {
      setResolveError("Не удалось перейти по ссылке. Проверьте её и попробуйте ещё раз, либо впишите координаты вручную.");
    } finally {
      setResolving(false);
    }
  }

  const canSubmit = authorName.trim() && rawCoords.trim() && (rawAddress.trim() || rawUrl.trim());

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-base font-bold mb-2" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
          <Wine size={18} className="inline mr-2" />
          Расскажите о заведении
        </h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Вставьте ссылку с Яндекс.Карт и данные, которые нашли (адрес, телефон, часы, отзывы) — ИИ структурирует это
          и напишет краткое резюме с акцентом на настойки.
        </p>
      </div>

      <div>
        <Label className="text-sm">Ваше имя *</Label>
        <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Как вас подписать?" className="mt-1" />
      </div>

      <div>
        <Label className="text-sm">Ссылка на Яндекс.Карты</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={rawUrl}
            onChange={(e) => setRawUrl(e.target.value)}
            placeholder="https://yandex.ru/maps/-/CTuJZL0D или полная ссылка"
          />
          <Button type="button" variant="outline" onClick={handleResolveCoords} disabled={!rawUrl.trim() || resolving}>
            {resolving ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            <span className="ml-1 hidden sm:inline">Найти координаты</span>
          </Button>
        </div>
        {resolveError && (
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{resolveError}</p>
        )}
      </div>

      <div>
        <Label className="text-sm">Координаты (широта, долгота) *</Label>
        <Input
          value={rawCoords}
          onChange={(e) => setRawCoords(e.target.value)}
          placeholder="55.751244, 37.618423"
          className="mt-1"
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Заполнятся сами после «Найти координаты», либо впишите вручную (широта первая, долгота вторая)
        </p>
      </div>

      <div>
        <Label className="text-sm">Адрес</Label>
        <Input value={rawAddress} onChange={(e) => setRawAddress(e.target.value)} placeholder="Город, улица, дом" className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm">Телефон</Label>
          <Input value={rawPhone} onChange={(e) => setRawPhone(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-sm">Часы работы</Label>
          <Input value={rawHours} onChange={(e) => setRawHours(e.target.value)} placeholder="Пн-Вс 12:00–00:00" className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-sm">Отзывы про настойки (вставьте найденные фрагменты)</Label>
        <Textarea
          value={rawReviews}
          onChange={(e) => setRawReviews(e.target.value)}
          placeholder={`Вставьте 3-5 показательных отзывов или их фрагментов, где упоминаются настойки, хреновуха, наливки и т.д. — каждый с новой строки`}
          className="mt-1 min-h-[120px]"
        />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          Чем показательнее отзывы — тем точнее ИИ напишет резюме и выделит плюсы/минусы
        </p>
      </div>

      <div>
        <Label className="text-sm">Свои заметки</Label>
        <Textarea
          value={rawNotes}
          onChange={(e) => setRawNotes(e.target.value)}
          placeholder="Личные впечатления, особенности, на что обратить внимание..."
          className="mt-1 min-h-[60px]"
        />
      </div>

      <Button
        onClick={() =>
          onSubmit({ authorName, rawUrl, rawCoords, rawAddress, rawPhone, rawHours, rawReviews, rawNotes })
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
   STEP 3: AI result preview + edit
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

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <h3 className="text-base font-bold mb-1" style={{ color: "#166534", fontFamily: "var(--font-heading)" }}>
          <Check size={18} className="inline mr-2" />
          ИИ обработал данные о заведении
        </h3>
        <p className="text-sm" style={{ color: "#166534", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
          Проверьте результат, отредактируйте при необходимости и отправьте на модерацию.
        </p>
      </div>

      <EditField label="Название" value={String(d.name ?? "")} onChange={(v) => onEdit("name", v)} />
      <div className="grid grid-cols-2 gap-3">
        <EditField label="Город" value={String(d.city ?? "")} onChange={(v) => onEdit("city", v)} />
        <EditField label="Метро" value={String(d.metro ?? "")} onChange={(v) => onEdit("metro", v)} />
      </div>
      <EditField label="Адрес" value={String(d.address ?? "")} onChange={(v) => onEdit("address", v)} />
      <div className="grid grid-cols-2 gap-3">
        <EditField label="Телефон" value={String(d.phone ?? "")} onChange={(v) => onEdit("phone", v)} />
        <EditField label="Часы работы" value={String(d.hours ?? "")} onChange={(v) => onEdit("hours", v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <EditField label="Широта" value={String(d.lat ?? "")} onChange={(v) => onEdit("lat", v)} />
        <EditField label="Долгота" value={String(d.lng ?? "")} onChange={(v) => onEdit("lng", v)} />
      </div>
      <EditField label="Изюминка настоек" value={String(d.infusionsHighlight ?? "")} onChange={(v) => onEdit("infusionsHighlight", v)} />
      <EditField label="Фирменная настойка" value={String(d.infusionsSignature ?? "")} onChange={(v) => onEdit("infusionsSignature", v)} />
      <EditArea label="Описание" value={String(d.description ?? "")} onChange={(v) => onEdit("description", v)} />
      <EditArea label="Резюме из отзывов" value={String(d.externalSummary ?? "")} onChange={(v) => onEdit("externalSummary", v)} />
      <EditArea
        label="Плюсы (по строкам)"
        value={Array.isArray(d.externalPros) ? (d.externalPros as string[]).join("\n") : ""}
        onChange={(v) => onEdit("externalPros", v)}
      />
      <EditArea
        label="Минусы (по строкам)"
        value={Array.isArray(d.externalCons) ? (d.externalCons as string[]).join("\n") : ""}
        onChange={(v) => onEdit("externalCons", v)}
      />
      <EditArea
        label="Теги (по строкам)"
        value={Array.isArray(d.tags) ? (d.tags as string[]).join("\n") : ""}
        onChange={(v) => onEdit("tags", v)}
      />

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
   SYSTEM PROMPT
   ═══════════════════════════════════════════════════════════════ */
const SYSTEM_PROMPT_PLACE = `Ты — эксперт по барам и заведениям, подающим домашние настойки (хреновуха, вишнёвка, наливки и т.д.).
Тебе даны сырые данные о заведении и фрагменты отзывов посетителей.

Твоя задача:
1. Структурировать данные о заведении.
2. Придумать корректный slug (латиницей, через дефис) на основе названия/адреса.
3. Проанализировать отзывы: найти упоминания настоек, определить, какие именно есть, и написать краткое резюме
   с акцентом на них.
4. Выделить 2-4 плюса и 1-3 минуса на основе отзывов (только то, что реально следует из текста, не выдумывай).
5. Если название заведения не дано явно — определи его по контексту (адресу/ссылке/заметкам), иначе используй "Без названия".

Ответь ТОЛЬКО валидным JSON без markdown:
{
  "slug": "bar-name-city",
  "name": "Название бара",
  "city": "Москва",
  "metro": "Пушкинская",
  "hours": "Пн-Вс 12:00–00:00",
  "infusionsHighlight": "Большой выбор ягодных настоек собственного производства",
  "infusionsSignature": "Хреновуха домашняя",
  "description": "2-3 предложения общего описания заведения",
  "externalSummary": "Краткое резюме на основе отзывов, 3-5 предложений, с акцентом на настойки",
  "externalPros": ["Плюс 1", "Плюс 2"],
  "externalCons": ["Минус 1"],
  "tags": ["настойки", "домашние наливки", "уютная атмосфера"]
}`;

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AddPlaceForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submissionId, setSubmissionId] = useState(0);
  const [processed, setProcessed] = useState<Record<string, unknown>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRaw, setLastRaw] = useState<Record<string, string> | null>(null);

  const createSubmission = trpc.placeSubmission.create.useMutation();
  const saveProcessed = trpc.placeSubmission.saveProcessed.useMutation();
  const submitForReview = trpc.placeSubmission.submit.useMutation();

  function parseCoords(rawCoords: string): { lat?: number; lng?: number } {
    const parts = rawCoords.split(",").map((p) => Number(p.trim().replace(",", ".")));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return {};
  }

  async function handleRawSubmit(data: {
    authorName: string;
    rawUrl: string;
    rawCoords: string;
    rawAddress: string;
    rawPhone: string;
    rawHours: string;
    rawReviews: string;
    rawNotes: string;
  }) {
    setIsProcessing(true);
    setLastRaw(data);
    try {
      const draft = await createSubmission.mutateAsync(data);
      setSubmissionId(draft.id);

      const coords = parseCoords(data.rawCoords);
      const apiKey = localStorage.getItem("moonshot-api-key") || "";

      if (!apiKey) {
        const fallbackResult = processFallback(data, coords);
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
            { role: "system", content: SYSTEM_PROMPT_PLACE },
            {
              role: "user",
              content: `Ссылка: ${data.rawUrl}\nАдрес: ${data.rawAddress}\nТелефон: ${data.rawPhone}\nЧасы: ${data.rawHours}\nОтзывы:\n${data.rawReviews}\nЗаметки: ${data.rawNotes}`,
            },
          ],
          temperature: 0.6,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) throw new Error("AI error");
      const json = await res.json();
      const content = JSON.parse(json.choices?.[0]?.message?.content || "{}");
      const withCoords = { ...content, lat: coords.lat, lng: coords.lng, phone: data.rawPhone || content.phone };
      setProcessed(withCoords);
      await saveProcessed.mutateAsync({ id: draft.id, ...withCoords });
      setStep(3);
    } catch {
      const coords = parseCoords(data.rawCoords);
      const fallbackResult = processFallback(data, coords);
      setProcessed(fallbackResult);
      if (submissionId) {
        await saveProcessed.mutateAsync({ id: submissionId, ...fallbackResult });
      }
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  }

  function processFallback(
    data: { authorName: string; rawUrl: string; rawAddress: string; rawPhone: string; rawHours: string; rawReviews: string; rawNotes: string },
    coords: { lat?: number; lng?: number }
  ) {
    const base = data.rawAddress || data.rawUrl || "novoe-mesto";
    const slug = base
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
      })
      .slice(0, 90);
    return {
      slug: slug || `mesto-${Date.now()}`,
      name: "Новое заведение (заполните название)",
      city: "",
      address: data.rawAddress,
      metro: "",
      phone: data.rawPhone,
      hours: data.rawHours,
      lat: coords.lat,
      lng: coords.lng,
      infusionsHighlight: "",
      infusionsSignature: "",
      description: data.rawNotes || "",
      externalSummary: data.rawReviews ? "Не удалось обработать ИИ — проверьте отзывы вручную." : "",
      externalPros: [] as string[],
      externalCons: [] as string[],
      tags: ["настойки"],
    };
  }

  function handleEdit(field: string, value: string) {
    if (field === "externalPros" || field === "externalCons" || field === "tags") {
      setProcessed((prev) => ({ ...prev, [field]: value.split("\n").map((s) => s.trim()).filter(Boolean) }));
    } else if (field === "lat" || field === "lng") {
      setProcessed((prev) => ({ ...prev, [field]: value === "" ? undefined : Number(value) }));
    } else {
      setProcessed((prev) => ({ ...prev, [field]: value }));
    }
  }

  async function handleSubmitForReview() {
    if (!submissionId) return;
    await saveProcessed.mutateAsync({ id: submissionId, ...processed });
    await submitForReview.mutateAsync({ id: submissionId });
    setStep(4);
  }

  async function handleReprocess() {
    if (!lastRaw) return;
    setStep(2);
    setIsProcessing(true);
    await handleRawSubmit(lastRaw as any);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Wine size={24} className="inline mr-2" style={{ color: "var(--accent)" }} />
          Предложить <span style={{ color: "var(--accent)" }}>заведение</span>
        </h2>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
        >
          Скрыть
        </button>
      </div>

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

      {step === 2 && (
        <div className="text-center py-16">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: "var(--accent)" }} />
          <p className="text-lg font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            ИИ анализирует заведение и отзывы...
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Ищем упоминания настоек, формируем резюме, плюсы и минусы
          </p>
        </div>
      )}

      {step === 1 && !isProcessing && <Step1RawForm onSubmit={handleRawSubmit} />}

      {step === 3 && <Step3Review processed={processed} onEdit={handleEdit} onSubmit={handleSubmitForReview} onReprocess={handleReprocess} />}

      {step === 4 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#d8f3dc" }}>
            <Check size={32} style={{ color: "#386641" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Заведение отправлено на модерацию!
          </h2>
          <p className="text-base mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
            Администратор проверит данные и, если всё в порядке, заведение появится на барной карте.
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
              onClick={() => { setStep(1); setProcessed({}); setSubmissionId(0); }}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
              style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <Wine size={18} /> Добавить ещё
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
