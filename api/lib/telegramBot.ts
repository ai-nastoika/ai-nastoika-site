/**
 * Логика бота: что отвечать на сообщения, пришедшие на вебхук.
 *
 * Бот намеренно маленький — «личный подсказчик» по трекеру:
 *   /start <код>  — привязать этот чат к аккаунту на сайте
 *   /list         — ближайшие дела по активным настойкам
 *   /stop         — отключить напоминания в Telegram
 *   /help         — краткая справка
 * Любые другие сообщения получают подсказку со списком команд.
 */
import { and, asc, eq, gt, ne } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { infusions, infusionStages, users } from "@db/schema";
import { escapeHtml, sendTelegramMessage } from "./telegram";
import { STAGE_LABELS } from "./trackerReminders";

const SITE_URL = (process.env.SITE_URL || "https://ai-nastoika.ru").replace(/\/+$/, "");
const TRACKER_URL = `${SITE_URL}/profile?tab=tracker`;

type TgUpdate = {
  message?: {
    text?: unknown;
    chat?: { id?: unknown; type?: unknown };
  };
};

const HELP = [
  "Я напоминаю о делах по вашим настойкам: когда взболтать, процедить, попробовать.",
  "",
  "/list — ближайшие дела",
  "/stop — отключить напоминания здесь",
  "",
  `Подключить бота к аккаунту можно в трекере на сайте: ${TRACKER_URL}`,
].join("\n");

function moscowDayKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" }); // YYYY-MM-DD
}

function whenLabel(planned: Date, now: Date): string {
  const p = moscowDayKey(planned);
  const today = moscowDayKey(now);
  if (p < today) return "просрочено";
  if (p === today) return "сегодня";
  if (p === moscowDayKey(new Date(now.getTime() + 24 * 3600 * 1000))) return "завтра";
  return planned.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit" });
}

async function findUserByChat(chatId: string) {
  const db = getDb();
  return db.query.users.findFirst({ where: eq(users.telegramChatId, chatId) });
}

async function handleLink(chatId: string, code: string): Promise<string> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: and(eq(users.telegramLinkCode, code), gt(users.telegramLinkExpires, new Date())),
  });
  if (!user) {
    return "Ссылка устарела или уже использована. Откройте трекер на сайте и нажмите «Подключить Telegram» ещё раз.";
  }
  // Один чат — один аккаунт: если этот Telegram раньше был привязан к другому
  // аккаунту, снимаем старую привязку, чтобы напоминания не уходили двоим.
  await db.update(users).set({ telegramChatId: null }).where(and(eq(users.telegramChatId, chatId), ne(users.id, user.id)));
  await db
    .update(users)
    .set({ telegramChatId: chatId, telegramLinkCode: null, telegramLinkExpires: null, notifyTelegram: 1 })
    .where(eq(users.id, user.id));
  return [
    "✅ Готово! Теперь напоминания по вашим настойкам будут приходить сюда.",
    "",
    "/list — посмотреть ближайшие дела",
    "/stop — отключить",
  ].join("\n");
}

async function handleList(chatId: string): Promise<string> {
  const user = await findUserByChat(chatId);
  if (!user) {
    return `Этот чат пока не подключён к аккаунту. Сделайте это в трекере на сайте: ${TRACKER_URL}`;
  }
  const db = getDb();
  const rows = await db
    .select({
      plannedDate: infusionStages.plannedDate,
      stageType: infusionStages.type,
      infusionName: infusions.name,
    })
    .from(infusionStages)
    .innerJoin(infusions, eq(infusionStages.infusionId, infusions.id))
    .where(and(eq(infusions.userId, user.id), eq(infusions.status, "active"), eq(infusionStages.status, "upcoming")))
    .orderBy(asc(infusionStages.plannedDate))
    .limit(8);

  if (rows.length === 0) {
    return `Ближайших дел нет — ни одной активной настойки. Поставить новую можно на сайте: ${SITE_URL}/recipes`;
  }
  const now = new Date();
  const lines = rows.map((r) => {
    const label = STAGE_LABELS[r.stageType] ?? r.stageType;
    return `• ${whenLabel(new Date(r.plannedDate), now)} — <b>${escapeHtml(r.infusionName)}</b>: ${escapeHtml(label)}`;
  });
  return ["<b>Ближайшие дела:</b>", ...lines].join("\n");
}

async function handleStop(chatId: string): Promise<string> {
  const user = await findUserByChat(chatId);
  if (!user) return "Этот чат и так не подключён.";
  const db = getDb();
  await db.update(users).set({ telegramChatId: null }).where(eq(users.id, user.id));
  return "Отключил. Вернуть напоминания можно в любой момент в трекере на сайте.";
}

/** Разбор одного входящего обновления. Не бросает: ошибки логируются. */
export async function handleTelegramUpdate(update: unknown): Promise<void> {
  try {
    const msg = (update as TgUpdate | null)?.message;
    const text = typeof msg?.text === "string" ? msg.text.trim().slice(0, 200) : "";
    const chatIdRaw = msg?.chat?.id;
    // Работаем только в личных чатах — бота могли добавить в группу.
    if (msg?.chat?.type !== "private" || (typeof chatIdRaw !== "number" && typeof chatIdRaw !== "string")) return;
    const chatId = String(chatIdRaw);

    // "/cmd@botname arg" -> cmd, arg
    const m = /^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+(.*))?$/.exec(text);
    const cmd = m?.[1]?.toLowerCase();
    const arg = (m?.[2] ?? "").trim();

    let reply: string;
    if (cmd === "start" && /^[A-Za-z0-9_-]{8,64}$/.test(arg)) {
      reply = await handleLink(chatId, arg);
    } else if (cmd === "start") {
      const user = await findUserByChat(chatId);
      reply = user ? "Вы уже подключены 👌 Команда /list покажет ближайшие дела.\n\n" + HELP : HELP;
    } else if (cmd === "list") {
      reply = await handleList(chatId);
    } else if (cmd === "stop") {
      reply = await handleStop(chatId);
    } else {
      reply = HELP;
    }
    // Все ответы уже безопасны для HTML-режима: пользовательские данные
    // (названия настоек) экранированы выше, в статичных текстах нет < > &.
    await sendTelegramMessage(chatId, reply);
  } catch (err) {
    console.error("[telegram-bot] ошибка обработки сообщения:", err);
  }
}
