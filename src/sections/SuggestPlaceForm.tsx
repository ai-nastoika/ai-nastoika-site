import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Check, Wine, Link as LinkIcon } from "lucide-react";

export default function SuggestPlaceForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const createSubmission = trpc.placeSubmission.create.useMutation();
  const submitForReview = trpc.placeSubmission.submit.useMutation();

  const canSubmit = name.trim() && email.trim() && (url.trim() || description.trim());

  async function handleSubmit() {
    setError("");
    try {
      const draft = await createSubmission.mutateAsync({
        authorName: name,
        contactEmail: email,
        rawUrl: url || undefined,
        rawNotes: description || undefined,
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
          Мы проверим информацию и, если всё в порядке, заведение появится на барной карте. Если понадобятся детали — напишем вам на указанный email.
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

      <div className="p-4 rounded-xl mb-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
          Знаете место, где подают отличные настойки? Оставьте ссылку и короткое описание — мы проверим
          и добавим на карту. Не нужно искать координаты или собирать отзывы, мы сделаем это сами.
        </p>
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
          <Label className="text-sm">Ссылка на заведение</Label>
          <div className="relative mt-1">
            <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Сайт или ссылка на Яндекс.Карты" className="pl-9" />
          </div>
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
