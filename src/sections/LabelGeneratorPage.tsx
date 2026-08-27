import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";
import { printLabelOnA4 } from "@/lib/printLabel";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Type,
  Palette,
  Shapes,
  Wand2,
  LogIn,
  Wallet,
  RotateCcw,
  Printer,
  Tag,
  Camera,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";

type SourceMode = "scratch" | "photo";

type Orientation = "vertical" | "square" | "horizontal";

/* Три ориентации — единственный выбор пропорций, который есть у пользователя.
   Жёстко привязаны к тому, что реально запрашивается у ИИ (см.
   api/labelGeneratorRouter.ts, ORIENTATIONS) — то, что выбрано здесь, и есть
   финальная пропорция, без обрезки при печати. */
const ORIENTATION_OPTIONS: { k: Orientation; label: string; cssRatio: string; printW: number; printH: number }[] = [
  { k: "vertical", label: "Вертикальная", cssRatio: "3 / 4", printW: 90, printH: 120 },
  { k: "square", label: "Квадратная", cssRatio: "1 / 1", printW: 100, printH: 100 },
  { k: "horizontal", label: "Горизонтальная", cssRatio: "4 / 3", printW: 120, printH: 90 },
];

/* ═══════════════════════════════════════════════════════════════
   LABEL GENERATOR PAGE — только генерация ИИ. Текст встраивается моделью
   прямо в промпт (не CSS-наложением). Печать — реальная раскладка на A4
   (2×2, 4 копии), картинка вписывается ЦЕЛИКОМ (без обрезки) в физический
   размер, соответствующий выбранной ориентации.
   ═══════════════════════════════════════════════════════════════ */
