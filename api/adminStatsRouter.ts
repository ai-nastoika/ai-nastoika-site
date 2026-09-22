import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { feedback, userRecipeSubmissions, placeSubmissions, aiUsage, siteVisits } from "@db/schema";
import { eq, count, and, ne, desc, gte, sql, inArray } from "drizzle-orm";

// Все requestType, которые считаются "генерацией изображения" — раньше тут
// была только этикетка, теперь картинки рецептов из ИИ-парсера тоже сюда
// пишут (api/recipeParser.ts), иначе indicator в админке их не видел.
// label_revision (доработка готовой этикетки, см. labelGeneratorRouter.ts) раньше
// не входила в список — правки не попадали ни в imageHealth, ни в статистику ниже,
// хотя это такое же обращение к тому же сервису генерации изображений.
const IMAGE_REQUEST_TYPES = ["label_image", "recipe_parser_image", "label_photo_edit", "label_revision"];

// Отдельно — только про этикетки (для новой статистики по дням ниже): recipe_parser_image
// сюда не входит, это картинки из парсера рецептов, а не генератор этикеток.
const LABEL_REQUEST_TYPES = ["label_image", "label_photo_edit", "label_revision"];

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

  /* ── Статус генерации изображений (этикетки) — отдельно от текстовых моделей,
     у картинок нет резервной модели, поэтому здесь смотрим именно успех/провал. ── */
  imageHealth: adminQuery.query(async () => {
    const db = getDb();

    const [lastAttempt] = await db
      .select({ failed: aiUsage.failed, createdAt: aiUsage.createdAt })
      .from(aiUsage)
      .where(inArray(aiUsage.requestType, IMAGE_REQUEST_TYPES))
      .orderBy(desc(aiUsage.createdAt))
      .limit(1);

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [hourStats] = await db
      .select({
        total: count(),
        failedCount: sql<number>`sum(${aiUsage.failed})`,
      })
      .from(aiUsage)
      .where(and(inArray(aiUsage.requestType, IMAGE_REQUEST_TYPES), gte(aiUsage.createdAt, hourAgo)));

    return {
      lastAttemptFailed: lastAttempt?.failed === 1,
      lastAttemptAt: lastAttempt?.createdAt ?? null,
      attemptsLastHour: Number(hourStats?.total ?? 0),
      failedAttemptsLastHour: Number(hourStats?.failedCount ?? 0),
    };
  }),

  /* ── Генерации этикеток по дням (создание с нуля + по фото + доработка) ──
     В отличие от imageHealth (только последний час, для индикатора "не упало ли"),
     здесь — за какой угодно период и по дням, с полными датами на каждой строке. */
  labelStats: adminQuery.query(async () => {
    const db = getDb();
    const date30 = new Date(Date.now() - 29 * 86400_000);

    const [totals] = await db
      .select({
        count: count(),
        failedCount: sql<number>`sum(${aiUsage.failed})`,
        revenueKopecks: sql<number>`COALESCE(sum(${aiUsage.costKopecks}), 0)`,
      })
      .from(aiUsage)
      .where(inArray(aiUsage.requestType, LABEL_REQUEST_TYPES));

    // По дням за последние 30 — с разбивкой на "создано" (с нуля/по фото) и "доработано"
    // (правки), плюс сколько из них не удалось. sql.raw("date(...)") — group by day
    // независимо от времени суток запроса.
    const dayExpr = sql<string>`date(${aiUsage.createdAt})`;
    const rows = await db
      .select({
        day: dayExpr,
        generated: sql<number>`sum(case when ${aiUsage.requestType} in ('label_image','label_photo_edit') then 1 else 0 end)`,
        revised: sql<number>`sum(case when ${aiUsage.requestType} = 'label_revision' then 1 else 0 end)`,
        failed: sql<number>`sum(${aiUsage.failed})`,
        revenueKopecks: sql<number>`COALESCE(sum(${aiUsage.costKopecks}), 0)`,
      })
      .from(aiUsage)
      .where(and(inArray(aiUsage.requestType, LABEL_REQUEST_TYPES), gte(aiUsage.createdAt, date30)))
      .groupBy(dayExpr)
      .orderBy(desc(dayExpr));

    return {
      totalCount: Number(totals?.count ?? 0),
      totalFailed: Number(totals?.failedCount ?? 0),
      totalRevenueKopecks: Number(totals?.revenueKopecks ?? 0),
      // Только дни, где реально что-то было — в отличие от посещаемости, генерации
      // случаются не каждый день, и заполнять таблицу нулевыми днями незачем.
      daily: rows.map((r) => ({
        day: r.day,
        generated: Number(r.generated),
        revised: Number(r.revised),
        failed: Number(r.failed),
        revenueKopecks: Number(r.revenueKopecks),
      })),
    };
  }),

  /* ── Собственный счётчик посещений (серверный, не режется блокировщиками) ──
     Возвращает: суммарные цифры за всё время, сегодня, за 7 и 30 дней, и ряд
     по дням за последние 30 дней для графика. См. api/lib/visitCounter.ts. */
  visitStats: adminQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const date30 = new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10);
    const date7 = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);

    // Всё время — суммарно.
    const [totals] = await db
      .select({
        pageviews: sql<number>`COALESCE(SUM(${siteVisits.pageviews}), 0)`,
        visits: sql<number>`COALESCE(SUM(${siteVisits.visits}), 0)`,
      })
      .from(siteVisits);

    // Последние 30 дней — по дням (для графика и для сумм за 7/30 дней).
    const rows = await db
      .select({ day: siteVisits.day, pageviews: siteVisits.pageviews, visits: siteVisits.visits })
      .from(siteVisits)
      .where(gte(siteVisits.day, date30))
      .orderBy(siteVisits.day);

    const todayRow = rows.find((r) => r.day === today);
    const sum = (from: string, key: "pageviews" | "visits") =>
      rows.filter((r) => r.day >= from).reduce((acc, r) => acc + Number(r[key]), 0);

    return {
      totalPageviews: Number(totals?.pageviews ?? 0),
      totalVisits: Number(totals?.visits ?? 0),
      todayPageviews: Number(todayRow?.pageviews ?? 0),
      todayVisits: Number(todayRow?.visits ?? 0),
      last7Pageviews: sum(date7, "pageviews"),
      last7Visits: sum(date7, "visits"),
      last30Pageviews: sum(date30, "pageviews"),
      last30Visits: sum(date30, "visits"),
      daily: rows.map((r) => ({ day: r.day, pageviews: Number(r.pageviews), visits: Number(r.visits) })),
    };
  }),
});
