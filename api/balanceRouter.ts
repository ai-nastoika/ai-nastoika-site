import { z } from "zod";
import { randomUUID } from "node:crypto";
import { desc, eq, and, notInArray, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { transactions, users, aiUsage } from "@db/schema";
import { AI_REQUEST_COST_KOPECKS, getAiAccessState } from "./lib/aiAccess";
import { createTopupPayment, isPaymentsConfigured } from "./lib/payments";

/* Фиксированные суммы пополнения. Меньше 50 ₽ предлагать не стоит — платёжный
   шлюз берёт комиссию за операцию, при 2 ₽/запрос мелкие пополнения невыгодны. */
const TOPUP_PRESETS_RUB = [100, 300, 500, 1000] as const;

export const balanceRouter = createRouter({
  /* ── Баланс, бесплатные запросы, доступность оплаты ── */
  me: authedQuery.query(async ({ ctx }) => {
    const access = await getAiAccessState(ctx.user.id);

    // Реальное число выполненных ИИ-запросов — раньше в ЛК считали "5 -
    // freeRequestsLeft", что упирается в потолок 5 и замирает там навсегда,
    // как только бесплатные заканчиваются и начинаются платные запросы.
    // Считаем по факту из лога ai_usage. Админский парсер рецептов
    // (recipe_parser/recipe_parser_image) не тарифицируется и не является
    // "личным ИИ-запросом" пользователя — исключаем из этого счётчика.
    const db = getDb();
    const [{ count: totalRequests }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiUsage)
      .where(
        and(
          eq(aiUsage.userId, ctx.user.id),
          notInArray(aiUsage.requestType, ["recipe_parser", "recipe_parser_image"])
        )
      );

    return {
      ...access,
      totalRequests: Number(totalRequests),
      paymentsConfigured: isPaymentsConfigured(),
      topupPresetsRub: TOPUP_PRESETS_RUB,
    };
  }),

  /* ── История пополнений/списаний (для личного кабинета) ── */
  history: authedQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, ctx.user.id))
        .orderBy(desc(transactions.createdAt))
        .limit(input?.limit ?? 20);
      return rows;
    }),

  /* ── Создать платёж на пополнение баланса ── */
  createTopup: authedQuery
    .input(z.object({ amountRub: z.number().min(50).max(50000) }))
    .mutation(async ({ ctx, input }) => {
      if (!isPaymentsConfigured()) {
        throw new Error("Приём платежей пока не настроен на сервере. Попробуйте позже.");
      }

      // SITE_URL — та же переменная, что использует email-верификация (api/router.ts)
      // и трекер-напоминания (api/lib/trackerReminders.ts). Если не задана — фоллбэк
      // на dev-домен, чтобы не ломать текущую разработку.
      const siteUrl = process.env.SITE_URL || "https://dev.ai-nastoika.ru";
      const returnUrl = `${siteUrl}/profile?topup=done`;

      const payment = await createTopupPayment({
        userId: ctx.user.id,
        amountRub: input.amountRub,
        returnUrl,
        idempotenceKey: randomUUID(),
      });

      // Строка "topup_pending" — только для истории/отладки, реальное зачисление
      // делает вебхук ЮKassa (api/boot.ts) через lib/balance.ts::creditTopup,
      // который защищён от повторного зачисления по external_id.
      const db = getDb();
      const [user] = await db.select({ balanceKopecks: users.balanceKopecks }).from(users).where(eq(users.id, ctx.user.id));
      await db.insert(transactions).values({
        userId: ctx.user.id,
        type: "topup_pending",
        amountKopecks: 0,
        balanceAfter: user?.balanceKopecks ?? 0,
        externalId: `pending_${payment.paymentId}`,
        meta: { paymentId: payment.paymentId, amountRub: input.amountRub },
      });

      return { confirmationUrl: payment.confirmationUrl, paymentId: payment.paymentId };
    }),
});

export { AI_REQUEST_COST_KOPECKS };