export default function LabelGeneratorPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [sourceMode, setSourceMode] = useState<SourceMode>("scratch");

  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState("");
  const [elements, setElements] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("vertical");

  const [labelTitle, setLabelTitle] = useState("");
  const [labelSubtitle, setLabelSubtitle] = useState("");
  const [labelAbv, setLabelAbv] = useState("");
  const [labelDate, setLabelDate] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // ── Режим "своё фото + ИИ" ──
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoDescription, setPhotoDescription] = useState("");
  const [photoStyle, setPhotoStyle] = useState("");
  const [photoOrientation, setPhotoOrientation] = useState<Orientation>("vertical");
  const [photoLabelText, setPhotoLabelText] = useState("");
  const [photoTextPlacement, setPhotoTextPlacement] = useState<"top" | "middle" | "bottom">("middle");
  const [photoResult, setPhotoResult] = useState<string>("");
  const [photoGenerating, setPhotoGenerating] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: limitInfo, refetch: refetchLimit } = trpc.labelGenerator.checkLimit.useQuery(undefined, {
    enabled: isLoggedIn,
  });
  const { data: examples } = trpc.labelExample.list.useQuery();
  const [exampleLightbox, setExampleLightbox] = useState<{ imageUrl: string; title: string | null; prompt: string } | null>(null);

  const generate = trpc.labelGenerator.generate.useMutation({
    onSuccess: () => refetchLimit(),
    onError: () => refetchLimit(),
  });

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Выберите изображение (JPG/PNG/WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Максимальный размер фото — 10 МБ");
      return;
    }
    setPhotoError("");
    setPhotoFile(file);
    setPhotoResult("");
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handlePhotoGenerate() {
    if (!photoFile || !photoDescription.trim() || photoGenerating) return;
    setPhotoGenerating(true);
    setPhotoError("");
    try {
      const token = localStorage.getItem("auth-token") || "";
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("prompt", photoDescription.trim());
      if (photoStyle.trim()) formData.append("style", photoStyle.trim());
      formData.append("orientation", photoOrientation);
      if (photoLabelText.trim()) {
        formData.append("labelText", photoLabelText.trim());
        formData.append("textPlacement", photoTextPlacement);
      }
      const res = await fetch("/api/edit-label-photo", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      let data: { success?: boolean; image?: { imageBase64?: string; imageUrl?: string }; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Сервер вернул некорректный ответ (HTTP ${res.status}) — попробуйте ещё раз`);
      }

      if (!res.ok || !data?.success || !data.image) {
        throw new Error(data?.error || `Ошибка сервера (HTTP ${res.status})`);
      }

      const img = data.image;
      setPhotoResult(img.imageUrl ?? (img.imageBase64 ? `data:image/png;base64,${img.imageBase64}` : ""));
      refetchLimit();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Не удалось обработать фото");
      refetchLimit();
    } finally {
      setPhotoGenerating(false);
    }
  }

  function handlePhotoReset() {
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoDescription("");
    setPhotoStyle("");
    setPhotoOrientation("vertical");
    setPhotoLabelText("");
    setPhotoTextPlacement("middle");
    setPhotoResult("");
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  const generatedImage =
    sourceMode === "photo"
      ? photoResult
      : generate.data
      ? generate.data.image.imageUrl ?? (generate.data.image.imageBase64 ? `data:image/png;base64,${generate.data.image.imageBase64}` : "")
      : "";

  const balanceRub = limitInfo ? limitInfo.balanceKopecks / 100 : 0;
  const costRub = limitInfo ? limitInfo.costKopecks / 100 : 10;
  const limitReached = limitInfo ? !limitInfo.allowed : false;

  const activeOrientation = ORIENTATION_OPTIONS.find((o) => o.k === (sourceMode === "photo" ? photoOrientation : orientation))!;

  /* Сколько копий реально помещается на A4 для текущей ориентации —
     считается от печатной области (лист минус поля), не жёстко зашито,
     иначе широкие/горизонтальные этикетки вылезают за край листа. */
  function computePrintGrid() {
    const PAGE_W_MM = 210, PAGE_H_MM = 297, MARGIN_MM = 10, GAP_MM = 6;
    const usableW = PAGE_W_MM - MARGIN_MM * 2;
    const usableH = PAGE_H_MM - MARGIN_MM * 2;
    const cols = Math.max(1, Math.floor((usableW + GAP_MM) / (activeOrientation.printW + GAP_MM)));
    const rows = Math.max(1, Math.floor((usableH + GAP_MM) / (activeOrientation.printH + GAP_MM)));
    return { cols, rows, count: cols * rows };
  }
  const printGrid = computePrintGrid();

  function handleGenerate() {
    if (!description.trim() || !labelTitle.trim() || generate.isPending || limitReached) return;
    generate.mutate({
      description: description.trim(),
      style,
      colors,
      elements,
      orientation,
      title: labelTitle.trim(),
      subtitle: labelSubtitle,
      abv: labelAbv,
      date: labelDate,
    });
  }

  function handleReset() {
    setDescription("");
    setStyle("");
    setColors("");
    setElements("");
    setOrientation("vertical");
    setLabelTitle("");
    setLabelSubtitle("");
    setLabelAbv("");
    setLabelDate("");
    generate.reset();
  }

  function handlePrint() {
    if (!generatedImage) return;
    // В режиме "своё фото" ориентация неизвестна заранее (зависит от снимка) —
    // printLabelOnA4 сама определит её по факту пропорций картинки.
    printLabelOnA4(generatedImage, sourceMode === "photo" ? photoOrientation : orientation);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={18} /> Назад
        </button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Сгенерировать <span style={{ color: "var(--accent)" }}>этикетку</span> с ИИ
            </h1>
            <p className="text-base mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Опишите пожелания одной формой — ИИ нарисует готовую печатную этикетку с вашим текстом.
            </p>
          </div>
          <Link
            to="/profile?tab=labels"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all hover:opacity-70 shrink-0"
            style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <Tag size={16} /> Мои этикетки
          </Link>
        </div>
      </div>

      {/* Примеры сгенерированных этикеток — витрина, пополняется администраторами */}
      {examples && examples.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Примеры
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-4">
            {examples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setExampleLightbox({ imageUrl: ex.imageUrl, title: ex.title, prompt: ex.prompt })}
                className="shrink-0 w-40 sm:w-auto text-left rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <img src={ex.imageUrl} alt={ex.title ?? "Пример этикетки"} className="w-full aspect-square object-cover" />
                {ex.title && (
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{ex.title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 grid lg:grid-cols-2 gap-8">
        {/* ─── Левая колонка: форма ─── */}
        <div className="space-y-6">
          {/* Переключатель режима */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceMode("scratch")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: sourceMode === "scratch" ? "var(--accent)" : "var(--bg-card)",
                color: sourceMode === "scratch" ? "#fff" : "var(--text-secondary)",
                border: sourceMode === "scratch" ? "none" : "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              <FileText size={16} /> С нуля по описанию
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("photo")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: sourceMode === "photo" ? "var(--accent)" : "var(--bg-card)",
                color: sourceMode === "photo" ? "#fff" : "var(--text-secondary)",
                border: sourceMode === "photo" ? "none" : "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              <Camera size={16} /> Своё фото + ИИ
            </button>
          </div>

          {sourceMode === "photo" ? (
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Своё фото + описание
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                Загрузите фото своей бутылки (или любое референсное изображение) и опишите, что с ним сделать — ИИ отредактирует именно это фото, а не нарисует с нуля.
              </p>

              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
                  <img src={photoPreview} alt="Загруженное фото" className="w-full max-h-64 object-contain" style={{ background: "var(--surface)" }} />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute top-2 right-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  >
                    Заменить
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-40 rounded-xl flex flex-col items-center justify-center gap-2 mb-4 transition-all hover:opacity-70"
                  style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}
                >
                  <Upload size={28} />
                  <span className="text-sm font-medium">Загрузить фото</span>
                  <span className="text-xs">JPG, PNG или WebP · до 10 МБ</span>
                </button>
              )}

              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                <Wand2 size={16} /> Что сделать с этим фото
              </label>
              <textarea
                value={photoDescription}
                onChange={(e) => setPhotoDescription(e.target.value)}
                placeholder={`Например: "Добавь на бутылку этикетку с текстом «Вишнёвая настойка», в винтажном стиле, тёмно-бордовые и золотые тона" или "Замени фон на нейтральный светлый, добавь мягкие тени"`}
                className="w-full rounded-lg px-4 py-3 text-base outline-none resize-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: 100, fontFamily: "var(--font-body)" }}
              />

              <label className="flex items-center gap-2 text-sm font-medium mb-2 mt-4" style={{ color: "var(--text-muted)" }}>
                <Palette size={16} /> Стиль (необязательно)
              </label>
              <input
                type="text"
                value={photoStyle}
                onChange={(e) => setPhotoStyle(e.target.value)}
                placeholder="винтажный, минимализм, акварельный, ботанический..."
                className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
              />

              <label className="text-sm font-medium mb-2 mt-4 block" style={{ color: "var(--text-muted)" }}>Ориентация результата</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {ORIENTATION_OPTIONS.map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setPhotoOrientation(o.k)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: photoOrientation === o.k ? "var(--accent)" : "var(--surface)",
                      color: photoOrientation === o.k ? "#fff" : "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Фото аккуратно обрежется под эту пропорцию перед отправкой — самая «интересная» часть кадра (обычно сама бутылка) не пострадает.
              </p>

              <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                <Type size={16} /> Текст на этикетке (необязательно)
              </label>
              <input
                type="text"
                value={photoLabelText}
                onChange={(e) => setPhotoLabelText(e.target.value)}
                placeholder="Вишнёвая настойка"
                className="w-full rounded-lg px-3 py-2.5 text-base outline-none mb-2"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
              />
              {photoLabelText.trim() && (
                <div className="flex gap-2">
                  {([
                    { k: "top", label: "Сверху" },
                    { k: "middle", label: "По центру" },
                    { k: "bottom", label: "Снизу" },
                  ] as const).map((p) => (
                    <button
                      key={p.k}
                      onClick={() => setPhotoTextPlacement(p.k)}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: photoTextPlacement === p.k ? "var(--accent)" : "var(--surface)",
                        color: photoTextPlacement === p.k ? "#fff" : "var(--text-secondary)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <>
          {/* Design wishes */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Пожелания к дизайну
            </h3>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Wand2 size={16} /> Опишите этикетку своими словами
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Например: винтажная этикетка с золотыми виноградными лозами, тёмно-бордовый фон..."
                  className="w-full rounded-lg px-4 py-3 text-base outline-none resize-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", minHeight: 90, fontFamily: "var(--font-body)" }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Без лишних деталей — чем короче и яснее, тем меньше риск, что ИИ что-то испортит.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    <Shapes size={16} /> Стиль
                  </label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="винтаж, минимализм..."
                    className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    <Palette size={16} /> Цвета
                  </label>
                  <input
                    type="text"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="бордо и золото..."
                    className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Sparkles size={16} /> Элементы декора
                </label>
                <input
                  type="text"
                  value={elements}
                  onChange={(e) => setElements(e.target.value)}
                  placeholder="виноград, ягоды, цветы..."
                  className="w-full rounded-lg px-3 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Ориентация этикетки</label>
                <div className="flex flex-wrap gap-2">
                  {ORIENTATION_OPTIONS.map((o) => (
                    <button
                      key={o.k}
                      onClick={() => setOrientation(o.k)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: orientation === o.k ? "var(--accent)" : "var(--surface)",
                        color: orientation === o.k ? "#fff" : "var(--text-secondary)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Label text — уходит в промпт */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Текст на этикетке
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              ИИ встроит эти надписи прямо в изображение при генерации.
            </p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  <Type size={16} /> Название напитка *
                </label>
                <input
                  type="text"
                  value={labelTitle}
                  onChange={(e) => setLabelTitle(e.target.value)}
                  placeholder="Вишнёвка бабушкина"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Подпись / описание</label>
                <input
                  type="text"
                  value={labelSubtitle}
                  onChange={(e) => setLabelSubtitle(e.target.value)}
                  placeholder="Домашний рецепт"
                  className="w-full rounded-lg px-4 py-2.5 text-base outline-none"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Крепость</label>
                  <input
                    type="text"
                    value={labelAbv}
                    onChange={(e) => setLabelAbv(e.target.value)}
                    placeholder="25%"
                    className="w-full rounded-lg px-3 py-2 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Дата</label>
                  <input
                    type="text"
                    value={labelDate}
                    onChange={(e) => setLabelDate(e.target.value)}
                    placeholder="2026"
                    className="w-full rounded-lg px-3 py-2 text-base outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                  />
                </div>
              </div>
            </div>
          </div>
          </>
          )}

          {/* Generate */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {!isLoggedIn ? (
              <div className="text-center py-4">
                <Sparkles size={32} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                  Генерация этикетки требует входа в аккаунт.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  <LogIn size={16} /> Войти
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    Сгенерировать
                  </h3>
                  {limitInfo && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      <Wallet size={12} /> Баланс: {balanceRub} ₽ · {costRub} ₽ за генерацию
                    </span>
                  )}
                </div>

                {limitReached ? (
                  <div className="text-sm mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    На балансе меньше {costRub} ₽ — генерация изображений без бесплатного лимита, дороже обычных запросов.{" "}
                    <Link to="/profile?tab=history" className="underline font-medium" style={{ color: "var(--accent)" }}>
                      Пополнить баланс
                    </Link>
                  </div>
                ) : sourceMode === "photo" ? (
                  <button
                    onClick={handlePhotoGenerate}
                    disabled={!photoFile || !photoDescription.trim() || photoGenerating}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                  >
                    {photoGenerating ? <Loader2 size={22} className="animate-spin" /> : <Sparkles size={22} />}
                    {photoGenerating ? "Обрабатываю фото..." : `Сгенерировать (${costRub} ₽)`}
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!description.trim() || !labelTitle.trim() || generate.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                  >
                    <Sparkles size={22} />
                    {generate.isPending ? "Генерирую..." : `Сгенерировать (${costRub} ₽)`}
                  </button>
                )}
                {sourceMode === "scratch" && !labelTitle.trim() && !limitReached && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Заполните название напитка выше.</p>
                )}
                {sourceMode === "photo" && !photoFile && !limitReached && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Загрузите фото выше.</p>
                )}

                {sourceMode === "scratch" && generate.isPending && <div className="mt-3"><BottleThinkingIndicator label="Рисую этикетку..." /></div>}
                {sourceMode === "photo" && photoGenerating && <div className="mt-3"><BottleThinkingIndicator label="Обрабатываю фото..." /></div>}

                {sourceMode === "scratch" && generate.error && (
                  <p className="text-sm mt-3" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
                    {generate.error.message}
                  </p>
                )}
                {sourceMode === "photo" && photoError && (
                  <p className="text-sm mt-3" style={{ color: "#dc2626", fontFamily: "var(--font-body)" }}>
                    {photoError}
                  </p>
                )}
              </>
            )}
          </div>

          {((sourceMode === "scratch" && (description || labelTitle || generatedImage)) ||
            (sourceMode === "photo" && (photoFile || photoDescription || generatedImage))) && (
            <button
              onClick={sourceMode === "photo" ? handlePhotoReset : handleReset}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
              style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <RotateCcw size={16} /> Начать заново
            </button>
          )}
        </div>

        {/* ─── Правая колонка: результат + печать ─── */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="flex flex-col items-center justify-center rounded-2xl p-8" style={{ background: "var(--bg-secondary)" }}>
            {generatedImage ? (
              <button
                onClick={() => setLightboxOpen(true)}
                className="w-full rounded-lg overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.02] cursor-zoom-in"
                style={{ maxWidth: 420, aspectRatio: activeOrientation.cssRatio, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", background: "#fff" }}
                title="Нажмите, чтобы увеличить"
              >
                <img
                  src={generatedImage}
                  alt="Сгенерированная этикетка"
                  className="max-w-full max-h-full"
                  style={{ objectFit: "contain" }}
                />
              </button>
            ) : (
              <div
                className="flex items-center justify-center rounded-lg w-full"
                style={{ height: 320, background: "var(--bg-card)", border: "1px dashed var(--border)" }}
              >
                <p className="text-sm text-center px-6" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Здесь появится готовая этикетка после генерации
                </p>
              </div>
            )}

            {generatedImage && (
              <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Показано и печатается целиком, без обрезки — пропорция «{activeOrientation.label.toLowerCase()}» задана заранее{sourceMode === "photo" ? " при подготовке фото" : " в запросе к ИИ"}.
              </p>
            )}

            {generatedImage && (
              <div className="w-full mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={handlePrint}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-all hover:scale-105"
                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                >
                  <Printer size={20} /> Печать ({printGrid.count} шт. на листе A4)
                </button>
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium mt-2 transition-all hover:opacity-70"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                >
                  <Download size={16} /> Скачать изображение
                </button>
                <p className="text-xs mt-1 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  Откроет картинку крупно — на телефоне зажмите на ней палец и выберите «Сохранить изображение», на компьютере — правой кнопкой → «Сохранить как».
                </p>
                <Link
                  to="/profile?tab=labels"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium mt-2 transition-all hover:opacity-70"
                  style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  <Tag size={16} /> Все мои этикетки в личном кабинете →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && generatedImage && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <img
            src={generatedImage}
            alt="Сгенерированная этикетка — крупно"
            className="max-w-full max-h-full rounded-lg"
            style={{ objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          />
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}

      {exampleLightbox && (
        <div
          onClick={() => setExampleLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div className="max-w-lg w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={exampleLightbox.imageUrl}
              alt={exampleLightbox.title ?? "Пример этикетки — крупно"}
              className="max-w-full max-h-[70vh] rounded-lg"
              style={{ objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            />
            <div className="mt-4 w-full rounded-xl p-4" style={{ background: "var(--bg-card)" }}>
              {exampleLightbox.title && (
                <p className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  {exampleLightbox.title}
                </p>
              )}
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--text-muted)" }}>Промпт: </span>{exampleLightbox.prompt}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExampleLightbox(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
