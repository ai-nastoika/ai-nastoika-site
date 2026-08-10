import { eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { donations, transactions, users } from "@db/schema";

export type CreditResult = { credited: boolean; balanceKopecks: number };

/**
 * Зачисляет пополнение на баланс пользователя. Идемпотентно по `externalId`
 * (id платежа в ЮKassa) — если платёж уже был зачислен раньше (например,
 * вебхук пришёл повторно, ЮKassa так иногда делает), просто вернёт
 * { credited: false } и ничего не изменит повторно.
 *
 * Полагаемся на UNIQUE-индекс `transactions_external_id_idx` из миграции:
 * вставка строки с уже существующим external_id упадёт с ER_DUP_ENTRY —
 * это и есть защита от двойного зачисления, без необходимости в
 * многошаговой транзакции (см. пояснение в api/lib/aiAccess.ts про
 * ограничения текущего пула подключений).
 */
export async function creditTopup(params: {
  userId: number;
  amountKopecks: number;
  externalId: string;
  meta?: Record<string, unknown>;
}): Promise<CreditResult> {
  const db = getDb();

  const [current] = await db.select({ balanceKopecks: users.balanceKopecks }).from(users).where(eq(users.id, params.userId));
  if (!current) throw new Error(`Пользователь #${params.userId} не найден`);

  const newBalance = current.balanceKopecks + params.amountKopecks;

  try {
    await db.insert(transactions).values({
      userId: params.userId,
      type: "topup",
      amountKopecks: params.amountKopecks,
      balanceAfter: newBalance,
      externalId: params.externalId,
      meta: params.meta ?? {},
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Duplicate entry") || (err as { code?: string })?.code === "ER_DUP_ENTRY") {
      return { credited: false, balanceKopecks: current.balanceKopecks };
    }
    throw err;
  }

  await db.update(users).set({ balanceKopecks: sql`${users.balanceKopecks} + ${params.amountKopecks}` }).where(eq(users.id, params.userId));

  return { credited: true, balanceKopecks: newBalance };
}

export type DonationResult = { recorded: boolean };

/**
 * Записывает донат и, если он привязан к аккаунту, выставляет значок донора.
 * Идемпотентно по `externalId` тем же способом, что и creditTopup — уникальный
 * индекс на donations.external_id ловит повторную доставку вебхука.
 * Донат НЕ трогает balanceKopecks/freeRequestsLeft — это отдельная сущность,
 * не даёт дополнительных ИИ-запросов.
 */
export async function recordDonation(params: {
  userId?: number;
  amountKopecks: number;
  externalId: string;
  name?: string;
  message?: string;
}): Promise<DonationResult> {
  const db = getDb();

  try {
    await db.insert(donations).values({
      userId: params.userId ?? null,
      name: params.name ?? null,
      amountKopecks: params.amountKopecks,
      message: params.message ?? null,
      externalId: params.externalId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Duplicate entry") || (err as { code?: string })?.code === "ER_DUP_ENTRY") {
      return { recorded: false };
    }
    throw err;
  }

  if (params.userId) {
    await db.update(users).set({ isDonor: 1 }).where(eq(users.id, params.userId));
  }

  return { recorded: true };
}
