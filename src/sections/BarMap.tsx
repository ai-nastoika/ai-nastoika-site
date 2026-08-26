import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { fallbackPlaces } from "@/data/fallbackData";
import { MapPin, Clock, Wine, Search, SlidersHorizontal, Navigation, ArrowLeft, Plus, LocateFixed, TrendingUp, Sparkles, FileText } from "lucide-react";
import SuggestPlaceForm from "./SuggestPlaceForm";
import { ShotGlassCardSummary } from "@/components/ShotGlassRating";

/* Компактный индикатор рюмками для карточки заведения в списке */
function PlaceRatingBadge({ placeId }: { placeId: number }) {
  const { data: summary } = trpc.comment.ratingSummary.useQuery({ placeId });
  if (!summary) return null;
  return <ShotGlassCardSummary summary={summary} />;
}

const cities = ["Все города", "Москва", "Санкт-Петербург", "Казань", "Нижний Новгород"];

// Примерные координаты центров городов — только для автовыбора ближайшего
// города по геолокации при заходе на страницу (см. useEffect ниже).
// Не путать с DEFAULT_CENTER (это центр карты по умолчанию, Москва).
const CITY_CENTERS: Record<string, [number, number]> = {
  "Москва": [55.7558, 37.6173],
  "Санкт-Петербург": [59.9311, 30.3609],
  "Казань": [55.7963, 49.1088],
  "Нижний Новгород": [56.2965, 43.9361],
};

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

// Дефолтный центр — Москва (используется, пока не знаем координаты заведений)
const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];

/* ═══════════════════════════════════════════════════════════════
   Загрузка Яндекс.Карт JS API (один раз на страницу)
   ═══════════════════════════════════════════════════════════════ */
let ymapsLoadPromise: Promise<any> | null = null;

