import { useState } from "react";
import { Link } from "react-router";
import { Lightbulb, Check, RefreshCw } from "lucide-react";
import { trpc } from "@/providers/trpc";
import BottleThinkingIndicator from "@/components/BottleThinkingIndicator";

/* «Не знаю, что нарисовать»: человек пишет, для кого этикетка и по какому поводу,
   текстовый ИИ предлагает несколько сюжетов, выбранный подставляется в описание
   (и в название/подпись, если те ещё пустые — решает родитель в onApply).
   Один и тот же помощник работает в обоих режимах страницы; в режиме "photo" меняются
   только тексты и стиль формулировки сюжета (герой — человек с будущего фото). Само фото
   подсказчику не нужно и не отправляется: просить сюжет можно ещё до его загрузки.
   Подсказки бесплатны, но ограничены по частоте на сервере. */

export type LabelIdea = { concept: string; description: string; title: string; subtitle: string };

const TONES = ["Тёплый", "Шутливый", "Торжественный", "Ностальгический", "Дерзкий"];
const MAX_EXCLUDE = 12;

const COPY = {
  scratch: {
    toggle: "Не знаю, что нарисовать — подскажите сюжет",
    label: "Для кого этикетка, по какому поводу, что хотите сказать?",
    placeholder: "Например: подарок тестю на 60-летие. Он рыбак и любит шутки. Хочу сказать, что мы его ценим и желаем хорошего клёва.",
    applied: "Подставлено в описание",
  },
  photo: {
    toggle: "Не знаю, какой сюжет выбрать — подскажите",
    label: "Для кого этикетка, по какому поводу, что хотите сказать?",
    placeholder: "Например: коллеге, ей 40, заводная, работает в офисе, готовит отчёты, всем помогает, любит шутки и сюрпризы.",
    applied: "Подставлено в поле «Что сделать с фото»",
  },
} as const;

export default function LabelIdeasHelper({
  isLoggedIn,
  title,
  onApply,
  mode = "scratch",
}: {
  isLoggedIn: boolean;
  title: string;
  onApply: (idea: LabelIdea) => void;
  mode?: "scratch" | "photo";
}) {
  const copy = COPY[mode];
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState("");
  const [ideas, setIdeas] = useState<LabelIdea[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);
  const [error, setError] = useState("");

  const suggest = trpc.labelGenerator.suggestIdeas.useMutation({
    onSuccess: (r) => {
      setIdeas(r.ideas);
      setSeen((prev) => [...prev, ...r.ideas.map((i) => i.concept)].slice(-MAX_EXCLUDE));
      setAppliedIdx(null);
      setError("");
    },
    onError: (e) => setError(e.message),
  });

  const ask = (more: boolean) => {
    setError("");
    suggest.mutate({
      brief: brief.trim(),
      title: title.trim() || undefined,
      tone: tone || undefined,
      exclude: more && seen.length > 0 ? seen : undefined,
      mode,
    });
  };

  const box = { background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)" };

  return (
    <div className="rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-left"
        style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
      >
        <Lightbulb size={16} className="shrink-0" />
        <span>{copy.toggle}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {!isLoggedIn ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
              <Link to="/login?next=%2Flabel%2Fgenerate" className="underline" style={{ color: "var(--accent)" }}>
                Войдите
              </Link>
              , и ИИ предложит несколько сюжетов под ваш повод. Это бесплатно.
            </p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                  {copy.label}
                </label>
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  maxLength={400}
                  placeholder={copy.placeholder}
                  className="w-full rounded-lg px-3 py-2.5 text-base outline-none resize-none"
                  style={{ ...box, minHeight: 84 }}
                />
              </div>

              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Тон (по желанию)</div>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(tone === t ? "" : t)}
                      aria-pressed={tone === t}
                      className="px-3 py-1 rounded-lg text-sm transition-all"
                      style={{
                        background: tone === t ? "var(--accent)" : "var(--bg-primary)",
                        color: tone === t ? "#fff" : "var(--text-secondary)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => ask(false)}
                disabled={brief.trim().length < 5 || suggest.isPending}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                Предложить сюжеты
              </button>

              {suggest.isPending && <BottleThinkingIndicator label="Придумываю сюжеты..." />}
              {error && <p className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}

              {!suggest.isPending && ideas.length > 0 && (
                <div className="space-y-2.5">
                  {ideas.map((idea, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: "var(--bg-card)", border: `1px solid ${appliedIdx === i ? "var(--accent)" : "var(--border)"}` }}>
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>{idea.concept}</div>
                      <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{idea.description}</p>
                      {(idea.title || idea.subtitle) && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                          Надпись: {idea.title && `«${idea.title}»`}{idea.title && idea.subtitle && " · "}{idea.subtitle && `«${idea.subtitle}»`}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => { onApply(idea); setAppliedIdx(i); }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
                        style={{
                          background: appliedIdx === i ? "var(--surface)" : "var(--accent)",
                          color: appliedIdx === i ? "var(--accent)" : "#fff",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {appliedIdx === i ? <><Check size={14} /> {copy.applied}</> : "Использовать"}
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => ask(true)}
                    className="inline-flex items-center gap-1.5 text-sm underline"
                    style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
                  >
                    <RefreshCw size={14} /> Ещё варианты
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
