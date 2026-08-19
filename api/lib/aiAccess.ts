import { TRPCError } from "@trpc/server";
import { and, eq, gt, gte, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { aiUsage, transactions, users } from "@db/schema";

/**
 * Тарифная политика ИИ-запросов «Ай, настойка»:
 * - Неавторизованным запросы недоступны вообще (проверяется на уровне authedQuery).
 * - Каждый новый аккаунт получает 5 бесплатных запросов (разово, не сгорают по дням).
 * - После того как бесплатные закончились — 2 ₽ за запрос, списываются с баланса
 *   личного кабинета. Недостаточно средств — запрос отклоняется до пополнения.
 */
export const AI_REQUEST_COST_KOPECKS = 200; // 2 ₽

/* Генерация изображений (этикетки) — заметно дороже текстового запроса и без
   бесплатного лимита вообще: раздавать дорогую операцию бесплатно новым
   аккаунтам вместе с общим пулом из 5 бесплатных текстовых запросов рискованно
   для экономики. Всегда списывается с баланса.
   10 ₽ — по реальному расходу на GPT Image 2 (252 вх + 553 исх токена ≈ 2,41 ₽
   при тарифах Timeweb на момент записи), маржа ≈ 76%. Если модель или тарифы
   изменятся — проверьте актуальный расход в панели Timeweb и поправьте константу. */
export const IMAGE_REQUEST_COST_KOPECKS = 1000; // 10 ₽

export type AiCharge = { wasFree: boolean; costKopecks: number };

/**
 * Атомарно резервирует один ИИ-запрос за пользователем: сначала пробует
 * бесплатный лимит, потом баланс. Вызывать ДО обращения к ИИ-провайдеру.
 *
 * Важно: делаем это через `UPDATE ... WHERE <условие> ... `, а не через
 * `db.transaction()` — пул подключается в режиме `planetscale`
 * (db/queries/connection.ts), где многошаговые транзакции не гарантированы.
 * Условный UPDATE атомарен на уровне одной строки и сам по себе защищает от
 * гонки при параллельных запросах одного пользователя (второй запрос просто
 * не найдёт строку, удовлетворяющую WHERE, и упадёт в проверку баланса/отказ).
 */
export async function chargeAiRequest(userId: number): Promise<AiCharge> {
  const db = getDb();

  const [freeResult] = await db
    .update(users)
    .set({ freeRequestsLeft: sql`${users.freeRequestsLeft} - 1` })
    .where(and(eq(users.id, userId), gt(users.freeRequestsLeft, 0)));
  if (freeResult.affectedRows > 0) {
    return { wasFree: true, costKopecks: 0 };
  }

  const [balanceResult] = await db
    .update(users)
    .set({ balanceKopecks: sql`${users.balanceKopecks} - ${AI_REQUEST_COST_KOPECKS}` })
    .where(and(eq(users.id, userId), gte(users.balanceKopecks, AI_REQUEST_COST_KOPECKS)));

  if (balanceResult.affectedRows > 0) {
    const [user] = await db.select({ balanceKopecks: users.balanceKopecks }).from(users).where(eq(users.id, userId));
    await db.insert(transactions).values({
      userId,
      type: "debit",
      amountKopecks: -AI_REQUEST_COST_KOPECKS,
      balanceAfter: user?.balanceKopecks ?? 0,
      meta: { reason: "ai_request" },
    });
    return { wasFree: false, costKopecks: AI_REQUEST_COST_KOPECKS };
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: `Бесплатные запросы закончились, а на балансе меньше ${AI_REQUEST_COST_KOPECKS / 100} ₽. Пополните баланс в личном кабинете, чтобы продолжить.`,
  });
}

/**
 * То же самое, что chargeAiRequest, но без бесплатного лимита — только баланс,
 * фиксированная стоимость IMAGE_REQUEST_COST_KOPECKS. Используется для генерации
 * изображений (этикетки), где операция заметно дороже обычного текстового запроса.
 */