function loadYmaps(): Promise<any> {
  if (ymapsLoadPromise) return ymapsLoadPromise;

  ymapsLoadPromise = new Promise((resolve, reject) => {
    if (!YANDEX_MAPS_API_KEY) {
      reject(new Error("NO_API_KEY"));
      return;
    }
    const w = window as any;
    if (w.ymaps) {
      w.ymaps.ready(() => resolve(w.ymaps));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU`;
    script.async = true;
    script.onload = () => w.ymaps.ready(() => resolve(w.ymaps));
    script.onerror = () => reject(new Error("SCRIPT_LOAD_ERROR"));
    document.head.appendChild(script);
  });

  return ymapsLoadPromise;
}

type Venue = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
  address?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  image?: string | null;
  rating?: string | number | null;
  reviews?: number | null;
  price?: string | null;
  hours?: string | null;
  tags?: string[] | null;
  menuFiles?: { url: string; name: string }[] | null;
  createdAt?: string | Date | null;
};

/* ── Расстояние по прямой между двумя точками (формула гаверсинуса), км ── */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ── Грубая оценка времени в пути — не маршрут, а прикидка по прямой ── */
function estimateTravel(km: number): { label: string; mode: string } {
  if (km <= 1.5) {
    const mins = Math.max(1, Math.round((km / 4.5) * 60));
    return { label: `≈ ${mins} мин`, mode: "пешком" };
  }
  const mins = Math.max(1, Math.round((km / 25) * 60));
  return { label: `≈ ${mins} мин`, mode: "на транспорте" };
}

export default function BarMap() {
  const navigate = useNavigate();
  const { data: apiPlaces, isLoading } = trpc.place.list.useQuery();
  const places = (apiPlaces && apiPlaces.length > 0 ? apiPlaces : fallbackPlaces) as Venue[];
  const [activeCity, setActiveCity] = useState("Все города");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const GRID_LIMIT_OPTIONS = [10, 20, 50, 100];
  const [gridLimit, setGridLimit] = useState(10);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported">("idle");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const cityManuallyChosenRef = useRef(false);

  function handleLocate() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  /* ── Автовыбор ближайшего города при заходе на страницу — молча, отдельно
     от кнопки "рядом со мной" выше (та осталась строго по клику, своё
     состояние geoStatus не трогаем, чтобы не всплывал баннер "отказано в
     доступе", если пользователь ничего не нажимал). При отказе/отсутствии
     геолокации просто остаёмся на "Все города" — никакого видимого следа. ── */
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cityManuallyChosenRef.current) return; // пользователь уже сам выбрал город — не перебиваем
        let nearestCity: string | null = null;
        let nearestDist = Infinity;
        for (const [city, [lat, lng]] of Object.entries(CITY_CENTERS)) {
          const d = haversineKm(pos.coords.latitude, pos.coords.longitude, lat, lng);
          if (d < nearestDist) { nearestDist = d; nearestCity = city; }
        }
        if (nearestCity) setActiveCity(nearestCity);
      },
      () => { /* тихо игнорируем — остаёмся на "Все города" */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const venues = places ?? [];

  const filteredVenues = venues.filter((v) => {
    const cityMatch = activeCity === "Все города" || v.city === activeCity;
    const searchMatch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.tags ? (v.tags as string[]).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())) : false);
    return cityMatch && searchMatch;
  });

  // Только те заведения, у которых реально есть координаты — их можно поставить на карту
  const venuesWithCoords = filteredVenues.filter(
    (v) => v.lat !== null && v.lat !== undefined && v.lng !== null && v.lng !== undefined
  );

  // Для рекомендаций "рядом со мной" берём ВСЕ заведения с координатами,
  // независимо от текущих фильтров по городу/поиску
  const allVenuesWithCoords = useMemo(
    () => venues.filter((v) => v.lat !== null && v.lat !== undefined && v.lng !== null && v.lng !== undefined),
    [venues]
  );

  const recommendations = useMemo(() => {
    if (!userCoords) return null;

    const withDistance = allVenuesWithCoords.map((v) => ({
      ...v,
      distanceKm: haversineKm(userCoords.lat, userCoords.lng, Number(v.lat), Number(v.lng)),
    }));

    const nearest = [...withDistance].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
    const nearestIds = new Set(nearest.map((v) => v.id));

    const bestRated = [...withDistance]
      .filter((v) => !nearestIds.has(v.id))
      .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0))
      .slice(0, 3);
    const bestIds = new Set(bestRated.map((v) => v.id));

    const fresh = [...withDistance]
      .filter((v) => !nearestIds.has(v.id) && !bestIds.has(v.id))
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

    return { nearest, bestRated, fresh };
  }, [userCoords, allVenuesWithCoords]);

  /* ── Инициализация и обновление карты. Зависит от isLoading: пока данные грузятся,
     компонент рендерит только спиннер, и <div ref={mapContainerRef}> ещё не существует
     в DOM — эффект должен перезапуститься, когда контейнер реально появится. ── */
  useEffect(() => {
    if (isLoading) return; // контейнер карты ещё не отрендерен
    if (mapInstanceRef.current) return; // карта уже создана — не пересоздаём повторно

    let cancelled = false;
    let map: any = null;

    async function init() {
      if (!mapContainerRef.current) return;
      try {
        const ymaps = await loadYmaps();
        if (cancelled) return;

        map = new ymaps.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          controls: ["zoomControl"],
        });
        mapInstanceRef.current = map;

        renderPlacemarks(ymaps, map, venuesWithCoords);
      } catch (e) {
        if (!cancelled) {
          setMapError(
            (e as Error).message === "NO_API_KEY"
              ? "Не задан VITE_YANDEX_MAPS_API_KEY — добавьте ключ в .env и пересоберите фронтенд"
              : "Не удалось загрузить Яндекс.Карты"
          );
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (map) map.destroy();
      if (mapInstanceRef.current === map) mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  /* ── Перерисовка меток при смене фильтров ── */
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const w = window as any;
    if (!w.ymaps) return;
    renderPlacemarks(w.ymaps, mapInstanceRef.current, venuesWithCoords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity, searchQuery, venues.length]);

  function renderPlacemarks(ymaps: any, map: any, list: Venue[]) {
    map.geoObjects.removeAll();

    if (list.length === 0) return;

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8B4513";
    const pinIcon = buildPinIconDataUri(accentColor);
    const clusterPinIcon = buildClusterPinDataUri(accentColor);

    const clusterer = new ymaps.Clusterer({
      // Свой пин вместо стандартного красно-белого кружка Яндекса.
      // clusterNumbers: [0] заставляет всегда использовать одну и ту же иконку
      // (обычно Яндекс переключает 3 размера иконки по числу объектов в кластере).
      clusterIcons: [{ href: clusterPinIcon, size: [36, 46], offset: [-18, -46] }],
      clusterNumbers: [0],
      clusterIconContentLayout: ymaps.templateLayoutFactory.createClass(
        `<div style="position:absolute;top:9px;left:0;width:36px;text-align:center;font:700 13px sans-serif;color:${accentColor};">$[properties.geoObjects.length]</div>`
      ),
      groupByCoordinates: false,
      clusterDisableClickZoom: false,
    });

    const placemarks = list.map((venue) => {
      const lat = Number(venue.lat);
      const lng = Number(venue.lng);

      const balloonContent = `
        <div style="max-width:220px;font-family:sans-serif;">
          ${venue.image ? `<img src="${venue.image}" alt="" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />` : ""}
          <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${escapeHtml(venue.name)}</div>
          <div style="font-size:12px;color:#666;margin-bottom:4px;">${escapeHtml(venue.address ?? "")}</div>
          ${venue.hours ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">🕒 ${escapeHtml(venue.hours)}</div>` : ""}
          ${venue.rating ? `<div style="font-size:12px;margin-bottom:6px;">⭐ ${venue.rating} (${venue.reviews ?? 0} отзывов)</div>` : ""}
          <div style="display:flex;gap:10px;align-items:center;">
            <a href="#/place/${venue.slug}" style="font-size:13px;color:#8B4513;font-weight:600;text-decoration:none;">Подробнее →</a>
            <a href="https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#666;text-decoration:none;">🧭 Маршрут</a>
          </div>
        </div>
      `;

      // Мини-карточка при наведении — фото, название, город, рейтинг, часы, теги
      const tags = Array.isArray(venue.tags) ? (venue.tags as string[]).slice(0, 2) : [];
      const hintContent = `
        <div style="width:220px;font-family:sans-serif;padding:2px;">
          <div style="display:flex;gap:8px;">
            ${venue.image ? `<img src="${venue.image}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;flex-shrink:0;" />` : ""}
            <div style="min-width:0;flex:1;">
              <div style="font-weight:700;font-size:13px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(venue.name)}</div>
              <div style="font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(venue.city ?? "")}</div>
              ${venue.rating ? `<div style="font-size:11px;color:#333;margin-top:2px;">⭐ ${venue.rating} · ${venue.reviews ?? 0} отзывов</div>` : ""}
            </div>
          </div>
          ${venue.hours ? `<div style="font-size:11px;color:#666;margin-top:6px;">🕒 ${escapeHtml(venue.hours)}</div>` : ""}
          ${tags.length > 0 ? `<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">${tags.map((t) => `<span style="font-size:10px;background:#f3f0ea;color:${accentColor};padding:2px 6px;border-radius:10px;">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>
      `;

      return new ymaps.Placemark(
        [lat, lng],
        {
          balloonContent,
          hintContent,
        },
        {
          iconLayout: "default#image",
          iconImageHref: pinIcon,
          iconImageSize: [36, 46],
          iconImageOffset: [-18, -46],
        }
      );
    });

    placemarks.forEach((pm) => clusterer.add(pm));
    map.geoObjects.add(clusterer);

    if (placemarks.length > 0) {
      map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
    }
  }

  // Собственный пин-маркер в виде стопочки настойки — та же иконка, что и на превью
  // главной страницы (BarMapPreview.tsx), но встроенная как SVG-путь для data URI.
  // Линейная (stroke), а не сплошная заливка — чтобы выглядело легче и аккуратнее.
  function buildPinIconDataUri(color: string): string {
    const svg = `
      <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${color}"/>
        <circle cx="18" cy="17" r="12.5" fill="#ffffff"/>
        <g transform="translate(10.6,9.6) scale(0.62)" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3h8" />
          <path d="M8 3c0 4 .5 6 1.5 7a2.7 2.7 0 0 0 5 0c1-1 1.5-3 1.5-7" />
          <path d="M12 14v6" />
          <path d="M9 20h6" />
        </g>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // Тот же пин, но без стопочки внутри — на кружок накладывается число заведений
  // через clusterIconContentLayout (см. renderPlacemarks)
  function buildClusterPinDataUri(color: string): string {
    const svg = `
      <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${color}"/>
        <circle cx="18" cy="17" r="12.5" fill="#ffffff"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function escapeHtml(str: string) {
    return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={18} /> Назад
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <Navigation size={22} />
                Барная карта
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Где пить <span style={{ color: "var(--accent)" }}>настойки</span>
              </h1>
              <p className="text-lg max-w-xl" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                Места с авторскими настойками в крупных городах — с отзывами, оценками и рекомендациями от сообщества
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl px-4 py-3 w-full lg:w-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minWidth: 320 }}>
              <Search size={22} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input type="text" placeholder="Поиск по названию или типу настоек..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none text-base w-full" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }} />
              <SlidersHorizontal size={22} style={{ color: "var(--text-muted)", flexShrink: 0, cursor: "pointer" }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-8 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <button key={city} onClick={() => { cityManuallyChosenRef.current = true; setActiveCity(city); }} className="rounded-full px-5 py-2 text-base font-medium transition-all" style={{ background: activeCity === city ? "var(--accent)" : "var(--bg-card)", color: activeCity === city ? "#fff" : "var(--text-secondary)", border: activeCity === city ? "none" : "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                  {city}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-medium transition-all hover:scale-105"
              style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
            >
              <Plus size={18} /> Предложить заведение
            </button>
          </div>
        </div>
      </section>

      {/* Рекомендации "рядом со мной" — по клику, не автоматически */}
      <section className="py-6" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {geoStatus === "idle" && (
            <button
              onClick={handleLocate}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-medium transition-all hover:opacity-80"
              style={{ background: "var(--bg-card)", border: "1px dashed var(--border)", color: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <LocateFixed size={20} />
              Показать заведения рядом со мной
            </button>
          )}

          {geoStatus === "loading" && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              Определяем ваше местоположение...
            </div>
          )}

          {geoStatus === "denied" && (
            <div className="flex items-center justify-between gap-3 rounded-xl px-5 py-4 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              <span>Не удалось получить доступ к геолокации — проверьте разрешения браузера для этого сайта.</span>
              <button onClick={handleLocate} className="shrink-0 font-medium" style={{ color: "var(--accent)" }}>Повторить</button>
            </div>
          )}

          {geoStatus === "unsupported" && (
            <div className="rounded-xl px-5 py-4 text-sm text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              Ваш браузер не поддерживает определение местоположения
            </div>
          )}

          {geoStatus === "granted" && recommendations && (
            <div className="space-y-8">
              {recommendations.nearest.length > 0 && (
                <RecommendGroup
                  icon={<LocateFixed size={18} />}
                  title="Ближе всего к вам"
                  subtitle="Расстояние по прямой"
                  items={recommendations.nearest}
                  showDistance
                />
              )}
              {recommendations.bestRated.length > 0 && (
                <RecommendGroup
                  icon={<TrendingUp size={18} />}
                  title="Лучшие рядом"
                  subtitle="По оценкам сообщества"
                  items={recommendations.bestRated}
                  showDistance
                />
              )}
              {recommendations.fresh && (
                <RecommendGroup
                  icon={<Sparkles size={18} />}
                  title="Новое место"
                  subtitle="Недавно добавлено на карту"
                  items={[recommendations.fresh]}
                  showDistance
                />
              )}
            </div>
          )}
        </div>
      </section>


      <section className="py-8" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", height: 420 }}>
            {mapError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <MapPin size={40} style={{ color: "var(--border)" }} className="mb-3" />
                <p className="text-base font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{mapError}</p>
              </div>
            ) : (
              <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
            )}

            {!mapError && venuesWithCoords.length === 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                У выбранных заведений пока нет координат
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Venues Grid */}
      <section className="pb-20" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {activeCity === "Все города" ? "Все заведения" : `Заведения в ${activeCity}`}
            </h2>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Показано {Math.min(gridLimit, filteredVenues.length)} из {filteredVenues.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Показывать:</span>
                {GRID_LIMIT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setGridLimit(n)}
                    className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: gridLimit === n ? "var(--accent)" : "var(--bg-card)",
                      color: gridLimit === n ? "#fff" : "var(--text-secondary)",
                      border: gridLimit === n ? "none" : "1px solid var(--border)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {filteredVenues.slice(0, gridLimit).map((venue) => (
              <Link to={`/place/${venue.slug}`} key={venue.id} className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="relative overflow-hidden">
                  <img src={venue.image ?? "/bar-1.jpg"} alt={venue.name} className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-3 right-3 rounded-full px-3 py-1 text-base font-medium" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontFamily: "var(--font-body)" }}>{venue.price}</div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold mb-1 truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{venue.name}</h3>
                      <div className="flex items-start gap-1.5 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <MapPin size={16} className="shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{venue.city}, {venue.address}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <PlaceRatingBadge placeId={venue.id} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {(venue.tags ? (venue.tags as string[]) : []).map((tag: string) => (
                      <span key={tag} className="rounded-full px-3 py-1 text-sm" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>{tag}</span>
                    ))}
                    {venue.menuFiles && venue.menuFiles.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm" style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                        <FileText size={14} /> Меню
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-sm mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    <Clock size={16} className="shrink-0" />
                    <span className="truncate">{venue.hours}</span>
                  </div>

                  <span
                    className="block w-full text-center rounded-xl py-2.5 text-base font-semibold transition-opacity group-hover:opacity-85"
                    style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
                  >
                    Подробнее
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {filteredVenues.length > gridLimit && (
            <div className="text-center mt-8">
              <button
                onClick={() => setGridLimit(GRID_LIMIT_OPTIONS.find((n) => n > gridLimit) ?? 100)}
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "var(--bg-card)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
              >
                Показать ещё
              </button>
            </div>
          )}

          {filteredVenues.length === 0 && (
            <div className="text-center py-16">
              <Wine size={48} style={{ color: "var(--border)" }} className="mx-auto mb-4" />
              <p className="text-lg font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Ничего не найдено</p>
              <p className="text-base mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Попробуйте изменить фильтры или поисковый запрос</p>
            </div>
          )}
        </div>
      </section>

      {showAddForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto py-12 px-4" style={{ background: "var(--bg-primary)" }}>
          <SuggestPlaceForm onClose={() => setShowAddForm(false)} />
        </div>
      )}
    </div>
  );
}

/* ── Компактная карточка-подборка для блока "рядом со мной" ── */
function RecommendGroup({
  icon,
  title,
  subtitle,
  items,
  showDistance,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  items: (Venue & { distanceKm: number })[];
  showDistance?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1" style={{ color: "var(--accent)" }}>
        {icon}
        <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>{title}</h3>
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{subtitle}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((venue) => {
          const travel = showDistance ? estimateTravel(venue.distanceKm) : null;
          return (
            <Link
              key={venue.id}
              to={`/place/${venue.slug}`}
              className="group flex gap-3 rounded-xl p-3 transition-all hover:shadow-md"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <img src={venue.image || "/bar-1.jpg"} alt={venue.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  {venue.name}
                </div>
                <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  <PlaceRatingBadge placeId={venue.id} />
                </div>
                {travel && (
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    {venue.distanceKm.toFixed(1)} км · {travel.label} {travel.mode}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
