/**
 * Логика бота: что отвечать на сообщения и нажатия кнопок.
 *
 *   /start <код>  — привязать этот чат к аккаунту на сайте
 *   /list         — ближайшие дела; под каждым кнопки «Сделано» / «На день»
 *   /find слово   — поиск рецепта (то же работает, если просто написать слово)
 *   /new          — свежие рецепты
 *   /stop         — отключить напоминания в Telegram
 *   /help         — краткая справка
 * Кнопки «Сделано» / «На день» есть и под самими напоминаниями (callback_query).
 */
import { and, asc, desc, eq, gt, like, ne, or } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { infusions, infusionStages, recipes, users } from "@db/schema";
import { answerCallbackQuery, editMessageKeyboard, escapeHtml, sendTelegramMessage, type InlineKeyboard } from "./telegram";
import { stageActionRows } from "./telegramKeyboards";
import { findOpenStageOfUser, markStageDone, postponeStageOneDay } from "./stageActions";
import { STAGE_LABELS } from "./trackerReminders";

const SITE_URL = (process.env.SITE_URL || "https://ai-nastoika.ru").replace(/\/+$/, "");
const TRACKER_URL = `${SITE_URL}/profile?tab=tracker`;

type TgChat = { id?: unknown; type?: unknown };
type TgUpdate = {
  message?: { text?: unknown; chat?: TgChat };
  callback_query?: {
    id?: unknown;
    data?: unknown;
    message?: {
      message_id?: unknown;
      chat?: TgChat;
      reply_markup?: { inline_keyboard?: { callback_data?: string }[][] };
    };
  };
};

type Reply = { text: string; keyboard?: InlineKeyboard };

const HELP = [
  "Я напоминаю о делах по вашим настойкам: когда взболтать, процедить, попробовать — и сразу даю отметить «Сделано» кнопкой.",
  "",
  "/list — ближайшие дела",
  "/find вишня — найти рецепт (можно просто написать слово)",
  "/new — свежие рецепты",
  "/stop — отключить напоминания здесь",
  "",
  `Подключить бота к аккаунту можно в трекере на сайте: ${TRACKER_URL}`,
].join("\n");

const dm = (d: Date) => d.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit" });

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
    "/find вишня — найти рецепт",
    "/stop — отключить",
  ].join("\n");
}

async function handleList(chatId: string): Promise<Reply> {
  const user = await findUserByChat(chatId);
  if (!user) {
    return { text: `Этот чат пока не подключён к аккаунту. Сделайте это в трекере на сайте: ${TRACKER_URL}` };
  }
  const db = getDb();
  const rows = await db
    .select({
      stageId: infusionStages.id,
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
    return { text: `Ближайших дел нет — ни одной активной настойки. Поставить новую можно на сайте: ${SITE_URL}/recipes` };
  }
  const now = new Date();
  const numbered = rows.length > 1;
  const lines = rows.map((r, i) => {
    const label = STAGE_LABELS[r.stageType] ?? r.stageType;
    return `${numbered ? `${i + 1}. ` : "• "}${whenLabel(new Date(r.plannedDate), now)} — <b>${escapeHtml(r.infusionName)}</b>: ${escapeHtml(label)}`;
  });
  return { text: ["<b>Ближайшие дела:</b>", ...lines].join("\n"), keyboard: stageActionRows(rows.map((r) => r.stageId)) };
}

function recipeLines(rows: { slug: string; title: string; categoryLabel: string | null }[]): string[] {
  return rows.map(
    (r) =>
      `• <a href="${SITE_URL}/recipe/${encodeURIComponent(r.slug)}">${escapeHtml(r.title)}</a>${r.categoryLabel ? ` — ${escapeHtml(r.categoryLabel)}` : ""}`
  );
}

async function handleFind(query: string): Promise<string | null> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return null;
  // % и _ в запросе — обычные символы, а не шаблоны LIKE.
  const pat = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await getDb()
    .select({ slug: recipes.slug, title: recipes.title, categoryLabel: recipes.categoryLabel })
    .from(recipes)
    .where(or(like(recipes.title, pat), like(recipes.subtitle, pat)))
    .orderBy(desc(recipes.featured), asc(recipes.title))
    .limit(6);
  if (rows.length === 0) return null;
  return [`<b>Рецепты по запросу «${escapeHtml(q)}»:</b>`, ...recipeLines(rows)].join("\n");
}

async function handleNew(): Promise<string> {
  const rows = await getDb()
    .select({ slug: recipes.slug, title: recipes.title, categoryLabel: recipes.categoryLabel })
    .from(recipes)
    .orderBy(desc(recipes.createdAt), desc(recipes.id))
    .limit(5);
  if (rows.length === 0) return "Рецептов пока нет.";
  return ["<b>Свежие рецепты:</b>", ...recipeLines(rows)].join("\n");
}

async function handleStop(chatId: string): Promise<string> {
  const user = await findUserByChat(chatId);
  if (!user) return "Этот чат и так не подключён.";
  const db = getDb();
  await db.update(users).set({ telegramChatId: null }).where(eq(users.id, user.id));
  return "Отключил. Вернуть напоминания можно в любой момент в трекере на сайте.";
}

