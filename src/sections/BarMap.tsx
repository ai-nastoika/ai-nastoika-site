import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { fallbackPlaces } from "@/data/fallbackData";
import { MapPin, Star, Clock, Wine, ChevronRight, Search, SlidersHorizontal, Navigation, ArrowLeft } from "lucide-react";

const cities = ["Все города", "Москва", "Санкт-Петербург", "Казань", "Нижний Новгород"];

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
};

export default function BarMap() {
  const navigate = useNavigate();
  const { data: apiPlaces, isLoading } = trpc.place.list.useQuery();
  const places = (apiPlaces && apiPlaces.length > 0 ? apiPlaces : fallbackPlaces) as Venue[];
  const [activeCity, setActiveCity] = useState("Все города");
  const [searchQuery, setSearchQuery] = useState("");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

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

  /* ── Инициализация и обновление карты (хук вызывается всегда, даже во время isLoading) ── */
  useEffect(() => {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const clusterer = new ymaps.Clusterer({
      preset: "islands#redClusterIcons",
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
          <a href="#/place/${venue.slug}" style="font-size:13px;color:#8B4513;font-weight:600;text-decoration:none;">Подробнее →</a>
        </div>
      `;

      return new ymaps.Placemark(
        [lat, lng],
        {
          balloonContent,
          hintContent: venue.name,
        },
        {
          preset: "islands#redIcon",
        }
      );
    });

    placemarks.forEach((pm) => clusterer.add(pm));
    map.geoObjects.add(clusterer);

    if (placemarks.length > 0) {
      map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
    }
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

          <div className="flex flex-wrap gap-2 mt-8">
            {cities.map((city) => (
              <button key={city} onClick={() => setActiveCity(city)} className="rounded-full px-5 py-2 text-base font-medium transition-all" style={{ background: activeCity === city ? "var(--accent)" : "var(--bg-card)", color: activeCity === city ? "#fff" : "var(--text-secondary)", border: activeCity === city ? "none" : "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Настоящая карта — Яндекс.Карты */}
      <section className="py-8" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", height: 480 }}>
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
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {activeCity === "Все города" ? "Все заведения" : `Заведения в ${activeCity}`}
            </h2>
            <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
              {filteredVenues.length} мест
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {filteredVenues.map((venue) => (
              <Link to={`/place/${venue.slug}`} key={venue.id} className="group rounded-2xl overflow-hidden transition-all hover:shadow-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="relative overflow-hidden">
                  <img src={venue.image ?? "/bar-1.jpg"} alt={venue.name} className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-3 right-3 rounded-full px-3 py-1 text-base font-medium" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontFamily: "var(--font-body)" }}>{venue.price}</div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{venue.name}</h3>
                      <div className="flex items-center gap-1 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <MapPin size={28} />{venue.city}, {venue.address}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={22} fill="var(--accent)" color="var(--accent)" />
                      <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{venue.rating}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(venue.tags ? (venue.tags as string[]) : []).map((tag: string) => (
                      <span key={tag} className="rounded-full px-3 py-1 text-base" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>{tag}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        <Clock size={28} />{venue.hours}
                      </div>
                      <div className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{venue.reviews} отзывов</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-base font-medium transition-all group-hover:gap-2" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                      Подробнее<ChevronRight size={22} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredVenues.length === 0 && (
            <div className="text-center py-16">
              <Wine size={48} style={{ color: "var(--border)" }} className="mx-auto mb-4" />
              <p className="text-lg font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Ничего не найдено</p>
              <p className="text-base mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Попробуйте изменить фильтры или поисковый запрос</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
