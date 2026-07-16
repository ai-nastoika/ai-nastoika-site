import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Droplet,
  RotateCw,
  Filter,
  Moon,
  Wine,
  Circle,
  Camera,
  Check,
  Clock,
  Trash2,
  Archive,
  Sparkles,
  Send,
  Loader2,
  MessageCircleQuestion,
  X,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";

/* ── Типы этапов: иконка + подпись, используются и в таймлайне, и в форме создания ── */
const STAGE_TYPES = [
  { value: "pour", label: "Поставить", icon: Droplet },
  { value: "shake", label: "Взболтать", icon: RotateCw },
  { value: "strain", label: "Слить/процедить", icon: Filter },
  { value: "rest", label: "Дать отстояться", icon: Moon },
  { value: "add_ingredient", label: "Добавить ингредиент", icon: Plus },
  { value: "taste", label: "Дегустация", icon: Wine },
  { value: "custom", label: "Своё действие", icon: Circle },
] as const;

function stageIcon(type: string) {
  return STAGE_TYPES.find((s) => s.value === type)?.icon ?? Circle;
}

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function toInputDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function StatCard({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <Icon size={18} style={{ color: "var(--accent)" }} className="mx-auto mb-1" />
      <div className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
        {label}
      </div>
    </div>
  );
}

/* ── Загрузка фото (обложка трекера) — тот же паттерн, что upload-image в AdminPage.tsx ── */
async function uploadTrackerImage(file: File): Promise<string | null> {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) { alert("Допустимые форматы: JPG, PNG, WebP"); return null; }
  if (file.size > 5 * 1024 * 1024) { alert("Максимальный размер — 5 МБ"); return null; }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload-tracker-image", { method: "POST", body: fd });
  const data = await res.json();
  if (data.success && data.path) return data.path as string;
  alert("Ошибка загрузки: " + (data.error || "неизвестная ошибка"));
  return null;
}

/* ─────────────────────────── Форма создания новой настойки ─────────────────────────── */

type DraftStage = { type: string; title: string; plannedDate: string; repeatIntervalDays?: number };

