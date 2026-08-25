import { z } from "zod";
import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { donations } from "@db/schema";
import { createDonationPayment, isPaymentsConfigured } from "./lib/payments";
import { env } from "./lib/env";

/* Пресеты сумм для кнопок «Поддержать». Донат — не тарифная сущность,
   поэтому сумма может быть любой (валидируем только разумные границы). */
const DONATION_PRESETS_RUB = [200, 500, 1000] as const;

export const donationRouter = createRouter({
  /* ── Доступность приёма донатов + пресеты сумм ──
     directTransfer — реквизиты для перевода по СБП мимо ЮKassa (см. env.ts,
     почему это не жёстко зашито в код). Сайт не узнаёт о таких переводах —
     это просто отображение реквизитов, аналог "написать номер на бумажке". */
  info: publicQuery.query(() => ({
    paymentsConfigured: isPaymentsConfigured(),
    presetsRub: DONATION_PRESETS_RUB,
    directTransfer: env.donationPhoneNumber
      ? {
          phoneNumber: env.donationPhoneNumber,
          ownerName: env.donationPhoneOwner || undefined,
          bank: env.donationPhoneBank || undefined,
        }
      : null,
  })),

  /* ── Публичный список последних донатов — для страницы благодарности ── */
  recent: publicQuery
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: donations.id,
          name: donations.name,
          amountKopecks: donations.amountKopecks,
          message: donations.message,
          createdAt: donations.createdAt,
        })
        .from(donations)
        .orderBy(desc(donations.createdAt))
        .limit(input?.limit ?? 20);
      return rows;
    }),

  /* ── Создать платёж-донат. Авторизация НЕ обязательна ── */
  create: publicQuery
    .input(
      z.object({
        amountRub: z.number().min(10).max(100000),
        name: z.string().max(100).optional(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isPaymentsConfigured()) {
        throw new Error("Приём платежей пока не настроен на сервере. Попробуйте позже.");
      }

      // SITE_URL — та же переменная, что и в balanceRouter.ts/api/router.ts.
      // Если не задана — фоллбэк на dev-домен, чтобы не ломать текущую разработку.
      const siteUrl = process.env.SITE_URL || "https://dev.ai-nastoika.ru";
      const returnUrl = `${siteUrl}/rules?donation=done`;

      const payment = await createDonationPayment({
        amountRub: input.amountRub,
        returnUrl,
        idempotenceKey: randomUUID(),
        donorUserId: ctx.user?.id, // если человек залогинен — привяжем донат и выдадим значок
        name: input.name,
        message: input.message,
      });

      return { confirmationUrl: payment.confirmationUrl, paymentId: payment.paymentId };
    }),
});
