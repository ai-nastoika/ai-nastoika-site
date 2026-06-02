import { useParams, Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { fallbackPlaces } from "@/data/fallbackData";
import {
  ArrowLeft, Star, MapPin, Clock, Phone, Globe, Train,
  Heart, Share2, Printer, ThumbsUp, MessageCircle, Send,
  AlertTriangle, Check, X, Wine,
} from "lucide-react";
import { useState } from "react";

function findFallbackPlace(slug: string) {
  return fallbackPlaces.find((p) => p.slug === slug) ?? null;
}

export default function PlaceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: apiPlace, isLoading } = trpc.place.bySlug.useQuery({ slug: slug! }, { enabled: !!slug });
  const place = apiPlace ?? findFallbackPlace(slug ?? "");
  const utils = trpc.useUtils();

  const placeId = place?.id ?? 0;
  const { data: commentsData } = trpc.comment.byPlace.useQuery(
    { placeId },
    { enabled: placeId > 0 }
  );
  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.byPlace.invalidate({ placeId });
      setNewComment("");
    },
  });
  const likeComment = trpc.comment.like.useMutation({
    onSuccess: () => utils.comment.byPlace.invalidate({ placeId }),
  });

  const [newComment, setNewComment] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <Wine size={48} style={{ color: "var(--border)" }} className="mx-auto mb-4" />
          <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>Заведение не найдено</p>
          <Link to="/barmap" className="text-sm mt-2 inline-block" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
            ← К барной карте
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!newComment.trim() || !placeId) return;
    createComment.mutate({ placeId, authorName: "Александр", text: newComment.trim() });
  };

  const infusions = (place as Record<string, unknown>).infusions as Array<{name: string, note?: string}> ?? [];
  const tags: string[] = place.tags ? (place.tags as string[]) : [];
  const comments = commentsData ?? [];
  const pros: string[] = place.externalPros ? (place.externalPros as string[]) : [];
  const cons: string[] = place.externalCons ? (place.externalCons as string[]) : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ===== HERO IMAGE ===== */}
      <div className="relative h-72 sm:h-96 lg:h-[28rem]">
        <img src={place.image ?? "/bar-1.jpg"} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)" }} />

        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", fontFamily: "var(--font-body)" }}>
          <ArrowLeft size={16} /> Назад
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <Heart size={16} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <Share2 size={16} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <Printer size={16} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}>
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
              {place.name}
            </h1>
            <p className="text-sm sm:text-base text-white/80 flex items-center gap-2" style={{ fontFamily: "var(--font-body)" }}>
              <MapPin size={16} /> {place.city}, {place.address}
            </p>
          </div>
        </div>
      </div>

      {/* ===== META BAR ===== */}
      <div className="sticky top-16 z-30 py-3" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {[
              { icon: Star, label: `${place.rating} (${place.reviews})`, color: "var(--accent)" },
              { icon: Clock, label: place.hours ?? "", color: "var(--text-secondary)" },
              { icon: Wine, label: place.price ?? "", color: "var(--text-secondary)" },
              { icon: Phone, label: place.phone ?? "", color: "var(--text-secondary)" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <m.icon size={16} style={{ color: m.color }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">

        {/* --- Quick Info Cards --- */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { icon: MapPin, label: "Адрес", value: place.address ?? "" },
            place.metro ? { icon: Train, label: "Метро", value: place.metro } : null,
            { icon: Clock, label: "Часы работы", value: place.hours ?? "" },
            { icon: Phone, label: "Телефон", value: place.phone ?? "" },
          ].filter((item): item is NonNullable<typeof item> => item !== null).map((item, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={14} style={{ color: "var(--accent)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>{item.label}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* --- Description --- */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            <MapPin size={20} style={{ color: "var(--accent)" }} /> О заведении
          </h2>
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
              {place.description ?? ""}
            </p>
            {place.website && (
              <a href={`https://${place.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm transition-opacity hover:opacity-70" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>
                <Globe size={16} /> {place.website}
              </a>
            )}
          </div>
        </section>

        {/* --- Infusions Focus --- */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            <Wine size={20} style={{ color: "var(--accent)" }} /> Настойки
          </h2>
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "var(--accent)", color: "#fff" }}>
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
              <span className="text-sm" style={{ fontFamily: "var(--font-body)", opacity: 0.9 }}>
                {place.infusionsHighlight ?? ""}
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {infusions.map((inf: {name: string, note?: string}, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={16} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }} />
                  <div>
                    <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-body)" }}>{inf.name}</span>
                    {inf.note && <span className="text-sm ml-2" style={{ fontFamily: "var(--font-body)", opacity: 0.8 }}>— {inf.note}</span>}
                  </div>
                </div>
              ))}
            </div>

            {place.infusionsSignature && (
              <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.15)" }}>
                <span className="text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-body)", opacity: 0.8 }}>Фирменная настойка</span>
                <div className="text-base font-bold mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                  {place.infusionsSignature}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* --- Reviews Summary --- */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            <Star size={20} style={{ color: "var(--accent)" }} /> Что говорят посетители
          </h2>

          <div className="rounded-2xl p-5 sm:p-6 mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {place.externalSource && (
              <div className="text-xs mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                Источники: {place.externalSource}
              </div>
            )}
            {place.externalSummary && (
              <p className="text-base mb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.8 }}>
                {place.externalSummary}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--success)", fontFamily: "var(--font-body)" }}>
                  <Check size={14} /> Что хвалят
                </h4>
                <ul className="space-y-1.5">
                  {pros.map((p) => (
                    <li key={p} className="text-sm flex items-start gap-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: "var(--success)" }} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--danger)", fontFamily: "var(--font-body)" }}>
                  <X size={14} /> Что не нравится
                </h4>
                <ul className="space-y-1.5">
                  {cons.map((c) => (
                    <li key={c} className="text-sm flex items-start gap-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: "var(--danger)" }} /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* --- User Comments --- */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle size={20} style={{ color: "var(--accent)" }} />
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Отзывы с сайта</h2>
            <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>({comments.length})</span>
          </div>

          {/* Comment input */}
          <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>
                А
              </div>
              <div className="flex-1">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Поделитесь впечатлениями о настойках..." className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none mb-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)", minHeight: 80 }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                    <AlertTriangle size={12} /> <span>Будьте вежливы. Нецензурная лексика удаляется.</span>
                  </div>
                  <button onClick={handleSubmit} disabled={!newComment.trim() || createComment.isPending} className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
                    <Send size={14} /> Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments list */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-heading)", border: "1px solid var(--border)" }}>
                    {comment.authorAvatar ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        {comment.authorName ?? "Аноним"}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("ru-RU") : ""}
                      </span>
                    </div>
                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                      {comment.text}
                    </p>
                    <button onClick={() => likeComment.mutate({ id: comment.id })} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      <ThumbsUp size={14} /> {comment.likes ?? 0}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- CTA --- */}
        <div className="flex flex-wrap gap-3">
          {place.phone && (
            <a href={`tel:${place.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-all hover:scale-105" style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}>
              <Phone size={18} /> Позвонить
            </a>
          )}
          <Link to="/barmap" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all hover:scale-105" style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}>
            <ArrowLeft size={18} /> К барной карте
          </Link>
        </div>
      </div>
    </div>
  );
}
