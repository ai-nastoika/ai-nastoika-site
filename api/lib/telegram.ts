/**
 * Тонкий клиент Telegram Bot API (без внешних зависимостей — хватает fetch).
 *
 * Все функции НЕ бросают исключений: сеть до api.telegram.org может быть
 * недоступна или медленной, и это не должно ронять ни рассылку напоминаний,
 * ни обработку вебхука — возвращаем статус, а вызывающий решает, что делать.
 */
import { createHash } from "node:crypto";
import { env } from "./env";

export function isTelegramConfigured(): boolean {
  return !!env.telegramBotToken;
}

/** Задан свой TELEGRAM_API_BASE (прокси) — значит, напрямую до Telegram с
 *  сервера не достучаться, и обратно, скорее всего, тоже: Telegram не сможет
 *  вызвать наш вебхук. Тогда новые сообщения получаем сами, запросами
 *  getUpdates через тот же прокси (см. telegramPolling.ts). */
export function telegramUsesPolling(): boolean {
  return env.telegramApiBase !== "https://api.telegram.org";
}

/** Секрет для заголовка X-Telegram-Bot-Api-Secret-Token. Выводим из токена
 *  бота, чтобы не заводить ещё одну переменную в .env: сменился токен —
 *  сменился и секрет, а подделать запрос без знания токена нельзя. */
export function telegramWebhookSecret(): string {
  return createHash("sha256").update(`ai-nastoika-tg:${env.telegramBotToken}`).digest("hex").slice(0, 48);
}

type TgResponse<T> = { ok: boolean; result?: T; description?: string; error_code?: number };

async function tgCall<T = unknown>(method: string, payload: Record<string, unknown> = {}, timeoutMs = 10_000): Promise<TgResponse<T>> {
  if (!env.telegramBotToken) return { ok: false, description: "TELEGRAM_BOT_TOKEN не задан" };
  try {
    const res = await fetch(`${env.telegramApiBase}/bot${env.telegramBotToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json().catch(() => null)) as TgResponse<T> | null;
    if (data && typeof data.ok === "boolean") return data;
    return { ok: false, error_code: res.status, description: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : String(err) };
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// username бота нужен для ссылки t.me/<username>?start=<код>. Узнаём через
// getMe один раз и запоминаем; при неудаче не кэшируем (попробуем при
// следующем обращении).
let cachedUsername: string | null = null;
export async function getBotUsername(): Promise<string | null> {
  if (cachedUsername) return cachedUsername;
  const r = await tgCall<{ username?: string }>("getMe", {}, 7_000);
  if (r.ok && r.result?.username) {
    cachedUsername = r.result.username;
    return cachedUsername;
  }
  return null;
}

export type SendResult = "ok" | "blocked" | "error";

export type InlineButton = { text: string; url: string } | { text: string; callback_data: string };
export type InlineKeyboard = InlineButton[][];

function classify(r: TgResponse<unknown>, what: string): SendResult {
  if (r.ok) return "ok";
  const d = (r.description ?? "").toLowerCase();
  if (r.error_code === 403 || d.includes("bot was blocked") || d.includes("chat not found") || d.includes("user is deactivated")) {
    return "blocked";
  }
  console.error(`[telegram] ${what} не удалось:`, r.error_code, r.description);
  return "error";
}

/** "blocked" — пользователь заблокировал бота / удалил чат: привязку пора
 *  снять, иначе будем безуспешно стучаться каждые 5 минут. */
export async function sendTelegramMessage(chatId: string, html: string, keyboard?: InlineKeyboard): Promise<SendResult> {
  const r = await tgCall("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(keyboard && keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
  return classify(r, "sendMessage");
}

/** Ответ на нажатие инлайн-кнопки: без него у пользователя «крутится часики».
 *  text — всплывающая подсказка вверху экрана. */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await tgCall("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text: text.slice(0, 190) } : {}) }, 7_000);
}

/** Меняет кнопки под уже отправленным сообщением (пустой список — убирает все). */
export async function editMessageKeyboard(chatId: string, messageId: number, keyboard: InlineKeyboard): Promise<void> {
  await tgCall(
    "editMessageReplyMarkup",
    { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } },
    7_000
  );
}

/** Подсказки команд в меню бота. Идемпотентно. */
export async function registerTelegramCommands(): Promise<void> {
  await tgCall("setMyCommands", {
    commands: [
      { command: "list", description: "Ближайшие дела по настойкам" },
      { command: "find", description: "Найти рецепт: /find вишня" },
      { command: "new", description: "Свежие рецепты" },
      { command: "stop", description: "Отключить напоминания в Telegram" },
      { command: "help", description: "Как это работает" },
    ],
  });
}

/** Регистрирует вебхук и подсказки команд. Вызывается при старте сервера;
 *  операция идемпотентна, повторный запуск ничего не ломает. */
export async function registerTelegramWebhook(siteUrl: string): Promise<boolean> {
  const url = `${siteUrl.replace(/\/+$/, "")}/api/webhooks/telegram`;
  const r = await tgCall("setWebhook", {
    url,
    secret_token: telegramWebhookSecret(),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  if (!r.ok) {
    console.error("[telegram] setWebhook не удался:", r.error_code, r.description);
    return false;
  }
  await registerTelegramCommands();
  console.log(`[telegram] вебхук зарегистрирован: ${url}`);
  return true;
}

/** Снимает вебхук: пока он установлен, Telegram не отдаёт getUpdates.
 *  Непрочитанные сообщения не теряются (drop_pending_updates: false). */
export async function deleteTelegramWebhook(): Promise<boolean> {
  const r = await tgCall("deleteWebhook", { drop_pending_updates: false });
  if (!r.ok) console.error("[telegram] deleteWebhook не удался:", r.error_code, r.description);
  return r.ok;
}

export type TgUpdate = { update_id: number } & Record<string, unknown>;

/** Длинный опрос: Telegram держит запрос до timeoutSec секунд и отвечает сразу,
 *  как только появилось новое сообщение. */
export async function getTelegramUpdates(
  offset: number,
  timeoutSec: number
): Promise<{ ok: boolean; updates: TgUpdate[]; errorCode?: number; description?: string }> {
  const r = await tgCall<TgUpdate[]>(
    "getUpdates",
    { offset, timeout: timeoutSec, allowed_updates: ["message", "callback_query"] },
    (timeoutSec + 15) * 1000
  );
  return { ok: r.ok, updates: r.ok && Array.isArray(r.result) ? r.result : [], errorCode: r.error_code, description: r.description };
}