export async function chargeImageRequest(userId: number): Promise<AiCharge> {
  const db = getDb();

  const [balanceResult] = await db
    .update(users)
    .set({ balanceKopecks: sql`${users.balanceKopecks} - ${IMAGE_REQUEST_COST_KOPECKS}` })
    .where(and(eq(users.id, userId), gte(users.balanceKopecks, IMAGE_REQUEST_COST_KOPECKS)));

  if (balanceResult.affectedRows > 0) {
    const [user] = await db.select({ balanceKopecks: users.balanceKopecks }).from(users).where(eq(users.id, userId));
    await db.insert(transactions).values({
      userId,
      type: "debit",
      amountKopecks: -IMAGE_REQUEST_COST_KOPECKS,
      balanceAfter: user?.balanceKopecks ?? 0,
      meta: { reason: "image_request" },
    });
    return { wasFree: false, costKopecks: IMAGE_REQUEST_COST_KOPECKS };
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: `Для генерации изображения нужно минимум ${IMAGE_REQUEST_COST_KOPECKS / 100} ₽ на балансе (бесплатных генераций нет — эта операция дороже обычного запроса). Пополните баланс в личном кабинете.`,
  });
}

/**
 * Откатывает списание, если сам вызов ИИ-провайдера не удался (таймаут,
 * ошибка API и т.п.) — пользователь не должен терять деньги/бесплатный запрос
 * за ответ, который не получил. Вызывать в catch-блоке вокруг fetch к ИИ.
 */
export async function refundAiRequest(userId: number, charge: AiCharge): Promise<void> {
  const db = getDb();

  if (charge.wasFree) {
    await db.update(users).set({ freeRequestsLeft: sql`${users.freeRequestsLeft} + 1` }).where(eq(users.id, userId));
    return;
  }

  if (charge.costKopecks > 0) {
    await db.update(users).set({ balanceKopecks: sql`${users.balanceKopecks} + ${charge.costKopecks}` }).where(eq(users.id, userId));
    const [user] = await db.select({ balanceKopecks: users.balanceKopecks }).from(users).where(eq(users.id, userId));
    await db.insert(transactions).values({
      userId,
      type: "refund",
      amountKopecks: charge.costKopecks,
      balanceAfter: user?.balanceKopecks ?? 0,
      meta: { reason: "ai_request_failed" },
    });
  }
}

/** Пишет запись в историю ИИ-запросов (для личного кабинета и статистики). */
export async function logAiUsage(params: {
  userId: number;
  requestType: string;
  tokensUsed: number;
  charge: AiCharge;
  modelUsed?: string;
  usedFallback?: boolean;
}): Promise<void> {
  const db = getDb();
  await db.insert(aiUsage).values({
    userId: params.userId,
    requestType: params.requestType,
    tokensUsed: params.tokensUsed,
    costKopecks: params.charge.costKopecks,
    wasFree: params.charge.wasFree ? 1 : 0,
    modelUsed: params.modelUsed ?? null,
    usedFallback: params.usedFallback ? 1 : 0,
  });
}

/** Текущее состояние доступа пользователя — для эндпоинта checkLimit и личного кабинета. */
export async function getAiAccessState(userId: number) {
  const db = getDb();
  const [user] = await db
    .select({ freeRequestsLeft: users.freeRequestsLeft, balanceKopecks: users.balanceKopecks })
    .from(users)
    .where(eq(users.id, userId));

  const freeRequestsLeft = user?.freeRequestsLeft ?? 0;
  const balanceKopecks = user?.balanceKopecks ?? 0;
  const canRequestPaid = balanceKopecks >= AI_REQUEST_COST_KOPECKS;

  return {
    freeRequestsLeft,
    balanceKopecks,
    costKopecks: AI_REQUEST_COST_KOPECKS,
    allowed: freeRequestsLeft > 0 || canRequestPaid,
  };
}

/** То же самое, но для генерации изображений — без бесплатного лимита. */
export async function getImageAccessState(userId: number) {
  const db = getDb();
  const [user] = await db.select({ balanceKopecks: users.balanceKopecks }).from(users).where(eq(users.id, userId));

  const balanceKopecks = user?.balanceKopecks ?? 0;

  return {
    balanceKopecks,
    costKopecks: IMAGE_REQUEST_COST_KOPECKS,
    allowed: balanceKopecks >= IMAGE_REQUEST_COST_KOPECKS,
  };
}
