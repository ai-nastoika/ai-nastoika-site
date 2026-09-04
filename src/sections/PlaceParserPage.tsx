import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Sparkles, Loader2,
  Save, Bot, MapPin,
  Upload, Shield,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface PlaceForm {
  slug: string; name: string; city: string; address: string; metro: string;
  phone: string; website: string; yandexUrl: string;
  lat: string; lng: string;
  hours: string; price: string; image: string;
  infusionsHighlight: string; infusionsSignature: string;
  description: string;
  externalSummary: string; externalPros: string[]; externalCons: string[];
  tags: string[];
}

function emptyForm(): PlaceForm {
  return {
    slug: "", name: "", city: "", address: "", metro: "", phone: "", website: "", yandexUrl: "",
    lat: "", lng: "",
    hours: "", price: "", image: "",
    infusionsHighlight: "", infusionsSignature: "",
    description: "",
    externalSummary: "", externalPros: [], externalCons: [],
    tags: [],
  };
}

function slugify(input: string): string {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"shch",ы:"y",э:"e",ю:"yu",я:"ya",
    " ":"-","_":"-","/":"-","\\":"-",
  };
  return input.toLowerCase().split("").map((c) => map[c] || c).join("").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/* ═══════════════════════════════════════════
   Page
   ═══════════════════════════════════════════ */
