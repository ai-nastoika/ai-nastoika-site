import { z } from "zod";
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { checkRateLimit } from "./lib/rateLimit";
import { getBotUsername, isTelegramConfigured, sendTelegramMessage } from "./lib/telegram";

const LINK_TTL_MS = 15 * 60 * 1000;

/** Способы напоминаний трекера: почта и Telegram. */
export const notifyRouter = createRouter({
  settings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const u = await db.query.users.findFirst({ where: eq(users.id, ctx.user.id) });
    if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "Пользователь не найден" });
    const available = isTelegramConfigured();
    return {
      email: { enabled: u.notifyEmail === 1, address: u.email },
      telegram: {
        // available=false — бот на сервере не настроен: блок в интерфейсе скрываем.
        available,
        linked: !!u.telegramChatId,
        enabled: u.notifyTelegram === 1,
        botUsername: available ? await getBotUsername() : null,
      },
    };
  }),

  setChannels: authedQuery
    .input(z.object({ email: z.boolean().optional(), telegram: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const patch: { notifyEmail?: number; notifyTelegram?: number } = {};
      if (input.email !== undefined) patch.notifyEmail = input.email ? 1 : 0;
      if (input.telegram !== undefined) patch.notifyTelegram = input.telegram ? 1 : 0;
      if (Object.keys(patch).length === 0) return { ok: true };
      await getDb().update(users).set(patch).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),

  /** Создаёт одноразовую ссылку t.me/<бот>?start=<код>. Привязка завершается,
   *  когда пользователь нажимает «Запустить» в Telegram (см. telegramBot.ts). */
  telegramLink: authedQuery.mutation(async ({ ctx }) => {
    if (!isTelegramConfigured()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Telegram-бот пока не настроен" });
    }
    const rl = checkRateLimit(`tg-link:${ctx.user.id}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Слишком часто, попробуйте через несколько минут" });
    }
    const username = await getBotUsername();
    if (!username) {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Не удалось связаться с Telegram, попробуйте позже" });
    }
    const code = randomBytes(12).toString("hex"); // 24 символа, 96 бит
    const expires = new Date(Date.now() + LINK_TTL_MS);
    await getDb().update(users).set({ telegramLinkCode: code, telegramLinkExpires: expires }).where(eq(users.id, ctx.user.id));
    return { url: `https://t.me/${username}?start=${code}`, expiresAt: expires };
  }),

  telegramUnlink: authedQuery.mutation(async ({ ctx }) => {
    await getDb()
      .update(users)
      .set({ telegramChatId: null, telegramLinkCode: null, telegramLinkExpires: null })
      .where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),

  /** Кнопка «Отправить проверочное сообщение» — чтобы сразу убедиться, что связь работает. */
  telegramTest: authedQuery.mutation(async ({ ctx }) => {
    const rl = checkRateLimit(`tg-test:${ctx.user.id}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Слишком часто, попробуйте через несколько минут" });
    }
    const u = await getDb().query.users.findFirst({ where: eq(users.id, ctx.user.id) });
    if (!u?.telegramChatId) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Telegram не подключён" });
    }
    const r = await sendTelegramMessage(u.telegramChatId, "🍹 Проверка связи: напоминания трекера будут приходить сюда.");
    if (r === "blocked") {
      await getDb().update(users).set({ telegramChatId: null }).where(eq(users.id, u.id));
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Бот заблокирован в Telegram — подключите заново" });
    }
    if (r !== "ok") {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Не удалось отправить сообщение, попробуйте позже" });
    }
    return { ok: true };
  }),
});
