import { useState } from "react";
import { Link } from "react-router";
import PageHero from "@/components/PageHero";
import { trpc } from "@/providers/trpc";
import { Tag, Sparkles, Wand2, ImagePlus, Type, ArrowRight, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Вводная страница раздела «Этикетка» — статический редакторский лонгрид
   (по тому же принципу, что VinokurPage.tsx / RulesPage.tsx) плюс витрина
   примеров, которую пополняют администраторы через labelExampleRouter.
   Сам генератор — на отдельном шаге /label/generate, эта страница только
   объясняет и вдохновляет, не грузит форму генерации сразу.
   ───────────────────────────────────────────────────────────────────────── */

const points: { icon: typeof Wand2; title: string; text: string }[] = [
  {
    icon: ImagePlus,
    title: "Любое фото из личного альбома",
    text: "Портрет именинника, кадр со свадьбы, семейное фото с дачи — ИИ аккуратно вписывает изображение человека в композицию этикетки и обрабатывает его под выбранный стиль, от акварели до строгой графики.",
  },
  {
    icon: Type,
    title: "Любые надписи, любые шрифты",
    text: "Имя, дата, поздравление, крепость, шуточная подпись — текст ложится в композицию в подходящем по духу шрифте, а не приклеивается поверх готовой картинки как чужеродная наклейка.",
  },
  {
    icon: Sparkles,
    title: "Сюжет и декор под повод",
    text: "День рождения, Новый год, юбилей, просто подарок другу — опишите событие, и ИИ сам придумает уместные элементы оформления: от растительных орнаментов до праздничной атрибутики.",
  },
];

export default function LabelIntroPage() {
  const { data: examples } = trpc.labelExample.list.useQuery();
  const [lightbox, setLightbox] = useState<{ imageUrl: string; title: string | null; prompt: string } | null>(null);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <PageHero
        icon={Tag}
        badgeText="Этикетка"
        maxWidth="max-w-5xl"
        title={<>Время стандартных наклеек <span style={{ color: "var(--accent)" }}>прошло</span></>}
        subtitle="Раньше оформление домашнего напитка заканчивалось походом в магазин за пачкой одинаковых бланков. С развитием технологий наступила эпоха разнообразия и индивидуальности — теперь каждая бутылка может получить свою собственную, единственную в своём роде этикетку, созданную специально под вкус, повод и настроение."
      />
      <div className="text-center py-10">
        <Link
          to="/label/generate"
          className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-medium text-white transition-all hover:scale-105"
          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          Создать свою этикетку
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Три тезиса */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Что умеет ИИ-художник
          </h2>
          <p className="text-base text-center max-w-2xl mx-auto mb-12" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
            Каждый может сгенерировать этикетку по своему вкусу и желанию — приуроченную к любому
            событию или с изображением любого близкого человека.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {points.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--surface)" }}>
                    <Icon size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    {p.title}
                  </h3>
                  <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                    {p.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Примеры */}
      {examples && examples.length > 0 && (
        <section className="py-16 sm:py-20" style={{ background: "var(--bg-secondary)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              Примеры этикеток
            </h2>
            <p className="text-base text-center max-w-2xl mx-auto mb-12" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
              Несколько удачных генераций для вдохновения — нажмите на любую, чтобы посмотреть крупнее
              и увидеть, каким описанием она была получена.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setLightbox({ imageUrl: ex.imageUrl, title: ex.title, prompt: ex.prompt })}
                  className="text-left rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
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
        </section>
      )}

      {/* Финальный CTA */}
      <section className="py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            Готовы попробовать?
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
            Опишите желаемый стиль, загрузите фото при желании, впишите текст — и получите готовую
            этикетку за пару минут.
          </p>
          <Link
            to="/label/generate"
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-medium text-white transition-all hover:scale-105"
            style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            Создать свою этикетку
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Лайтбокс примера */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div className="max-w-lg w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.imageUrl}
              alt={lightbox.title ?? "Пример этикетки — крупно"}
              className="max-w-full max-h-[70vh] rounded-lg"
              style={{ objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            />
            <div className="mt-4 w-full rounded-xl p-4" style={{ background: "var(--bg-card)" }}>
              {lightbox.title && (
                <p className="text-base font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  {lightbox.title}
                </p>
              )}
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--text-muted)" }}>Промпт: </span>{lightbox.prompt}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLightbox(null)}
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
