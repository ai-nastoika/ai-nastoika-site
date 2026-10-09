/**
 * Получение сообщений бота длинным опросом (getUpdates) — вместо вебхука.
 *
 * Включается, когда задан TELEGRAM_API_BASE (прокси): с такого сервера
 * Telegram обычно не может достучаться до нас сам («Connection timed out»
 * в getWebhookInfo), зато мы до него через прокси — могут. Весь трафик
 * исходящий, открывать порты и настраивать вебхук не нужно.
 *
 * Процесс должен быть один (как и сейчас: pm2 fork): два одновременных
 * getUpdates мешают друг другу, Telegram отвечает 409.
 */
import { deleteTelegramWebhook, getTelegramUpdates, registerTelegramCommands } from "./telegram";
import { handleTelegramUpdate } from "./telegramBot";

const POLL_TIMEOUT_SEC = 25;
const MIN_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function startTelegramPolling(): void {
  void (async () => {
    // Установленный вебхук блокирует getUpdates — снимаем (в т.ч. тот, что
    // остался от прошлых запусков в режиме вебхука).
    await deleteTelegramWebhook();
    await registerTelegramCommands();
    console.log("[telegram] режим опроса (getUpdates) запущен");

    let offset = 0;
    let backoff = MIN_BACKOFF_MS;
    let lastErrorLogged = 0;

    for (;;) {
      const r = await getTelegramUpdates(offset, POLL_TIMEOUT_SEC);
      if (!r.ok) {
        // Сетевые сбои и 409 (во время выкладки на миг работают два процесса)
        // — обычное дело: ждём и пробуем снова, не засоряя лог повторами.
        if (Date.now() - lastErrorLogged > 5 * 60_000) {
          console.error("[telegram] getUpdates не удался:", r.errorCode ?? "", r.description ?? "");
          lastErrorLogged = Date.now();
        }
        if (r.errorCode === 409 && /webhook/i.test(r.description ?? "")) await deleteTelegramWebhook();
        await sleep(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        continue;
      }
      backoff = MIN_BACKOFF_MS;
      for (const u of r.updates) {
        // Сдвигаем offset ДО обработки: если обработчик упадёт, то одно
        // «ядовитое» сообщение не зациклит бота. handleTelegramUpdate сам ловит ошибки.
        offset = u.update_id + 1;
        await handleTelegramUpdate(u);
      }
    }
  })();
}
