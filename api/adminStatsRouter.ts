import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { feedback, userRecipeSubmissions, placeSubmissions, aiUsage } from "@db/schema";
import { eq, count, and, ne, desc, gte, sql } from "drizzle-orm";

export const adminStatsRouter = createRouter({
  /* ── Сводный счётчик для бейджа на кнопке "Админка" в шапке ──
     Новые обращения (не архивные и не отвеченные) + рецепты и заведения на модерации. */
  pendingCount: adminQuery.query(async () => {
    const db = getDb();

    const [feedbackRows, recipeSubmissionRows, placeSubmissionRows] = await Promise.all([
      db
        .select({ value: count() })
        .from(feedback)
        .where(and(ne(feedback.status, "replied"), ne(feedback.status, "archived"))),
      db.select({ value: count() }).from(userRecipeSubmissions).where(eq(userRecipeSubmissions.status, "pending")),
      db.select({ value: count() }).from(placeSubmissions).where(eq(placeSubmissions.status, "pending")),
    ]);

    const feedbackCount = Number(feedbackRows[0]?.value ?? 0);
    const recipeCount = Number(recipeSubmissionRows[0]?.value ?? 0);
    const placeCount = Number(placeSubmissionRows[0]?.value ?? 0);

    return {
      feedback: feedbackCount,
      recipes: recipeCount,
      places: placeCount,
      total: feedbackCount + recipeCount + placeCount,
    };
  }),

  /* ── Статус ИИ-моделей: не переключились ли недавно на резервную ──
     Смотрим последний реальный запрос и статистику за последний час,
     чтобы отличить разовый сбой от систематической проблемы с основной моделью. */
  aiHealth: adminQuery.query(async () => {
    const db = getDb();

    const [lastRequest] = await db
      .select({ modelUsed: aiUsage.modelUsed, usedFallback: aiUsage.usedFallback, createdAt: aiUsage.createdAt })
      .from(aiUsage)
      .orderBy(desc(aiUsage.createdAt))
      .limit(1);

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [hourStats] = await db
      .select({
        total: count(),
        fallbackCount: sql<number>`sum(${aiUsage.usedFallback})`,
      })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, hourAgo));

    return {
      lastRequestUsedFallback: lastRequest?.usedFallback === 1,
      lastRequestModel: lastRequest?.modelUsed ?? null,
      lastRequestAt: lastRequest?.createdAt ?? null,
      requestsLastHour: Number(hourStats?.total ?? 0),
      fallbackRequestsLastHour: Number(hourStats?.fallbackCount ?? 0),
    };
  }),
});
