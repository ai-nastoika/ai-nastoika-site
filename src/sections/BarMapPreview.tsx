import { Link } from "react-router";
import { MapPin, Star, ArrowRight, Navigation } from "lucide-react";

const previewPlaces = [
  { city: "Москва", name: "Настойка Бар", rating: 4.8 },
  { city: "Санкт-Петербург", name: "Травы и Настои", rating: 4.6 },
  { city: "Казань", name: "Узбекская Ночь", rating: 4.7 },
];

export default function BarMapPreview() {
  return (
    <section className="py-20" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-6"
              style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
            >
              <Navigation size={22} />
              Барная карта
            </div>

            <h2
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Места с <span style={{ color: "var(--accent)" }}>авторскими</span> настойками
            </h2>

            <p
              className="text-lg mb-8"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
            >
              Бары и рестораны в крупных городах, где подают домашние настойки — с отзывами,
              оценками и рекомендациями от сообщества.
            </p>

            {/* Preview places */}
            <div className="space-y-3 mb-8">
              {previewPlaces.map((place) => (
                <div
                  key={place.name}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <MapPin size={22} style={{ color: "var(--accent)" }} />
                  <div className="flex-1">
                    <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {place.name}
                    </span>
                    <span className="text-base mx-2" style={{ color: "var(--text-muted)" }}>·</span>
                    <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {place.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={18} style={{ color: "#f5a623" }} fill="#f5a623" />
                    <span className="text-base font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {place.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/barmap"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-transform hover:scale-105"
              style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
            >
              <MapPin size={22} />
              Открыть барную карту
              <ArrowRight size={22} />
            </Link>
          </div>

          {/* Right: Decorative map illustration */}
          <div className="relative hidden lg:block">
            <div
              className="rounded-2xl overflow-hidden shadow-xl"
              style={{ border: "1px solid var(--border)" }}
            >
              <img
                src="/barmap-preview.jpg"
                alt="Барная карта"
                className="w-full h-80 object-cover"
              />
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)" }}
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-white text-base font-medium" style={{ fontFamily: "var(--font-body)" }}>
                  15+ заведений
                </span>
                <span className="text-white/80 text-base" style={{ fontFamily: "var(--font-body)" }}>
                  4 города
                </span>
              </div>
            </div>

            {/* Floating pins */}
            <div
              className="absolute -top-3 -right-3 rounded-xl p-3 shadow-lg"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <MapPin size={28} style={{ color: "var(--accent)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
