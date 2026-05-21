import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { MapPin, Star, Clock, Wine, ChevronRight, Search, SlidersHorizontal, Navigation } from "lucide-react";

const cities = ["Все города", "Москва", "Санкт-Петербург", "Казань", "Нижний Новгород"];

const coordMap: Record<string, { top: string; left: string }> = {
  "dymniy-kotel": { top: "25%", left: "65%" },
  "tayga": { top: "40%", left: "30%" },
  "izba-nastoek": { top: "60%", left: "55%" },
  "craft-spirits-lab": { top: "35%", left: "75%" },
};

export default function BarMap() {
  const { data: places, isLoading } = trpc.place.list.useQuery();
  const [activeCity, setActiveCity] = useState("Все города");
  const [hoveredVenue, setHoveredVenue] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const venues = places ?? [];

  const filteredVenues = venues.filter((v) => {
    const cityMatch = activeCity === "Все города" || v.city === activeCity;
    const searchMatch =
      !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.tags ? (v.tags as string[]).some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())) : false);
    return cityMatch && searchMatch;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "var(--accent-light)", transform: "translate(30%, -30%)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4" style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
                <Navigation size={22} />
                Барная карта
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
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

      {/* Interactive Map */}
      <section className="py-8" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", height: 420 }}>
            <svg viewBox="0 0 800 400" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
              <rect width="800" height="400" fill="var(--bg-secondary)" />
              {[...Array(8)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 50 + 50} x2="800" y2={i * 50 + 50} stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
              ))}
              {[...Array(16)].map((_, i) => (
                <line key={`v${i}`} x1={i * 50 + 50} y1="0" x2={i * 50 + 50} y2="400" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
              ))}
              <path d="M0,120 Q200,80 400,140 T800,100 L800,160 Q600,200 400,160 T0,200Z" fill="var(--surface)" opacity="0.5" />
              <path d="M0,280 Q300,240 500,300 T800,260 L800,320 Q500,360 300,300 T0,340Z" fill="var(--surface)" opacity="0.3" />
              <text x="100" y="80" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-body)" opacity="0.5">Центр</text>
              <text x="350" y="200" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-body)" opacity="0.5">Арбат</text>
              <text x="600" y="120" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-body)" opacity="0.5">Басманный</text>
              <text x="200" y="340" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-body)" opacity="0.5">Замоскворечье</text>
            </svg>

            {venues.map((venue) => {
              const coords = coordMap[venue.slug] ?? { top: "50%", left: "50%" };
              return (
                <Link to={`/place/${venue.slug}`} key={venue.id} className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 z-10" style={{ top: coords.top, left: coords.left }} onMouseEnter={() => setHoveredVenue(venue.id)} onMouseLeave={() => setHoveredVenue(null)}>
                  <div className="relative flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: "50% 50% 50% 0", background: hoveredVenue === venue.id ? "var(--accent-dark)" : "var(--accent)", transform: "rotate(-45deg)", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", transition: "all 0.3s ease" }}>
                    <Wine size={28} color="#fff" style={{ transform: "rotate(45deg)" }} />
                  </div>
                  {hoveredVenue === venue.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 rounded-xl overflow-hidden shadow-xl z-20" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <img src={venue.image ?? "/bar-1.jpg"} alt={venue.name} className="w-full h-24 object-cover" />
                      <div className="p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Star size={28} fill="var(--accent)" color="var(--accent)" />
                          <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{venue.rating}</span>
                          <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>({venue.reviews} отзывов)</span>
                        </div>
                        <div className="text-base font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{venue.name}</div>
                        <div className="text-base mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{venue.address}</div>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}

            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>+</button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>−</button>
            </div>
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