export default function PlaceParserPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading, isEditor } = useAuth();
  const [tab, setTab] = useState("source");
  const [placeText, setPlaceText] = useState("");
  const [form, setForm] = useState<PlaceForm>(emptyForm);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [resolvingCoords, setResolvingCoords] = useState(false);
  const [coordsError, setCoordsError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const resolveCoords = trpc.place.resolveCoords.useMutation();

  async function handleResolveCoords(url: string) {
    if (!url.trim()) return;
    setResolvingCoords(true);
    setCoordsError("");
    try {
      const { lat, lng } = await resolveCoords.mutateAsync({ url });
      patch({ lat: String(lat), lng: String(lng) });
    } catch (err) {
      setCoordsError(err instanceof Error ? err.message : "Не удалось определить координаты");
    } finally {
      setResolvingCoords(false);
    }
  }

  const upsertPlace = trpc.place.upsert.useMutation({
    onSuccess: () => {
      utils.place.list.invalidate();
      setSaving(false);
      navigate("/barmap");
    },
    onError: (err) => {
      setSaving(false);
      alert("Ошибка сохранения: " + err.message);
    },
  });

  /* ── Шаг 1 → карточка одним запросом (Timeweb AI Gateway, Qwen) ── */
  const generatePlace = trpc.placeParser.generate.useMutation({
    onSuccess: (data) => {
      applyParsedData(data);
      setGenerating(false);
      setTab("edit");
      if (data.yandexUrl) {
        handleResolveCoords(data.yandexUrl);
      }
    },
    onError: (err) => {
      setGenerating(false);
      alert("Ошибка генерации: " + err.message);
    },
  });
  const handleGenerate = () => {
    if (!placeText.trim()) return;
    setGenerating(true);
    generatePlace.mutate({ rawText: placeText });
  };

  /* ── Upload image ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Допустимые форматы: JPG, PNG, WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Максимальный размер — 5 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("auth-token") || "";
      const res = await fetch("/api/upload-place-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.path) {
        patch({ image: data.path });
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
    patch({ image: "" });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Заполняет форму из ответа ИИ (yandexUrl уже извлечён на бэкенде
     регуляркой из исходного текста, а не получен от модели — см. api/placeParser.ts) ── */
  function applyParsedData(data: Record<string, any>) {
    const newForm: PlaceForm = {
      slug: data.slug ? slugify(data.slug) : slugify(`${data.name || ""} ${data.city || ""}`),
      name: data.name || "",
      city: data.city || "",
      address: data.address || "",
      metro: data.metro || "",
      phone: data.phone || "",
      website: data.website || "",
      yandexUrl: data.yandexUrl || "",
      lat: data.lat !== null && data.lat !== undefined ? String(data.lat) : "",
      lng: data.lng !== null && data.lng !== undefined ? String(data.lng) : "",
      hours: data.hours || "",
      price: data.price || "",
      image: "",
      infusionsHighlight: data.infusionsHighlight || "",
      infusionsSignature: data.infusionsSignature || "",
      description: data.description || "",
      externalSummary: data.externalSummary || "",
      externalPros: Array.isArray(data.externalPros) ? data.externalPros : [],
      externalCons: Array.isArray(data.externalCons) ? data.externalCons : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
    setForm(newForm);
  }

  /* ── Save (с проверкой на дубликаты) ── */
  const [duplicateMatches, setDuplicateMatches] = useState<
    { id: number; slug: string; name: string; city: string | null; address: string | null; image: string | null; score: number }[] | null
  >(null);

  const buildPayload = (overwriteId?: number) => {
    const latNum = form.lat.trim() ? Number(form.lat.replace(",", ".")) : undefined;
    const lngNum = form.lng.trim() ? Number(form.lng.replace(",", ".")) : undefined;
    return {
      id: overwriteId,
      slug: form.slug, name: form.name,
      city: form.city || undefined, address: form.address || undefined, metro: form.metro || undefined,
      phone: form.phone || undefined, website: form.website || undefined,
      yandexUrl: form.yandexUrl || undefined,
      lat: Number.isFinite(latNum) ? latNum : undefined,
      lng: Number.isFinite(lngNum) ? lngNum : undefined,
      hours: form.hours || undefined, price: form.price || undefined, image: form.image || undefined,
      infusionsHighlight: form.infusionsHighlight || undefined,
      infusionsSignature: form.infusionsSignature || undefined,
      description: form.description || undefined,
      externalSummary: form.externalSummary || undefined,
      externalPros: form.externalPros.length > 0 ? form.externalPros : undefined,
      externalCons: form.externalCons.length > 0 ? form.externalCons : undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
    };
  };

  const handleSave = async (opts?: { overwriteId?: number; skipCheck?: boolean }) => {
    if (!form.slug || !form.name) { alert("Slug и название обязательны!"); return; }
    const latNum = form.lat.trim() ? Number(form.lat.replace(",", ".")) : undefined;
    const lngNum = form.lng.trim() ? Number(form.lng.replace(",", ".")) : undefined;
    if (form.lat.trim() && Number.isNaN(latNum)) { alert("Широта указана некорректно"); return; }
    if (form.lng.trim() && Number.isNaN(lngNum)) { alert("Долгота указана некорректно"); return; }

    if (!opts?.skipCheck && !opts?.overwriteId) {
      const dupes = await utils.place.checkDuplicates.fetch({
        name: form.name,
        address: form.address || undefined,
        lat: Number.isFinite(latNum) ? latNum : undefined,
        lng: Number.isFinite(lngNum) ? lngNum : undefined,
      });
      if (dupes.length > 0) {
        setDuplicateMatches(dupes);
        return;
      }
    }

    setDuplicateMatches(null);
    setSaving(true);
    upsertPlace.mutate(buildPayload(opts?.overwriteId));
  };

  const patch = (p: Partial<PlaceForm>) => setForm((f) => ({ ...f, ...p }));

  /* Защита: та же логика, что в RecipeParserPage.tsx — бэкенд (editorQuery)
     уже отклоняет не-editor'ам, здесь просто не даём зря дойти до формы. */
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </main>
    );
  }
  if (!isLoggedIn || !isEditor) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center max-w-md">
          <Shield size={48} className="mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Доступ ограничен
          </h1>
          <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
            {isLoggedIn
              ? "Эта страница доступна только редакторам и администраторам проекта."
              : "Войдите в аккаунт редактора или администратора для доступа к этой странице."}
          </p>
          {!isLoggedIn && (
            <a
              href="/login"
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

  return (
    <main className="min-h-screen px-4 py-8 md:px-8" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-5xl">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
          <ArrowLeft size={18} /> Назад
        </button>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--accent)" }}>
          <Bot size={28} className="inline mr-2" />
          AI-парсер заведений
        </h1>
        <p className="mt-1 mb-8" style={{ color: "var(--text-secondary)" }}>
          Разбирает данные о заведении и анализирует отзывы на упоминания настоек — через Timeweb AI Gateway (Qwen)
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="source">1. Источник</TabsTrigger>
            <TabsTrigger value="edit" disabled={!form.name}>2. Редактировать</TabsTrigger>
          </TabsList>

          {/* ═════ STEP 1: Source text → auto-generated card ═════ */}
          <TabsContent value="source">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin size={20} />
                  Шаг 1: Вставьте данные о заведении
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl p-4 flex gap-3" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
                  <MapPin size={20} style={{ color: "#92400e", flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: "#78350f" }}>
                    <strong>Обязательно включите ссылку на Яндекс.Карты</strong> — откройте карточку заведения на
                    Яндекс.Картах, нажмите «Поделиться» и вставьте ссылку прямо в текст ниже. Она достаётся из
                    текста напрямую кодом, ИИ её не трогает и не может найти сама — без неё точные координаты
                    не определить, придётся сходить на карту вручную уже после разбора.
                  </p>
                </div>
                <Textarea
                  value={placeText}
                  onChange={(e) => setPlaceText(e.target.value)}
                  placeholder={`Вставьте сюда всё, что нашли о заведении: название, адрес, метро, ссылку на сайт или Яндекс.Карты, отзывы, особенности меню — в любом формате.

Пример:
"Бар «Тоник», Санкт-Петербург. Сайт: https://tonyc.clients.site/. Ссылка на Яндекс.Карты: https://yandex.ru/maps/-/CTuJZL0D. В отзывах часто хвалят домашнюю хреновуху и облепиховую настойку, кто-то жаловался на медленное обслуживание в выходные."`}
                  className="min-h-[250px]"
                />

                <Button onClick={handleGenerate} disabled={!placeText.trim() || generating} size="lg" className="w-full">
                  {generating ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" /> ИИ собирает карточку заведения...</>
                  ) : (
                    <><Sparkles size={18} className="mr-2" /> Сгенерировать карточку</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═════ STEP 2: Edit form ═════ */}
          <TabsContent value="edit">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Slug (URL)*</Label><Input value={form.slug} onChange={(e) => patch({ slug: e.target.value })} /></div>
                    <div><Label>Название*</Label><Input value={form.name} onChange={(e) => patch({ name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Город</Label><Input value={form.city} onChange={(e) => patch({ city: e.target.value })} /></div>
                    <div><Label>Адрес</Label><Input value={form.address} onChange={(e) => patch({ address: e.target.value })} /></div>
                    <div><Label>Метро</Label><Input value={form.metro} onChange={(e) => patch({ metro: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Телефон</Label><Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} /></div>
                    <div><Label>Сайт</Label><Input value={form.website} onChange={(e) => patch({ website: e.target.value })} /></div>
                    <div><Label>Часы работы</Label><Input value={form.hours} onChange={(e) => patch({ hours: e.target.value })} /></div>
                  </div>
                  <div>
                    <Label>Ссылка на Яндекс.Карты (карточка организации или кнопка «Поделиться»)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={form.yandexUrl}
                        onChange={(e) => patch({ yandexUrl: e.target.value })}
                        placeholder="https://yandex.ru/maps/... или короткая ссылка с «Поделиться»"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleResolveCoords(form.yandexUrl)}
                        disabled={!form.yandexUrl.trim() || resolvingCoords}
                      >
                        {resolvingCoords ? "Ищем..." : "Определить координаты"}
                      </Button>
                    </div>
                    {coordsError && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{coordsError}</p>}
                    {!form.yandexUrl.trim() ? (
                      <p className="text-xs mt-1 font-medium" style={{ color: "#b45309" }}>
                        Пусто — ИИ не нашёл ссылку в тексте (и не умеет искать её сам). Откройте заведение на
                        Яндекс.Картах, нажмите «Поделиться», вставьте ссылку сюда и нажмите «Определить координаты».
                      </p>
                    ) : (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Координаты берутся напрямую из ссылки — точно та же точка, что видна по кнопке «Поделиться» на карте, без угадывания.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Широта (lat)</Label>
                      <Input
                        value={form.lat}
                        onChange={(e) => patch({ lat: e.target.value })}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text").trim();
                          const match = pasted.match(/^(-?\d+[.,]\d+)\s*[,;]\s*(-?\d+[.,]\d+)$/);
                          if (match) {
                            e.preventDefault();
                            patch({ lat: match[1].replace(",", "."), lng: match[2].replace(",", ".") });
                          }
                        }}
                        placeholder="55.751244"
                      />
                    </div>
                    <div><Label>Долгота (lng)</Label><Input value={form.lng} onChange={(e) => patch({ lng: e.target.value })} placeholder="37.618423" /></div>
                    <div><Label>Ценовая категория</Label><Input value={form.price} onChange={(e) => patch({ price: e.target.value })} placeholder="₽₽" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Image */}
              <Card>
                <CardHeader><CardTitle>Фото заведения</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                  <div>
                    {(imagePreview || form.image) ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                        <img src={imagePreview || form.image} alt="" className="w-full h-40 object-cover" />
                        <button onClick={handleRemoveImage} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>✕</button>
                        {uploading && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                            <div className="w-8 h-8 border-3 border-t-transparent border-white rounded-full animate-spin" />
                          </div>
                        )}
                        {form.image && (
                          <div className="px-3 py-2 text-xs font-mono" style={{ color: "var(--text-muted)", background: "var(--surface)" }}>{form.image}</div>
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
                  <div>
                    <Label>Или вставьте URL картинки</Label>
                    <Input value={form.image} onChange={(e) => { patch({ image: e.target.value }); setImagePreview(null); }} placeholder="https://... или /images/places/..." />
                  </div>
                </CardContent>
              </Card>

              {/* Настойки и описание */}
              <Card>
                <CardHeader><CardTitle>Настойки и описание</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Изюминка настоек</Label><Input value={form.infusionsHighlight} onChange={(e) => patch({ infusionsHighlight: e.target.value })} /></div>
                  <div><Label>Фирменная настойка</Label><Input value={form.infusionsSignature} onChange={(e) => patch({ infusionsSignature: e.target.value })} /></div>
                  <div><Label>Описание заведения</Label><Textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} className="min-h-[80px]" /></div>
                  <div><Label>Теги (через запятую)</Label>
                    <Input value={form.tags.join(", ")} onChange={(e) => patch({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                  </div>
                </CardContent>
              </Card>

              {/* Отзывы */}
              <Card>
                <CardHeader><CardTitle>Резюме из отзывов</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Резюме</Label><Textarea value={form.externalSummary} onChange={(e) => patch({ externalSummary: e.target.value })} className="min-h-[100px]" /></div>
                  <div><Label>Плюсы (каждый с новой строки)</Label>
                    <Textarea value={form.externalPros.join("\n")} onChange={(e) => patch({ externalPros: e.target.value.split("\n").filter(Boolean) })} className="min-h-[60px]" />
                  </div>
                  <div><Label>Минусы (каждый с новой строки)</Label>
                    <Textarea value={form.externalCons.join("\n")} onChange={(e) => patch({ externalCons: e.target.value.split("\n").filter(Boolean) })} className="min-h-[60px]" />
                  </div>
                </CardContent>
              </Card>

              {/* Save bar */}
              <div className="flex items-center justify-between pt-4 pb-12">
                <Button variant="outline" onClick={() => setTab("source")}>← Назад к источнику</Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setForm(emptyForm()); setPlaceText(""); setImagePreview(null); setTab("source"); }}>Новое заведение</Button>
                  <Button onClick={() => handleSave()} disabled={saving} size="lg">
                    <Save size={18} className="mr-2" />
                    {saving ? "Сохранение..." : "Сохранить заведение"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Модалка предупреждения о возможных дубликатах ── */}
      {duplicateMatches && duplicateMatches.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Похоже, такое заведение уже есть
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              Нашлись похожие записи по названию и координатам. Проверьте — может, это дубликат?
            </p>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--border)" }}>
                  <img src={m.image || "/bar-1.jpg"} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.city} {m.address}</div>
                    <div className="text-xs" style={{ color: "var(--accent)" }}>Совпадение: {m.score}%</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleSave({ overwriteId: m.id })}>
                    Заменить
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDuplicateMatches(null)}>Отмена</Button>
              <Button onClick={() => handleSave({ skipCheck: true })}>Это не дубль — сохранить как новое</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