function CreateInfusionForm({ onDone }: { onDone: () => void }) {
  const utils = trpc.useUtils();
  const { data: recipes } = trpc.recipe.list.useQuery();
  const { data: savedRecipeIds } = trpc.favorites.myIds.useQuery({ itemType: "recipe" });

  const [name, setName] = useState("");
  const [recipeId, setRecipeId] = useState<number | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [vessel, setVessel] = useState("");
  const [startDate, setStartDate] = useState(toInputDate(new Date()));
  const [stages, setStages] = useState<DraftStage[]>([{ type: "pour", title: "Поставить", plannedDate: toInputDate(new Date()) }]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState("");

  const create = trpc.infusion.create.useMutation({
    onSuccess: () => {
      utils.infusion.list.invalidate();
      utils.infusion.stats.invalidate();
      onDone();
    },
    onError: (err) => setError(err.message || "Не удалось создать трекер"),
  });

  const savedIdSet = new Set(savedRecipeIds ?? []);
  const matchingRecipes = (recipes ?? []).filter((r) =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );
  const savedMatches = matchingRecipes.filter((r) => savedIdSet.has(r.id));
  const otherMatches = matchingRecipes.filter((r) => !savedIdSet.has(r.id));

  function pickRecipe(r: NonNullable<typeof recipes>[number]) {
    setRecipeId(r.id);
    setRecipeSearch(r.title);
    setRecipeDropdownOpen(false);
    if (!name.trim()) setName(r.title);
    // Автозаполнение описания из ингредиентов рецепта
    const ingSummary = (r.ingredients ?? [])
      .map((i) => [i.name, i.amount].filter(Boolean).join(" "))
      .join(", ");
    if (ingSummary) setDescription(ingSummary);
    // Этапы подберутся автоматически на сервере по рецепту — очищаем ручной список
    setStages([]);
  }

  function clearRecipe() {
    setRecipeId(null);
    setRecipeSearch("");
    setStages([{ type: "pour", title: "Поставить", plannedDate: toInputDate(new Date()) }]);
  }

  function addStageRow() {
    setStages((s) => [...s, { type: "shake", title: "Взболтать", plannedDate: toInputDate(new Date()) }]);
  }
  function updateStage(i: number, patch: Partial<DraftStage>) {
    setStages((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  }
  function removeStage(i: number) {
    setStages((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const path = await uploadTrackerImage(file);
    if (path) setCoverImage(path);
    setCoverUploading(false);
    e.target.value = "";
  }

  function submit() {
    setError("");
    if (!name.trim()) { setError("Укажите название настойки"); return; }
    if (!recipeId && stages.length === 0) { setError("Добавьте хотя бы один этап"); return; }
    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      recipeId: recipeId ?? undefined,
      vesselDescription: vessel.trim() || undefined,
      coverImage: coverImage ?? undefined,
      startDate,
      // Если выбран рецепт и этапы не тронуты вручную — сервер сам подберёт их по рецепту
      stages: recipeId && stages.length === 0 ? undefined : stages.map((s) => ({
        type: s.type as any,
        title: s.title.trim() || STAGE_TYPES.find((t) => t.value === s.type)?.label || "Действие",
        plannedDate: s.plannedDate,
        repeatIntervalDays: s.repeatIntervalDays,
      })),
    });
  }

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body)",
  };

  return (
    <div className="rounded-2xl p-5 sm:p-6 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Новая настойка
        </h3>
        <button onClick={onDone} className="p-1 rounded-lg hover:opacity-60" style={{ color: "var(--text-muted)" }}>
          <X size={20} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Название*</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Вишнёвка на коньяке"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
        <div className="relative">
          <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Рецепт из базы (необязательно)</label>
          <div className="relative">
            <input
              value={recipeSearch}
              onChange={(e) => { setRecipeSearch(e.target.value); setRecipeDropdownOpen(true); if (recipeId) setRecipeId(null); }}
              onFocus={() => setRecipeDropdownOpen(true)}
              onBlur={() => setTimeout(() => setRecipeDropdownOpen(false), 150)}
              placeholder="Поиск по названию — свой или из базы"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            {recipeId && (
              <button type="button" onClick={clearRecipe}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
                style={{ color: "var(--text-muted)" }}>
                <X size={14} />
              </button>
            )}
          </div>
          {recipeDropdownOpen && recipeSearch.trim() && (savedMatches.length > 0 || otherMatches.length > 0) && (
            <div className="absolute z-20 mt-1 w-full rounded-lg overflow-hidden max-h-64 overflow-y-auto"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
              {savedMatches.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Сохранённые</div>
                  {savedMatches.map((r) => (
                    <button key={r.id} type="button" onMouseDown={() => pickRecipe(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                      style={{ color: "var(--text-primary)", background: "var(--surface)" }}>
                      {r.title}
                    </button>
                  ))}
                </>
              )}
              {otherMatches.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>Все рецепты</div>
                  {otherMatches.slice(0, 20).map((r) => (
                    <button key={r.id} type="button" onMouseDown={() => pickRecipe(r)}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
                      style={{ color: "var(--text-primary)" }}>
                      {r.title}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Описание / рецепт</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Вишня без косточек 500 г, коньяк 40% — 1 л, сахар 150 г..."
          className="w-full rounded-lg px-3 py-2 text-sm outline-none min-h-[60px]" style={inputStyle} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Тара / где стоит <span style={{ color: "var(--text-muted)" }}>(необязательно)</span></label>
          <input value={vessel} onChange={(e) => setVessel(e.target.value)} placeholder="Банка 3 л, кладовая"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Дата старта</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{ color: "var(--text-secondary)" }}>Фото тары <span style={{ color: "var(--text-muted)" }}>(необязательно — чтобы сразу узнавать банку на полке)</span></label>
        <div className="flex items-center gap-3">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: "1px solid var(--border)" }} />
          ) : (
            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
              <Camera size={20} style={{ color: "var(--text-muted)" }} />
            </div>
          )}
          <label className="text-sm px-3 py-2 rounded-lg cursor-pointer" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            {coverUploading ? "Загрузка..." : coverImage ? "Заменить фото" : "Загрузить фото"}
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={coverUploading} />
          </label>
        </div>
      </div>

      {recipeId ? (
        <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
          Этапы будут подобраны автоматически по рецепту — их можно будет скорректировать после создания.
        </div>
      ) : (
        <>
          <label className="text-xs mb-2 block" style={{ color: "var(--text-secondary)" }}>Этапы</label>
          <div className="space-y-2 mb-3">
            {stages.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg p-2" style={{ background: "var(--surface)" }}>
                <select value={s.type} onChange={(e) => {
                    const t = STAGE_TYPES.find((x) => x.value === e.target.value);
                    updateStage(i, { type: e.target.value, title: t?.label ?? s.title });
                  }}
                  className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ ...inputStyle, background: "var(--bg-card)" }}>
                  {STAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input value={s.title} onChange={(e) => updateStage(i, { title: e.target.value })}
                  placeholder="Описание действия" className="flex-1 min-w-[140px] rounded-md px-2 py-1.5 text-sm outline-none"
                  style={{ ...inputStyle, background: "var(--bg-card)" }} />
                <input type="date" value={s.plannedDate} onChange={(e) => updateStage(i, { plannedDate: e.target.value })}
                  className="rounded-md px-2 py-1.5 text-sm outline-none" style={{ ...inputStyle, background: "var(--bg-card)" }} />
                <input type="number" min={1} max={90} placeholder="повтор, дн." value={s.repeatIntervalDays ?? ""}
                  onChange={(e) => updateStage(i, { repeatIntervalDays: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-24 rounded-md px-2 py-1.5 text-sm outline-none" style={{ ...inputStyle, background: "var(--bg-card)" }} />
                <button onClick={() => removeStage(i)} className="p-1.5 rounded-md hover:opacity-60" style={{ color: "var(--text-muted)" }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addStageRow} className="text-sm flex items-center gap-1.5 mb-4" style={{ color: "var(--accent)" }}>
            <Plus size={16} /> Добавить этап
          </button>
        </>
      )}

      {error && <p className="text-sm mb-3" style={{ color: "#dc2626" }}>{error}</p>}

      <button onClick={submit} disabled={create.isPending}
        className="rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: "var(--accent)" }}>
        {create.isPending ? "Создаю..." : "Создать трекер"}
      </button>
    </div>
  );
}

/* ─────────────────────────── ИИ-консультант по трекеру ─────────────────────────── */

type ChatMessage = { role: "user" | "assistant"; content: string };

function InfusionAiConsult({ infusionId }: { infusionId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  const { data: limitInfo, refetch: refetchLimit } = trpc.infusionConsult.checkLimit.useQuery();

  const ask = trpc.infusionConsult.ask.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      refetchLimit();
    },
    onError: (err) => setError(err.message || "Не удалось получить ответ"),
  });

  function handleAsk() {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    ask.mutate({ infusionId, question: q, history: messages.slice(-10) });
  }

  const limitReached = limitInfo && limitInfo.remaining <= 0;

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Sparkles size={20} style={{ color: "var(--accent)" }} />
          Спросить консультанта
        </h3>
        {limitInfo && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Осталось сегодня: {limitInfo.remaining} из {limitInfo.limit}
          </span>
        )}
      </div>

      {messages.length === 0 && (
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Отвечает с учётом данных именно этой настойки — на каком дне, что уже сделано, что в заметках.
        </p>
      )}

      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className="rounded-xl p-3 text-sm" style={
              m.role === "user"
                ? { background: "var(--surface)", color: "var(--text-primary)", marginLeft: "15%" }
                : { background: "var(--bg-secondary)", color: "var(--text-primary)", marginRight: "15%", lineHeight: 1.6 }
            }>
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 mb-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
                  <MessageCircleQuestion size={14} /> Ответ ИИ
                </div>
              )}
              {m.content}
            </div>
          ))}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={16} className="animate-spin" /> Думаю над ответом...
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm mb-3" style={{ color: "#dc2626" }}>{error}</p>}

      {limitReached ? (
        <p className="text-sm text-center py-2" style={{ color: "var(--text-muted)" }}>
          Лимит консультаций на сегодня исчерпан — заходите завтра.
        </p>
      ) : (
        <div className="flex gap-2">
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Например: забыл взболтать 3 дня, это страшно?"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            disabled={ask.isPending} />
          <button onClick={handleAsk} disabled={!question.trim() || ask.isPending}
            className="rounded-xl px-4 flex items-center justify-center text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}>
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Основной компонент ─────────────────────────── */

export default function InfusionTracker() {
  const { isLoggedIn } = useAuth();
  const utils = trpc.useUtils();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [completingStageId, setCompletingStageId] = useState<number | null>(null);
  const [completeNote, setCompleteNote] = useState("");
  const [completePhoto, setCompletePhoto] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editRepeat, setEditRepeat] = useState("");
  const [addingStage, setAddingStage] = useState(false);
  const [newStageType, setNewStageType] = useState("custom");
  const [newStageTitle, setNewStageTitle] = useState("");
  const [newStageDate, setNewStageDate] = useState(toInputDate(new Date()));
  const [newStageRepeat, setNewStageRepeat] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: stats } = trpc.infusion.stats.useQuery(undefined, { enabled: isLoggedIn });
  const { data: list } = trpc.infusion.list.useQuery(undefined, { enabled: isLoggedIn });
  const { data: detail } = trpc.infusion.get.useQuery({ id: selectedId! }, { enabled: !!selectedId });

  const completeStage = trpc.infusion.completeStage.useMutation({
    onSuccess: () => {
      utils.infusion.get.invalidate({ id: selectedId! });
      utils.infusion.list.invalidate();
      utils.infusion.stats.invalidate();
      setCompletingStageId(null);
      setCompleteNote("");
      setCompletePhoto(null);
    },
  });
  const updateStage = trpc.infusion.updateStage.useMutation({
    onSuccess: () => {
      utils.infusion.get.invalidate({ id: selectedId! });
      utils.infusion.list.invalidate();
      setEditingStageId(null);
    },
  });
  const addStage = trpc.infusion.addStage.useMutation({
    onSuccess: () => {
      utils.infusion.get.invalidate({ id: selectedId! });
      setAddingStage(false);
      setNewStageTitle("");
      setNewStageRepeat("");
    },
  });
  const deleteStage = trpc.infusion.deleteStage.useMutation({
    onSuccess: () => { utils.infusion.get.invalidate({ id: selectedId! }); },
  });
  const updateNotes = trpc.infusion.updateNotes.useMutation();
  const setCoverPhoto = trpc.infusion.setCoverPhoto.useMutation({
    onSuccess: () => { utils.infusion.get.invalidate({ id: selectedId! }); utils.infusion.list.invalidate(); },
  });
  const setArchived = trpc.infusion.setArchived.useMutation({
    onSuccess: () => { utils.infusion.list.invalidate(); utils.infusion.stats.invalidate(); utils.infusion.get.invalidate({ id: selectedId! }); },
  });
  const deleteInfusion = trpc.infusion.delete.useMutation({
    onSuccess: () => { setSelectedId(null); utils.infusion.list.invalidate(); utils.infusion.stats.invalidate(); },
  });

  if (!isLoggedIn) return null; // раздел живёт внутри личного кабинета — доступ уже проверен выше по дереву

  const active = (list ?? []).filter((i) => i.status === "active");

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploading(true);
    const path = await uploadTrackerImage(file);
    if (path) setCoverPhoto.mutate({ id: selectedId, coverImage: path });
    setUploading(false);
    e.target.value = "";
  }

  async function handleStagePhotoAndComplete(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadTrackerImage(file);
    setUploading(false);
    if (path) setCompletePhoto(path);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Трекер созревания
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Напомним, когда взболтать, слить или процедить</p>
        </div>
        <button onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}>
          <Plus size={16} /> Новая настойка
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon={Droplet} value={String(stats.active)} label="Активных" />
          <StatCard icon={Clock} value={String(stats.dueToday)} label="Действие сегодня" />
          <StatCard icon={CheckCircle2} value={String(stats.completed)} label="Завершено" />
          <StatCard icon={CalendarClock} value={String(stats.avgDays)} label="Дней в среднем" />
        </div>
      )}

      {creating && <CreateInfusionForm onDone={() => setCreating(false)} />}

      {/* СПИСОК */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((inf) => (
          <div key={inf.id} onClick={() => setSelectedId(inf.id)}
            className="rounded-2xl overflow-hidden cursor-pointer transition-all"
            style={{
              background: "var(--bg-card)",
              border: selectedId === inf.id ? "2px solid var(--accent)" : "1px solid var(--border)",
            }}>
            <div className="h-28" style={{
              background: inf.coverImage ? `url(${inf.coverImage}) center/cover` : "var(--surface)",
            }} />
            <div className="p-4">
              <div className="font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {inf.name}
              </div>
              <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div className="h-full rounded-full" style={{ width: `${inf.progressPct}%`, background: "var(--accent)" }} />
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{inf.recipeTag}</span>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  {inf.nextStage ? `${formatDate(inf.nextStage.plannedDate)} — ${STAGE_TYPES.find(t => t.value === inf.nextStage!.type)?.label}` : "нет активных этапов"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {active.length === 0 && !creating && (
          <div className="col-span-full text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
            Пока нет активных настоек — начните с кнопки «Новая настойка».
          </div>
        )}
      </div>

      {/* ДЕТАЛИ */}
      {detail && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="relative w-full sm:w-40 h-40 rounded-xl overflow-hidden flex-shrink-0" style={{
              background: detail.coverImage ? `url(${detail.coverImage}) center/cover` : "var(--surface)",
            }}>
              <label className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(255,255,255,.9)", border: "1px solid var(--border)" }}>
                <Camera size={15} style={{ color: "var(--accent)" }} />
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold inline-block px-2.5 py-1 rounded-full mb-2"
                style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}>
                {detail.recipeTag}
              </div>
              <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {detail.name}
              </h3>
              {detail.description && (
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{detail.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>Поставлена: <b style={{ color: "var(--text-primary)" }}>{formatDate(detail.startDate)}</b></span>
                {detail.vesselDescription && <span>Где стоит: <b style={{ color: "var(--text-primary)" }}>{detail.vesselDescription}</b></span>}
                <span>День <b style={{ color: "var(--text-primary)" }}>{detail.dayNow}</b> из {detail.dayTotal}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
              <div className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                {detail.progressPct}%
              </div>
              <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Созревание</div>
            </div>
          </div>

          {/* ЭТАПЫ */}
          <div className="p-5 sm:p-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>Этапы</h4>
            <div className="space-y-3">
              {detail.stages.map((s) => {
                const Icon = stageIcon(s.type);
                const isCurrent = s.state === "current";
                const isDone = s.state === "done";
                return (
                  <div key={s.id} className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{
                      background: isDone ? "rgba(79,122,82,.12)" : isCurrent ? "var(--bg-secondary)" : "var(--surface)",
                      color: isDone ? "#4f7a52" : isCurrent ? "var(--accent)" : "var(--text-muted)",
                    }}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-xs font-semibold uppercase" style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)" }}>
                            {formatDate(s.plannedDate)}
                          </div>
                          <div className="text-sm font-medium" style={{ color: isDone ? "var(--text-secondary)" : "var(--text-primary)" }}>
                            {s.title}
                          </div>
                          {s.note && <div className="text-xs italic mt-1" style={{ color: "var(--text-muted)" }}>«{s.note}»</div>}
                          {s.repeatIntervalDays && (
                            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                              повторяется каждые {s.repeatIntervalDays} дн.
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {isCurrent && completingStageId !== s.id && editingStageId !== s.id && (
                            <button onClick={() => setCompletingStageId(s.id)}
                              className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ background: "var(--accent)" }}>
                              Готово
                            </button>
                          )}
                          {!isDone && completingStageId !== s.id && editingStageId !== s.id && (
                            <button onClick={() => {
                                setEditingStageId(s.id);
                                setEditDate(toInputDate(s.plannedDate));
                                setEditRepeat(s.repeatIntervalDays ? String(s.repeatIntervalDays) : "");
                              }}
                              className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                              Изменить
                            </button>
                          )}
                          {!isDone && editingStageId !== s.id && (
                            <button onClick={() => deleteStage.mutate({ stageId: s.id })}
                              className="text-xs p-1.5 rounded-md hover:opacity-60" style={{ color: "var(--text-muted)" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* инлайн-форма "Готово" */}
                      {completingStageId === s.id && (
                        <div className="mt-2 p-3 rounded-lg space-y-2" style={{ background: "var(--surface)" }}>
                          <textarea value={completeNote} onChange={(e) => setCompleteNote(e.target.value)}
                            placeholder="Заметка (необязательно) — как всё выглядит?"
                            className="w-full rounded-md px-2 py-1.5 text-sm outline-none"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1.5"
                              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                              <Camera size={13} /> {completePhoto ? "Фото приложено" : "Приложить фото"}
                              <input type="file" accept="image/*" className="hidden" onChange={handleStagePhotoAndComplete} disabled={uploading} />
                            </label>
                            <button onClick={() => { setCompletingStageId(null); setCompleteNote(""); setCompletePhoto(null); }}
                              className="text-xs px-3 py-1.5 rounded-full" style={{ color: "var(--text-muted)" }}>
                              Отмена
                            </button>
                            <button
                              onClick={() => completeStage.mutate({ stageId: s.id, note: completeNote || undefined, photoUrl: completePhoto || undefined })}
                              disabled={completeStage.isPending}
                              className="text-xs px-3 py-1.5 rounded-full text-white font-medium ml-auto disabled:opacity-50"
                              style={{ background: "var(--accent)" }}>
                              <Check size={13} className="inline mr-1" /> Подтвердить
                            </button>
                          </div>
                        </div>
                      )}

                      {/* инлайн-форма "Изменить" — дата и периодичность */}
                      {editingStageId === s.id && (
                        <div className="mt-2 p-3 rounded-lg flex items-center gap-2 flex-wrap" style={{ background: "var(--surface)" }}>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Дата</label>
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                              className="rounded-md px-2 py-1.5 text-sm outline-none"
                              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Повтор, дн.</label>
                            <input type="number" min={1} max={90} value={editRepeat} placeholder="нет"
                              onChange={(e) => setEditRepeat(e.target.value)}
                              className="w-24 rounded-md px-2 py-1.5 text-sm outline-none"
                              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                          </div>
                          <button onClick={() => setEditingStageId(null)} className="text-xs px-3 py-1.5 self-end" style={{ color: "var(--text-muted)" }}>
                            Отмена
                          </button>
                          <button
                            onClick={() => updateStage.mutate({
                              stageId: s.id,
                              plannedDate: editDate,
                              repeatIntervalDays: editRepeat ? Number(editRepeat) : null,
                            })}
                            disabled={updateStage.isPending}
                            className="text-xs px-3 py-1.5 rounded-full text-white font-medium self-end" style={{ background: "var(--accent)" }}>
                            Сохранить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Добавить свой этап поверх плана рецепта */}
            {addingStage ? (
              <div className="mt-3 p-3 rounded-lg flex flex-wrap items-end gap-2" style={{ background: "var(--surface)" }}>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Тип</label>
                  <select value={newStageType} onChange={(e) => {
                      const t = STAGE_TYPES.find((x) => x.value === e.target.value);
                      setNewStageType(e.target.value);
                      if (!newStageTitle) setNewStageTitle(t?.label ?? "");
                    }}
                    className="rounded-md px-2 py-1.5 text-sm outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    {STAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Название</label>
                  <input value={newStageTitle} onChange={(e) => setNewStageTitle(e.target.value)}
                    className="w-full rounded-md px-2 py-1.5 text-sm outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Дата</label>
                  <input type="date" value={newStageDate} onChange={(e) => setNewStageDate(e.target.value)}
                    className="rounded-md px-2 py-1.5 text-sm outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Повтор, дн.</label>
                  <input type="number" min={1} max={90} value={newStageRepeat} placeholder="нет"
                    onChange={(e) => setNewStageRepeat(e.target.value)}
                    className="w-20 rounded-md px-2 py-1.5 text-sm outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <button onClick={() => setAddingStage(false)} className="text-xs px-3 py-1.5" style={{ color: "var(--text-muted)" }}>
                  Отмена
                </button>
                <button
                  onClick={() => addStage.mutate({
                    infusionId: detail.id,
                    type: newStageType as any,
                    title: newStageTitle.trim() || (STAGE_TYPES.find(t => t.value === newStageType)?.label ?? "Этап"),
                    plannedDate: newStageDate,
                    repeatIntervalDays: newStageRepeat ? Number(newStageRepeat) : undefined,
                  })}
                  disabled={addStage.isPending}
                  className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ background: "var(--accent)" }}>
                  Добавить
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingStage(true)}
                className="mt-3 text-sm flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                <Plus size={16} /> Добавить свой этап
              </button>
            )}
          </div>

          {/* ЗАМЕТКИ */}
          <div className="p-5 sm:p-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Заметки</h4>
            <textarea
              defaultValue={detail.notes ?? ""}
              onBlur={(e) => updateNotes.mutate({ id: detail.id, notes: e.target.value })}
              placeholder="Например: в этот раз положил на 50г сахара меньше..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none min-h-[60px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="p-4 flex items-center gap-2">
            <button onClick={() => setArchived.mutate({ id: detail.id, archived: true })}
              className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              <Archive size={13} /> В архив
            </button>
            <button onClick={() => { if (confirm("Удалить трекер целиком? Это необратимо.")) deleteInfusion.mutate({ id: detail.id }); }}
              className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ color: "#dc2626" }}>
              <Trash2 size={13} /> Удалить
            </button>
          </div>
        </div>
      )}

      {detail && <InfusionAiConsult infusionId={detail.id} />}
    </div>
  );
}
