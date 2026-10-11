/**
 * Действия над этапами трекера, общие для сайта (tRPC) и Telegram-бота:
 * «выполнено» и «перенести». Логика в одном месте, чтобы кнопка в Telegram
 * вела себя в точности как кнопка на сайте (в т.ч. создавала следующий этап
 * у повторяющихся).
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { infusions, infusionStages } from "@db/schema";

type StageRow = typeof infusionStages.$inferSelect;

/** Отмечает этап выполненным; у повторяющегося создаёт следующий.
 *  Возвращает дату следующего этапа, если он создан. */
export async function markStageDone(
  stage: StageRow,
  extra: { note?: string; photoUrl?: string } = {}
): Promise<Date | null> {
  const db = getDb();
  await db
    .update(infusionStages)
    .set({ status: "done", completedAt: new Date(), note: extra.note, photoUrl: extra.photoUrl })
    .where(eq(infusionStages.id, stage.id));

  if (!stage.repeatIntervalDays) return null;
  const nextDate = new Date(stage.plannedDate);
  nextDate.setDate(nextDate.getDate() + stage.repeatIntervalDays);
  await db.insert(infusionStages).values({
    infusionId: stage.infusionId,
    type: stage.type,
    title: stage.title,
    plannedDate: nextDate,
    repeatIntervalDays: stage.repeatIntervalDays,
    notifyEnabled: stage.notifyEnabled,
    sortOrder: stage.sortOrder,
  });
  return nextDate;
}

/** Этап + название настойки, но только если он принадлежит пользователю
 *  и ещё не выполнен (для действий из Telegram). */
export async function findOpenStageOfUser(stageId: number, userId: number) {
  const db = getDb();
  const rows = await db
    .select({ stage: infusionStages, infusionName: infusions.name })
    .from(infusionStages)
    .innerJoin(infusions, eq(infusionStages.infusionId, infusions.id))
    .where(and(eq(infusionStages.id, stageId), eq(infusions.userId, userId), eq(infusionStages.status, "upcoming")))
    .limit(1);
  return rows[0] ?? null;
}

/** Перенос на сутки: от более позднего из «запланировано» и «сейчас» —
 *  чтобы просроченный этап не остался в прошлом и не вернулся через 5 минут. */
export async function postponeStageOneDay(stage: StageRow): Promise<Date> {
  const base = Math.max(new Date(stage.plannedDate).getTime(), Date.now());
  const newDate = new Date(base + 24 * 3600 * 1000);
  // reminderSentAt сбрасываем — для нового времени напоминание ещё не отправлялось.
  await getDb().update(infusionStages).set({ plannedDate: newDate, reminderSentAt: null }).where(eq(infusionStages.id, stage.id));
  return newDate;
}
