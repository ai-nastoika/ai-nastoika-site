import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X,
  Wine, BookOpen, ChefHat, FlaskConical, MapPin,
} from "lucide-react";

type Tab = "recipes" | "places";
type SubTab = "list" | "form";

const emptyRecipe = {
  slug: "", title: "", subtitle: "", category: "berry",
  categoryLabel: "", heroImage: "", abv: "", time: "",
  difficulty: "Легко", rating: "0", reviews: 0,
  year: "", origin: "", historyTitle: "", historyText: "",
  tastingColor: "", tastingDescription: "", tastingPairing: [] as string[],
  tastingTemp: "", tastingGlass: "",
  sweet: 50, sour: 50, bitter: 50, spicy: 50, fruity: 50, herbal: 50,
  tips: [] as string[], authorName: "", authorDate: "",
};

const emptyPlace = {
  slug: "", name: "", city: "", address: "", metro: "",
  phone: "", website: "", rating: "0", reviews: 0,
  price: "₽₽", hours: "", image: "", tags: [] as string[],
  description: "", infusionsHighlight: "", infusionsSignature: "",
  externalSource: "", externalSummary: "", externalPros: [] as string[],
  externalCons: [] as string[],
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("recipes");
  const [subTab, setSubTab] = useState<SubTab>("list");
  const [editId, setEditId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: recipes, isLoading: rLoading } = trpc.recipe.list.useQuery();
  const { data: places, isLoading: pLoading } = trpc.place.list.useQuery();

  const deleteRecipe = trpc.recipe.delete.useMutation({
    onSuccess: () => { utils.recipe.list.invalidate(); },
  });
  const upsertRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => { utils.recipe.list.invalidate(); setSubTab("list"); },
  });
  const deletePlace = trpc.place.delete.useMutation({
    onSuccess: () => { utils.place.list.invalidate(); },
  });
  const upsertPlace = trpc.place.upsert.useMutation({
    onSuccess: () => { utils.place.list.invalidate(); setSubTab("list"); },
  });

  // Recipe form state
  const [rForm, setRForm] = useState({ ...emptyRecipe });
  const [rIngs, setRIngs] = useState("");
  const [rSteps, setRSteps] = useState("");

  // Place form state
  const [pForm, setPForm] = useState({ ...emptyPlace });

  const startEditRecipe = (r: any) => {
    setEditId(r.id);
    setRForm({
      slug: r.slug ?? "", title: r.title ?? "", subtitle: r.subtitle ?? "",
      category: r.category ?? "berry", categoryLabel: r.categoryLabel ?? "",
      heroImage: r.heroImage ?? "", abv: r.abv ?? "", time: r.time ?? "",
      difficulty: r.difficulty ?? "Легко", rating: String(r.rating ?? "0"),
      reviews: r.reviews ?? 0, year: r.year ?? "", origin: r.origin ?? "",
      historyTitle: r.historyTitle ?? "", historyText: r.historyText ?? "",
      tastingColor: r.tastingColor ?? "", tastingDescription: r.tastingDescription ?? "",
      tastingPairing: r.tastingPairing ? (r.tastingPairing as string[]) : [],
      tastingTemp: r.tastingTemp ?? "", tastingGlass: r.tastingGlass ?? "",
      sweet: r.sweet ?? 50, sour: r.sour ?? 50, bitter: r.bitter ?? 50,
      spicy: r.spicy ?? 50, fruity: r.fruity ?? 50, herbal: r.herbal ?? 50,
      tips: r.tips ? (r.tips as string[]) : [],
      authorName: r.authorName ?? "", authorDate: r.authorDate ?? "",
    });
    const ings = (r.ingredients ?? []).map((i: any) => `${i.name} | ${i.amount} | ${i.note ?? ""}`).join("\n");
    setRIngs(ings);
    const steps = (r.steps ?? []).map((s: any) => `${s.stepNum}. ${s.title}\n${s.text}`).join("\n\n");
    setRSteps(steps);
    setTab("recipes");
    setSubTab("form");
  };

  const startEditPlace = (p: any) => {
    setEditId(p.id);
    setPForm({
      slug: p.slug ?? "", name: p.name ?? "", city: p.city ?? "",
      address: p.address ?? "", metro: p.metro ?? "", phone: p.phone ?? "",
      website: p.website ?? "", rating: String(p.rating ?? "0"),
      reviews: p.reviews ?? 0, price: p.price ?? "₽₽", hours: p.hours ?? "",
      image: p.image ?? "", tags: p.tags ? (p.tags as string[]) : [],
      description: p.description ?? "", infusionsHighlight: p.infusionsHighlight ?? "",
      infusionsSignature: p.infusionsSignature ?? "", externalSource: p.externalSource ?? "",
      externalSummary: p.externalSummary ?? "",
      externalPros: p.externalPros ? (p.externalPros as string[]) : [],
      externalCons: p.externalCons ? (p.externalCons as string[]) : [],
    });
    setTab("places");
    setSubTab("form");
  };

  const saveRecipe = () => {
    const ingredients = rIngs.split("\n").filter(Boolean).map((line) => {
      const [name, amount, note] = line.split("|").map((s) => s.trim());
      return { name: name ?? line, amount: amount ?? "", note: note ?? "" };
    });

    const steps: { stepNum: number; title: string; text: string }[] = [];
    const stepBlocks = rSteps.split("\n\n").filter(Boolean);
    for (const block of stepBlocks) {
      const match = block.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        const stepNum = parseInt(match[1]);
        const title = match[2];
        const text = block.replace(/^\d+\.\s*.+\n?/, "").trim();
        steps.push({ stepNum, title, text });
      }
    }

    upsertRecipe.mutate({
      id: editId ?? undefined,
      ...rForm,
      rating: rForm.rating || "0",
      ingredients,
      steps,
    });
  };

  const savePlace = () => {
    upsertPlace.mutate({
      id: editId ?? undefined,
      ...pForm,
      rating: pForm.rating || "0",
    });
  };

  const resetRecipe = () => {
    setEditId(null);
    setRForm({ ...emptyRecipe });
    setRIngs("");
    setRSteps("");
    setSubTab("form");
  };

  const resetPlace = () => {
    setEditId(null);
    setPForm({ ...emptyPlace });
    setSubTab("form");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="sticky top-16 z-30" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <ArrowLeft size={22} className="inline mr-1" />На сайт
              </Link>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Админ-панель
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setTab("recipes"); setSubTab("list"); }} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all" style={{ background: tab === "recipes" ? "var(--accent)" : "transparent", color: tab === "recipes" ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                <BookOpen size={18} /> Рецепты ({recipes?.length ?? 0})
              </button>
              <button onClick={() => { setTab("places"); setSubTab("list"); }} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all" style={{ background: tab === "places" ? "var(--accent)" : "transparent", color: tab === "places" ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                <MapPin size={18} /> Бары ({places?.length ?? 0})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* === LIST VIEW === */}
        {subTab === "list" && (
          <>
            {tab === "recipes" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Рецепты</h2>
                  <button onClick={resetRecipe} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    <Plus size={22} /> Добавить рецепт
                  </button>
                </div>

                {(rLoading || !recipes) ? (
                  <div className="text-center py-20 text-sm" style={{ color: "var(--text-muted)" }}>Загрузка...</div>
                ) : (
                  <div className="grid gap-3">
                    {recipes.map((r) => (
                      <div key={r.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <img src={r.heroImage ?? "/recipe-cherry.jpg"} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{r.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                            {r.categoryLabel ?? r.category} · {r.abv} · {r.time} · Рейтинг {r.rating}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => startEditRecipe(r)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: "var(--surface)", color: "var(--accent)" }}>
                            <Pencil size={22} />
                          </button>
                          <button onClick={() => { if (confirm("Удалить рецепт?")) deleteRecipe.mutate({ id: r.id }); }} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: "var(--surface)", color: "var(--danger, #c41e3a)" }}>
                            <Trash2 size={22} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "places" && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Заведения</h2>
                  <button onClick={resetPlace} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    <Plus size={22} /> Добавить заведение
                  </button>
                </div>

                {(pLoading || !places) ? (
                  <div className="text-center py-20 text-sm" style={{ color: "var(--text-muted)" }}>Загрузка...</div>
                ) : (
                  <div className="grid gap-3">
                    {places.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <img src={p.image ?? "/bar-1.jpg"} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{p.name}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                            {p.city} · {p.address} · Рейтинг {p.rating}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => startEditPlace(p)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: "var(--surface)", color: "var(--accent)" }}>
                            <Pencil size={22} />
                          </button>
                          <button onClick={() => { if (confirm("Удалить заведение?")) deletePlace.mutate({ id: p.id }); }} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: "var(--surface)", color: "var(--danger, #c41e3a)" }}>
                            <Trash2 size={22} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* === RECIPE FORM === */}
        {subTab === "form" && tab === "recipes" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {editId ? "Редактировать рецепт" : "Новый рецепт"}
              </h2>
              <button onClick={() => setSubTab("list")} className="text-sm" style={{ color: "var(--text-muted)" }}>
                <X size={22} className="inline" /> Отмена
              </button>
            </div>

            {/* Основное */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Wine size={18} /> Основное
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "title", label: "Название", required: true },
                  { key: "slug", label: "Slug (URL)", required: true },
                  { key: "subtitle", label: "Подзаголовок" },
                  { key: "categoryLabel", label: "Категория (отображаемая)" },
                  { key: "heroImage", label: "Путь к изображению" },
                  { key: "abv", label: "Крепость (например: 18%)" },
                  { key: "time", label: "Время настаивания" },
                  { key: "difficulty", label: "Сложность" },
                  { key: "year", label: "Исторический период" },
                  { key: "origin", label: "Происхождение" },
                  { key: "authorName", label: "Автор" },
                  { key: "authorDate", label: "Дата публикации" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      {field.label} {field.required && <span style={{ color: "var(--danger, #c41e3a)" }}>*</span>}
                    </label>
                    <input
                      type="text"
                      value={(rForm as any)[field.key]}
                      onChange={(e) => setRForm({ ...rForm, [field.key]: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Категория</label>
                  <select value={rForm.category} onChange={(e) => setRForm({ ...rForm, category: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                    <option value="berry">Ягодная</option>
                    <option value="citrus">Цитрусовая</option>
                    <option value="herbal">Травяная</option>
                    <option value="coffee">Кофейная</option>
                    <option value="honey">Медовая</option>
                    <option value="spiced">Пряная</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Рейтинг</label>
                  <input type="text" value={rForm.rating} onChange={(e) => setRForm({ ...rForm, rating: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Отзывов</label>
                  <input type="number" value={rForm.reviews} onChange={(e) => setRForm({ ...rForm, reviews: parseInt(e.target.value) || 0 })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
              </div>
            </div>

            {/* Вкусовой профиль */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <FlaskConical size={18} /> Вкусовой профиль
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "tastingColor", label: "Цвет" },
                  { key: "tastingTemp", label: "Температура подачи" },
                  { key: "tastingGlass", label: "Посуда" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
                    <input type="text" value={(rForm as any)[f.key]} onChange={(e) => setRForm({ ...rForm, [f.key]: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Описание вкуса</label>
                  <textarea value={rForm.tastingDescription} onChange={(e) => setRForm({ ...rForm, tastingDescription: e.target.value })} rows={4} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Пэйринг (через запятую)</label>
                  <input type="text" value={rForm.tastingPairing.join(", ")} onChange={(e) => setRForm({ ...rForm, tastingPairing: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>

                {["sweet", "sour", "bitter", "spicy", "fruity", "herbal"].map((k) => (
                  <div key={k}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      {k === "sweet" ? "Сладость" : k === "sour" ? "Кислотность" : k === "bitter" ? "Горечь" : k === "spicy" ? "Пряность" : k === "fruity" ? "Фруктовость" : "Травянистость"} ({(rForm as any)[k]}%)
                    </label>
                    <input type="range" min={0} max={100} value={(rForm as any)[k]} onChange={(e) => setRForm({ ...rForm, [k]: parseInt(e.target.value) })} className="w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* История */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <BookOpen size={18} className="inline mr-2" />История
              </h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Заголовок истории</label>
                  <input type="text" value={rForm.historyTitle} onChange={(e) => setRForm({ ...rForm, historyTitle: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Текст истории</label>
                  <textarea value={rForm.historyText} onChange={(e) => setRForm({ ...rForm, historyText: e.target.value })} rows={5} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
              </div>
            </div>

            {/* Ингредиенты */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>Ингредиенты</h3>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Формат: Название | Количество | Примечание (каждый с новой строки)</p>
              <textarea value={rIngs} onChange={(e) => setRIngs(e.target.value)} rows={8} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none font-mono" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} placeholder="Спелая вишня | 1 кг | лучше тёмных сортов&#10;Водка 40% | 700 мл | можно разбавленный спирт" />
            </div>

            {/* Шаги */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <ChefHat size={18} className="inline mr-2" />Шаги приготовления
              </h3>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Формат: 1. Название шага (пустая строка между шагами)</p>
              <textarea value={rSteps} onChange={(e) => setRSteps(e.target.value)} rows={12} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none font-mono" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} placeholder="1. Подготовка ягод&#10;Описание шага...&#10;&#10;2. Первое настаивание&#10;Описание шага..." />
            </div>

            {/* Советы */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>Советы (через новую строку)</h3>
              <textarea value={rForm.tips.join("\n")} onChange={(e) => setRForm({ ...rForm, tips: e.target.value.split("\n").filter(Boolean) })} rows={5} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button onClick={saveRecipe} disabled={upsertRecipe.isPending} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Save size={22} /> {editId ? "Сохранить изменения" : "Создать рецепт"}
              </button>
              <button onClick={() => setSubTab("list")} className="rounded-xl px-6 py-3 text-sm font-medium transition-all" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* === PLACE FORM === */}
        {subTab === "form" && tab === "places" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {editId ? "Редактировать заведение" : "Новое заведение"}
              </h2>
              <button onClick={() => setSubTab("list")} className="text-sm" style={{ color: "var(--text-muted)" }}>
                <X size={22} className="inline" /> Отмена
              </button>
            </div>

            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Название", req: true },
                  { key: "slug", label: "Slug", req: true },
                  { key: "city", label: "Город" },
                  { key: "address", label: "Адрес" },
                  { key: "metro", label: "Метро" },
                  { key: "phone", label: "Телефон" },
                  { key: "website", label: "Сайт" },
                  { key: "hours", label: "Часы работы" },
                  { key: "image", label: "Путь к изображению" },
                  { key: "price", label: "Ценовая категория" },
                  { key: "rating", label: "Рейтинг" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                      {f.label} {f.req && <span style={{ color: "var(--danger, #c41e3a)" }}>*</span>}
                    </label>
                    <input type="text" value={(pForm as any)[f.key]} onChange={(e) => setPForm({ ...pForm, [f.key]: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Отзывов</label>
                  <input type="number" value={pForm.reviews} onChange={(e) => setPForm({ ...pForm, reviews: parseInt(e.target.value) || 0 })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Теги (через запятую)</label>
                  <input type="text" value={pForm.tags.join(", ")} onChange={(e) => setPForm({ ...pForm, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Описание</label>
                  <textarea value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} rows={5} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Highlight настоек</label>
                  <input type="text" value={pForm.infusionsHighlight} onChange={(e) => setPForm({ ...pForm, infusionsHighlight: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Фирменная настойка</label>
                  <input type="text" value={pForm.infusionsSignature} onChange={(e) => setPForm({ ...pForm, infusionsSignature: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={savePlace} disabled={upsertPlace.isPending} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Save size={22} /> {editId ? "Сохранить" : "Создать"}
              </button>
              <button onClick={() => setSubTab("list")} className="rounded-xl px-6 py-3 text-sm font-medium transition-all" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
