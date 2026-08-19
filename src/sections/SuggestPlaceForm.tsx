import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Check, Wine, Link as LinkIcon, ChevronDown, MapPin, Tag, Coins, Clock } from "lucide-react";

type YandexTagStatus = "has_tag" | "wants_paid" | "no_tag_wait";
type InputMode = "url" | "address";

function isYandexMapsUrl(url: string): boolean {
  return /yandex\.[a-z.]+\/maps/i.test(url) || /yandex\.[a-z.]+\/[a-z]{2}\/maps/i.test(url);
}

export default function SuggestPlaceForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [yandexTagStatus, setYandexTagStatus] = useState<YandexTagStatus | null>(null);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const createSubmission = trpc.placeSubmission.create.useMutation();
  const submitForReview = trpc.placeSubmission.submit.useMutation();

  const urlLooksValid = url.trim().length > 0 && isYandexMapsUrl(url);
  const addressFilled = address.trim().length >= 5;
  const locationProvided = inputMode === "url" ? urlLooksValid : addressFilled;
  const canSubmit = name.trim() && email.trim() && locationProvided && yandexTagStatus !== null;

  async function handleSubmit() {
    setError("");
    try {
      const draft = await createSubmission.mutateAsync({
        authorName: name,
        contactEmail: email,
        rawUrl: inputMode === "url" ? url : undefined,
        rawAddress: inputMode === "address" ? address : undefined,
        rawNotes: description || undefined,
        yandexTagStatus: yandexTagStatus ?? undefined,
      });
      // Публичная заявка сразу уходит на модерацию — без обработки ИИ на стороне пользователя
      await submitForReview.mutateAsync({ id: draft.id });
      setDone(true);
    } catch {
      setError("Не удалось отправить заявку. Попробуйте ещё раз чуть позже.");
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#d8f3dc" }}>
          <Check size={32} style={{ color: "#386641" }} />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Спасибо! Заявка отправлена
        </h2>
        <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
          {yandexTagStatus === "has_tag" && "Раз тег «Настойки» уже есть на Яндекс.Картах — обычно такие заявки мы обрабатываем быстро и бесплатно."}
          {yandexTagStatus === "wants_paid" && "Мы свяжемся с вами по указанному email, чтобы обсудить детали и приоритетную обработку."}
          {yandexTagStatus === "no_tag_wait" && "Заявка встанет в общую очередь — добавим, когда Яндекс сам присвоит тег «Настойки» отзывам этого заведения."}
        </p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
          style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
        >
          Готово
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          <Wine size={24} className="inline mr-2" style={{ color: "var(--accent)" }} />
          Предложить <span style={{ color: "var(--accent)" }}>заведение</span>
        </h2>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
          style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
        >
          Отмена
        </button>
      </div>

      {/* Правила добавления — на видном месте, чтобы не было неожиданностей после отправки */}
      <div className="rounded-xl mb-5 overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <button
          onClick={() => setRulesOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
            Как мы решаем, что попадёт на карту
          </span>
          <ChevronDown size={18} style={{ color: "var(--text-muted)", transform: rulesOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
        {rulesOpen && (
          <div className="px-4 pb-4 space-y-3 text-sm" style={{ fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
            <div className="flex gap-2">
              <MapPin size={16} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-secondary)" }}>
                Заносим только заведения, которые есть на <strong>Яндекс.Картах</strong>. Точная ссылка необязательна — можно указать просто адрес,
                мы сами найдём нужную точку. Если места нет на Яндекс.Картах вообще — на нашу карту оно, к сожалению, не попадёт.
              </span>
            </div>
            <div className="flex gap-2">
              <Tag size={16} className="shrink-0 mt-0.5" style={{ color: "#16a34a" }} />
              <span style={{ color: "var(--text-secondary)" }}>
                Если в отзывах на Яндекс.Картах у заведения <strong>уже есть тег «Настойки»</strong> — добавляем бесплатно, это быстро.
              </span>
            </div>
            <div className="flex gap-2">
              <Coins size={16} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
              <span style={{ color: "var(--text-secondary)" }}>
                Если тега пока нет — нужен ручной разбор отзывов и составление описания администратором. Это можно ускорить донатом
                или депозитом от заведения на дегустацию — тогда рассмотрим вне очереди.
              </span>
            </div>
            <div className="flex gap-2">
              <Clock size={16} className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-secondary)" }}>
                Без доната — тоже добавим, но только когда сам Яндекс присвоит отзывам тег «Настойки». Срок заранее назвать не можем.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm">Ваше имя *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться?" className="mt-1" />
        </div>

        <div>
          <Label className="text-sm">Email для связи *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
        </div>

        <div>
          <Label className="text-sm mb-2 block">Как найти заведение на Яндекс.Картах? *</Label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: inputMode === "url" ? "var(--accent)" : "var(--surface)",
                color: inputMode === "url" ? "#fff" : "var(--text-secondary)",
                border: "1px solid " + (inputMode === "url" ? "var(--accent)" : "var(--border)"),
                fontFamily: "var(--font-body)",
              }}
            >
              У меня есть ссылка
            </button>
            <button
              type="button"
              onClick={() => setInputMode("address")}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: inputMode === "address" ? "var(--accent)" : "var(--surface)",
                color: inputMode === "address" ? "#fff" : "var(--text-secondary)",
                border: "1px solid " + (inputMode === "address" ? "var(--accent)" : "var(--border)"),
                fontFamily: "var(--font-body)",
              }}
            >
              Просто укажу адрес
            </button>
          </div>

          {inputMode === "url" ? (
            <>
              <div className="relative">
                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yandex.ru/maps/..." className="pl-9" />
              </div>
              {url.trim().length > 0 && !urlLooksValid && (
                <p className="text-xs mt-1" style={{ color: "#dc2626" }}>Похоже, это не ссылка на Яндекс.Карты.</p>
              )}
            </>
          ) : (
            <>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Город, улица, номер дома" className="pl-9" />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Мы сами найдём заведение на Яндекс.Картах по адресу — но это добавит времени на проверку.
              </p>
            </>
          )}
        </div>

        <div>
          <Label className="text-sm mb-2 block">Есть ли у заведения тег «Настойки» в отзывах на Яндекс.Картах? *</Label>
          <div className="space-y-2">
            {([
              { id: "has_tag" as const, label: "Да, тег уже есть" },
              { id: "wants_paid" as const, label: "Нет, но готовы поддержать проект донатом/дегустацией ради приоритета" },
              { id: "no_tag_wait" as const, label: "Нет — подожду, пока тег появится сам" },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setYandexTagStatus(opt.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                style={{
                  background: yandexTagStatus === opt.id ? "var(--accent)" : "var(--surface)",
                  color: yandexTagStatus === opt.id ? "#fff" : "var(--text-secondary)",
                  border: "1px solid " + (yandexTagStatus === opt.id ? "var(--accent)" : "var(--border)"),
                  fontFamily: "var(--font-body)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {yandexTagStatus === "wants_paid" && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
              После отправки мы напишем вам на email, чтобы согласовать детали. Поддержать проект также можно на{" "}
              <Link to="/rules" className="underline" style={{ color: "var(--accent)" }}>странице доната</Link>.
            </p>
          )}
        </div>

        <div>
          <Label className="text-sm">Краткое описание</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Что за место, какие настойки там есть — расскажите в паре предложений"
            className="mt-1 min-h-[100px]"
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || createSubmission.isPending || submitForReview.isPending}
          className="w-full"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Send size={18} className="mr-2" />
          {createSubmission.isPending || submitForReview.isPending ? "Отправляем..." : "Отправить заявку"}
        </Button>
      </div>
    </div>
  );
}