/** Нажатие инлайн-кнопки «Сделано» (d:<id>) или «На день» (p:<id>). */
async function handleCallback(cq: NonNullable<TgUpdate["callback_query"]>): Promise<void> {
  const cqId = typeof cq.id === "string" ? cq.id : "";
  if (!cqId) return;
  const chat = cq.message?.chat;
  const chatIdRaw = chat?.id;
  if (chat?.type !== "private" || (typeof chatIdRaw !== "number" && typeof chatIdRaw !== "string")) {
    await answerCallbackQuery(cqId);
    return;
  }
  const chatId = String(chatIdRaw);
  const m = /^([dp]):(\d{1,12})$/.exec(typeof cq.data === "string" ? cq.data : "");
  if (!m) {
    await answerCallbackQuery(cqId);
    return;
  }
  const action = m[1];
  const stageId = Number(m[2]);

  const user = await findUserByChat(chatId);
  if (!user) {
    await answerCallbackQuery(cqId, "Чат не подключён к аккаунту");
    return;
  }

  // Убираем кнопки этого этапа из сообщения — вне зависимости от исхода,
  // чтобы нельзя было нажать повторно.
  const dropRow = async () => {
    const mid = cq.message?.message_id;
    const kb = cq.message?.reply_markup?.inline_keyboard;
    if (typeof mid !== "number" || !Array.isArray(kb)) return;
    const rest = kb.filter((row) => !row.some((b) => b.callback_data === `d:${stageId}` || b.callback_data === `p:${stageId}`));
    await editMessageKeyboard(chatId, mid, rest as InlineKeyboard);
  };

  const found = await findOpenStageOfUser(stageId, user.id);
  if (!found) {
    await answerCallbackQuery(cqId, "Этот этап уже выполнен или перенесён");
    await dropRow();
    return;
  }
  const { stage, infusionName } = found;
  const label = STAGE_LABELS[stage.type] ?? stage.type;

  if (action === "d") {
    const next = await markStageDone(stage);
    await answerCallbackQuery(cqId, `✅ Готово: ${label} — ${infusionName}` + (next ? `\nСледующий раз: ${dm(next)}` : ""));
  } else {
    const newDate = await postponeStageOneDay(stage);
    await answerCallbackQuery(cqId, `⏰ Перенёс на ${dm(newDate)}: ${label} — ${infusionName}`);
  }
  await dropRow();
}

/** Разбор одного входящего обновления. Не бросает: ошибки логируются. */
export async function handleTelegramUpdate(update: unknown): Promise<void> {
  try {
    const up = update as TgUpdate | null;
    if (up?.callback_query) {
      await handleCallback(up.callback_query);
      return;
    }
    const msg = up?.message;
    const text = typeof msg?.text === "string" ? msg.text.trim().slice(0, 200) : "";
    const chatIdRaw = msg?.chat?.id;
    // Работаем только в личных чатах — бота могли добавить в группу.
    if (msg?.chat?.type !== "private" || (typeof chatIdRaw !== "number" && typeof chatIdRaw !== "string")) return;
    const chatId = String(chatIdRaw);

    // "/cmd@botname arg" -> cmd, arg
    const m = /^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+(.*))?$/.exec(text);
    const cmd = m?.[1]?.toLowerCase();
    const arg = (m?.[2] ?? "").trim();

    let reply: Reply;
    if (cmd === "start" && /^[A-Za-z0-9_-]{8,64}$/.test(arg)) {
      reply = { text: await handleLink(chatId, arg) };
    } else if (cmd === "start") {
      const user = await findUserByChat(chatId);
      reply = { text: user ? "Вы уже подключены 👌 Команда /list покажет ближайшие дела.\n\n" + HELP : HELP };
    } else if (cmd === "list") {
      reply = await handleList(chatId);
    } else if (cmd === "find") {
      const found = arg ? await handleFind(arg) : null;
      reply = { text: found ?? (arg ? `По запросу «${escapeHtml(arg.slice(0, 60))}» ничего не нашёл. Попробуйте другое слово.` : "Напишите, что искать, например: /find вишня") };
    } else if (cmd === "new") {
      reply = { text: await handleNew() };
    } else if (cmd === "stop") {
      reply = { text: await handleStop(chatId) };
    } else if (!cmd && text.length >= 3) {
      // Просто слово без команды — считаем поиском по рецептам.
      const found = await handleFind(text);
      reply = { text: found ?? `Рецептов по «${escapeHtml(text.slice(0, 60))}» не нашёл.\n\n${HELP}` };
    } else {
      reply = { text: HELP };
    }
    // Все ответы уже безопасны для HTML-режима: пользовательские данные
    // (названия настоек, запрос) экранированы выше, в статичных текстах нет < > &.
    await sendTelegramMessage(chatId, reply.text, reply.keyboard);
  } catch (err) {
    console.error("[telegram-bot] ошибка обработки сообщения:", err);
  }
}
