import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Send, Loader2, CheckCircle2 } from "lucide-react";

/* Блок «Как напоминать» в трекере: почта и Telegram.
   Telegram показывается, только если бот настроен на сервере (settings.telegram.available).
   Подключение: «Подключить» → открывается t.me/<бот>?start=<код> → пользователь жмёт
   «Запустить» → бот привязывает чат (api/lib/telegramBot.ts), а мы, пока ждём,
   раз в 3 секунды опрашиваем настройки и замечаем, что привязка состоялась. */

const POLL_MS = 3000;
const WAIT_LIMIT_MS = 15 * 60 * 1000; // как и срок жизни кода на сервере

export default function ReminderChannels() {
  const utils = trpc.useUtils();
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [testOk, setTestOk] = useState(false);

  // Пока ждём подтверждения в Telegram — раз в POLL_MS перезапрашиваем настройки;
  // как только в ответе появилась привязка, опрос сам прекращается.
  const { data } = trpc.notify.settings.useQuery(undefined, {
    refetchInterval: (q) => (waitingSince !== null && !q.state.data?.telegram.linked ? POLL_MS : false),
  });

  const refresh = () => utils.notify.settings.invalidate();
  const setChannels = trpc.notify.setChannels.useMutation({
    onSuccess: refresh,
    onError: (e) => setError(e.message),
  });
  const link = trpc.notify.telegramLink.useMutation({
    onSuccess: (r) => {
      setLinkUrl(r.url);
      setWaitingSince(Date.now());
      setError("");
      // Может быть заблокировано как «всплывающее окно» — поэтому ниже есть и обычная ссылка.
      window.open(r.url, "_blank", "noopener,noreferrer");
    },
    onError: (e) => setError(e.message),
  });
  const unlink = trpc.notify.telegramUnlink.useMutation({
    onSuccess: () => {
      setTestOk(false);
      setWaitingSince(null);
      setLinkUrl(null);
      refresh();
    },
    onError: (e) => setError(e.message),
  });
  const test = trpc.notify.telegramTest.useMutation({
    onSuccess: () => {
      setError("");
      setTestOk(true);
    },
    onError: (e) => {
      setTestOk(false);
      setError(e.message);
      refresh();
    },
  });

  const linked = !!data?.telegram.linked;
  const waiting = waitingSince !== null && !linked;

  // Код на сервере живёт 15 минут — по истечении перестаём ждать.
  useEffect(() => {
    if (waitingSince === null) return;
    const left = Math.max(WAIT_LIMIT_MS - (Date.now() - waitingSince), 0);
    const t = setTimeout(() => {
      setWaitingSince(null);
      setLinkUrl(null);
    }, left);
    return () => clearTimeout(t);
  }, [waitingSince]);

  if (!data) return null;

  const tg = data.telegram;
  const noChannel = !data.email.enabled && !(tg.available && tg.linked && tg.enabled);
  const rowStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" };
  const switchCls = "data-[state=checked]:bg-[var(--accent)]";

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Bell size={18} style={{ color: "var(--accent)" }} />
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Как напоминать
        </h3>
      </div>

      <div className="space-y-2">
        {/* Почта */}
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={rowStyle}>
          <div className="flex items-center gap-3 min-w-0">
            <Mail size={20} style={{ color: "var(--text-muted)" }} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Почта</div>
              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{data.email.address}</div>
            </div>
          </div>
          <Switch
            aria-label="Напоминать на почту"
            className={switchCls}
            checked={data.email.enabled}
            disabled={setChannels.isPending}
            onCheckedChange={(v) => setChannels.mutate({ email: v })}
          />
        </div>

        {/* Telegram */}
        {tg.available && (
          <div className="rounded-xl px-4 py-3" style={rowStyle}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Send size={20} style={{ color: "var(--text-muted)" }} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Telegram</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {linked ? "Подключён" : "Сообщение от бота — удобнее, чем письмо"}
                  </div>
                </div>
              </div>
              {linked ? (
                <Switch
                  aria-label="Напоминать в Telegram"
                  className={switchCls}
                  checked={tg.enabled}
                  disabled={setChannels.isPending}
                  onCheckedChange={(v) => setChannels.mutate({ telegram: v })}
                />
              ) : (
                <button
                  onClick={() => link.mutate()}
                  disabled={link.isPending || waiting}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "var(--accent)" }}
                >
                  {link.isPending ? "Создаю ссылку…" : "Подключить"}
                </button>
              )}
            </div>

            {/* Ожидание подтверждения в Telegram */}
            {!linked && waiting && linkUrl && (
              <div className="mt-3 text-sm flex flex-col gap-2" style={{ color: "var(--text-secondary)" }}>
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  <span>Откройте бота в Telegram и нажмите «Запустить». Ждём подтверждения…</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--accent)" }}>
                    Открыть Telegram
                  </a>
                  <button
                    onClick={() => { setWaitingSince(null); setLinkUrl(null); }}
                    className="underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Действия для подключённого */}
            {linked && (
              <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
                <button
                  onClick={() => { setTestOk(false); test.mutate(); }}
                  disabled={test.isPending}
                  className="underline disabled:opacity-60"
                  style={{ color: "var(--accent)" }}
                >
                  {test.isPending ? "Отправляю…" : "Отправить проверочное сообщение"}
                </button>
                <button
                  onClick={() => { if (confirm("Отключить Telegram? Напоминания будут приходить только на почту.")) unlink.mutate(); }}
                  disabled={unlink.isPending}
                  className="underline disabled:opacity-60"
                  style={{ color: "var(--text-muted)" }}
                >
                  Отключить
                </button>
                {testOk && (
                  <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                    <CheckCircle2 size={14} /> Отправлено
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {noChannel && (
        <p className="text-sm mt-3" style={{ color: "#b45309" }}>
          Сейчас все способы выключены — напоминаний не будет.
        </p>
      )}
      {error && (
        <p className="text-sm mt-3" style={{ color: "#dc2626" }}>{error}</p>
      )}
    </div>
  );
}
