import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft, Plus, Pencil, Trash2, Save, X,
  Wine, BookOpen, MapPin,
} from "lucide-react";

type Tab = "recipes" | "places";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("recipes");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: recipes, isLoading: rLoading } = trpc.recipe.list.useQuery();
  const { data: places, isLoading: pLoading } = trpc.place.list.useQuery();

  // Forms state
  const [rTitle, setRTitle] = useState("");
  const [rSlug, setRSlug] = useState("");
  const [rSubtitle, setRSubtitle] = useState("");
  const [rCategory, setRCategory] = useState("berry");
  const [rAbv, setRAbv] = useState("");
  const [rTime, setRTime] = useState("");
  const [rDifficulty, setRDifficulty] = useState("Легко");
  const [rRating, setRRating] = useState("0");
  const [rImage, setRImage] = useState("");
  const [rDesc, setRDesc] = useState("");

  const [pName, setPName] = useState("");
  const [pSlug, setPSlug] = useState("");
  const [pCity, setPCity] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pHours, setPHours] = useState("");
  const [pImage, setPImage] = useState("");
  const [pDesc, setPDesc] = useState("");

  const deleteRecipe = trpc.recipe.delete.useMutation({
    onSuccess: () => { utils.recipe.list.invalidate(); },
  });
  const upsertRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => { utils.recipe.list.invalidate(); resetRecipeForm(); },
  });
  const deletePlace = trpc.place.delete.useMutation({
    onSuccess: () => { utils.place.list.invalidate(); },
  });
  const upsertPlace = trpc.place.upsert.useMutation({
    onSuccess: () => { utils.place.list.invalidate(); resetPlaceForm(); },
  });

  const resetRecipeForm = () => {
    setShowForm(false); setEditId(null);
    setRTitle(""); setRSlug(""); setRSubtitle(""); setRCategory("berry");
    setRAbv(""); setRTime(""); setRDifficulty("Легко"); setRRating("0");
    setRImage(""); setRDesc("");
  };

  const resetPlaceForm = () => {
    setShowForm(false); setEditId(null);
    setPName(""); setPSlug(""); setPCity(""); setPAddress("");
    setPPhone(""); setPHours(""); setPImage(""); setPDesc("");
  };

  const startEditRecipe = (r: any) => {
    setEditId(r.id);
    setRTitle(r.title || ""); setRSlug(r.slug || ""); setRSubtitle(r.subtitle || "");
    setRCategory(r.category || "berry"); setRAbv(r.abv || ""); setRTime(r.time || "");
    setRDifficulty(r.difficulty || "Легко"); setRRating(String(r.rating || "0"));
    setRImage(r.heroImage || ""); setRDesc(r.tastingDescription || "");
    setTab("recipes"); setShowForm(true);
  };

  const startEditPlace = (p: any) => {
    setEditId(p.id);
    setPName(p.name || ""); setPSlug(p.slug || ""); setPCity(p.city || "");
    setPAddress(p.address || ""); setPPhone(p.phone || ""); setPHours(p.hours || "");
    setPImage(p.image || ""); setPDesc(p.description || "");
    setTab("places"); setShowForm(true);
  };

  const saveRecipe = () => {
    if (!rTitle.trim() || !rSlug.trim()) return;
    upsertRecipe.mutate({
      id: editId ?? undefined,
      slug: rSlug, title: rTitle, subtitle: rSubtitle || undefined,
      category: rCategory, abv: rAbv || undefined, time: rTime || undefined,
      difficulty: rDifficulty, rating: rRating,
      heroImage: rImage || undefined,
      tastingDescription: rDesc || undefined,
    });
  };

  const savePlace = () => {
    if (!pName.trim() || !pSlug.trim()) return;
    upsertPlace.mutate({
      id: editId ?? undefined,
      slug: pSlug, name: pName, city: pCity || undefined,
      address: pAddress || undefined, phone: pPhone || undefined,
      hours: pHours || undefined, image: pImage || undefined,
      description: pDesc || undefined,
    });
  };

  const allRecipes = recipes ?? [];
  const allPlaces = places ?? [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="sticky top-16 z-30" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <ArrowLeft size={18} className="inline mr-1" />На сайт
              </Link>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Админ-панель
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setTab("recipes"); setShowForm(false); }} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all" style={{ background: tab === "recipes" ? "var(--accent)" : "transparent", color: tab === "recipes" ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                <BookOpen size={16} /> Рецепты ({allRecipes.length})
              </button>
              <button onClick={() => { setTab("places"); setShowForm(false); }} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all" style={{ background: tab === "places" ? "var(--accent)" : "transparent", color: tab === "places" ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                <MapPin size={16} /> Бары ({allPlaces.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== RECIPES ===== */}
        {tab === "recipes" && !showForm && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Рецепты</h2>
              <button onClick={() => { resetRecipeForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Plus size={18} /> Добавить рецепт
              </button>
            </div>

            {rLoading ? (
              <div className="text-center py-20 text-sm" style={{ color: "var(--text-muted)" }}>Загрузка...</div>
            ) : (
              <div className="grid gap-3">
                {allRecipes.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <img src={r.heroImage || "/recipe-cherry.jpg"} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{r.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {r.category} · {r.abv} · {r.time} · Рейтинг {r.rating}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEditRecipe(r)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", color: "var(--accent)" }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => { if (confirm("Удалить?")) deleteRecipe.mutate({ id: r.id }); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", color: "#c41e3a" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== PLACES ===== */}
        {tab === "places" && !showForm && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Заведения</h2>
              <button onClick={() => { resetPlaceForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Plus size={18} /> Добавить бар
              </button>
            </div>

            {pLoading ? (
              <div className="text-center py-20 text-sm" style={{ color: "var(--text-muted)" }}>Загрузка...</div>
            ) : (
              <div className="grid gap-3">
                {allPlaces.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <img src={p.image || "/bar-1.jpg"} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{p.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {p.city} · {p.address} · Рейтинг {p.rating}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEditPlace(p)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", color: "var(--accent)" }}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => { if (confirm("Удалить?")) deletePlace.mutate({ id: p.id }); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", color: "#c41e3a" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== RECIPE FORM ===== */}
        {tab === "recipes" && showForm && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {editId ? "Редактировать рецепт" : "Новый рецепт"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-sm" style={{ color: "var(--text-muted)" }}>
                <X size={20} className="inline" /> Отмена
              </button>
            </div>

            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Название *</label>
                  <input type="text" value={rTitle} onChange={(e) => setRTitle(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Slug (URL) *</label>
                  <input type="text" value={rSlug} onChange={(e) => setRSlug(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Подзаголовок</label>
                  <input type="text" value={rSubtitle} onChange={(e) => setRSubtitle(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Категория</label>
                  <select value={rCategory} onChange={(e) => setRCategory(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <option value="berry">Ягодная</option>
                    <option value="citrus">Цитрусовая</option>
                    <option value="herbal">Травяная</option>
                    <option value="coffee">Кофейная</option>
                    <option value="honey">Медовая</option>
                    <option value="spiced">Пряная</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Крепость (ABV)</label>
                  <input type="text" value={rAbv} onChange={(e) => setRAbv(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Время настаивания</label>
                  <input type="text" value={rTime} onChange={(e) => setRTime(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Сложность</label>
                  <select value={rDifficulty} onChange={(e) => setRDifficulty(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <option>Легко</option>
                    <option>Средне</option>
                    <option>Сложно</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Рейтинг</label>
                  <input type="text" value={rRating} onChange={(e) => setRRating(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Изображение (путь)</label>
                  <input type="text" value={rImage} onChange={(e) => setRImage(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Описание вкуса</label>
                <textarea value={rDesc} onChange={(e) => setRDesc(e.target.value)} rows={4} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveRecipe} disabled={upsertRecipe.isPending} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--accent)" }}>
                <Save size={18} /> {editId ? "Сохранить" : "Создать"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-xl px-6 py-3 text-sm font-medium" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* ===== PLACE FORM ===== */}
        {tab === "places" && showForm && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                {editId ? "Редактировать заведение" : "Новое заведение"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-sm" style={{ color: "var(--text-muted)" }}>
                <X size={20} className="inline" /> Отмена
              </button>
            </div>

            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Название *</label>
                  <input type="text" value={pName} onChange={(e) => setPName(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Slug *</label>
                  <input type="text" value={pSlug} onChange={(e) => setPSlug(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Город</label>
                  <input type="text" value={pCity} onChange={(e) => setPCity(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Адрес</label>
                  <input type="text" value={pAddress} onChange={(e) => setPAddress(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Телефон</label>
                  <input type="text" value={pPhone} onChange={(e) => setPPhone(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Часы работы</label>
                  <input type="text" value={pHours} onChange={(e) => setPHours(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Изображение (путь)</label>
                  <input type="text" value={pImage} onChange={(e) => setPImage(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Описание</label>
                <textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={4} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={savePlace} disabled={upsertPlace.isPending} className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--accent)" }}>
                <Save size={18} /> {editId ? "Сохранить" : "Создать"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-xl px-6 py-3 text-sm font-medium" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
