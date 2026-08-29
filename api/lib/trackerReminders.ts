import cron from "node-cron";
import { getDb } from "../queries/connection";
import { infusionStages, infusions, users } from "@db/schema";
import { eq, and, lte, isNull, inArray } from "drizzle-orm";
import { sendEmail } from "./email";

const SITE_URL = process.env.SITE_URL || "https://dev.ai-nastoika.ru";

const STAGE_LABELS: Record<string, string> = {
  pour: "Поставить",
  shake: "Взболтать",
  strain: "Слить/процедить",
  rest: "Дать отстояться",
  add_ingredient: "Добавить ингредиент",
  taste: "Дегустация",
  custom: "Действие",
};

/**
 * Находит этапы трекера, чьё plannedDate (дата+время) уже наступило, но
 * напоминание по ним ещё не отправлялось (reminderSentAt IS NULL), у которых
 * не стоит галочка "не напоминать" (notifyEnabled = 1). Группирует по
 * пользователю и отправляет одно письмо со всеми созревшими делами.
 *
 * В отличие от старой версии (раз в сутки, только "сегодня"), эта функция
 * учитывает точное время этапа — вызывается часто (см. cron ниже), поэтому
 * пользователь получит письмо близко к выбранному им времени, а не утром
 * следующего дня. reminderSentAt защищает от повторной отправки при каждом
 * опросе и сбрасывается на сервере при переносе времени этапа (см.
 * infusionRouter.ts: updateStage/postponeStage).
 */
export async function sendDueTrackerReminders(): Promise<{ usersNotified: number; stagesFound: number }> {
  const db = getDb();
  const now = new Date();

  const due = await db
    .select({
      stageId: infusionStages.id,
      stageType: infusionStages.type,
      stageTitle: infusionStages.title,
      infusionName: infusions.name,
      userEmail: users.email,
      userName: users.name,
    })
    .from(infusionStages)
    .innerJoin(infusions, eq(infusionStages.infusionId, infusions.id))
    .innerJoin(users, eq(infusions.userId, users.id))
    .where(
      and(
        eq(infusionStages.status, "upcoming"),
        eq(infusionStages.notifyEnabled, 1),
        isNull(infusionStages.reminderSentAt),
        lte(infusionStages.plannedDate, now),
        eq(infusions.status, "active")
      )
    );

  const byUser = new Map<string, { name: string | null; items: { infusionName: string; label: string }[]; stageIds: number[] }>();
  for (const row of due) {
    const entry = byUser.get(row.userEmail) ?? { name: row.userName, items: [], stageIds: [] };
    entry.items.push({ infusionName: row.infusionName, label: STAGE_LABELS[row.stageType] ?? row.stageType });
    entry.stageIds.push(row.stageId);
    byUser.set(row.userEmail, entry);
  }

  let usersNotified = 0;
  for (const [email, { items, stageIds }] of byUser) {
    const listHtml = items
      .map((i) => `<li style="margin-bottom:6px;"><b>${i.infusionName}</b> — ${i.label}</li>`)
      .join("");

    const ok = await sendEmail({
      to: email,
      subject: items.length === 1 ? `Пора: ${items[0].label.toLowerCase()} — ${items[0].infusionName}` : `${items.length} дела по вашим настойкам`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 16px;">🍹 Трекер созревания</h1>
          <p style="font-size: 15px; color: #333; line-height: 1.6;">Пора:</p>
          <ul style="font-size: 15px; color: #333; padding-left: 20px;">${listHtml}</ul>
          <a href="${SITE_URL}/profile" style="display: inline-block; margin: 20px 0; padding: 12px 28px; background: #8B4513; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Открыть трекер
          </a>
        </div>
      `,
    });

    // Помечаем отправленным только при успехе — иначе при сбое Resend
    // тот же этап корректно попадёт в следующий опрос через 5 минут.
    if (ok) {
      usersNotified++;
      await db.update(infusionStages).set({ reminderSentAt: new Date() }).where(inArray(infusionStages.id, stageIds));
    }
    await new Promise((r) => setTimeout(r, 300)); // не долбим email-провайдера пачкой разом
  }

  return { usersNotified, stagesFound: due.length };
}

/** Опрос каждые 5 минут — достаточно часто, чтобы письмо пришло близко
 *  к выбранному пользователем времени, и не нагружает БД/почту. */
export function startTrackerReminderCron() {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await sendDueTrackerReminders();
      if (result.stagesFound > 0) {
        console.log(`[tracker-reminders] созревших этапов: ${result.stagesFound}, уведомлено пользователей: ${result.usersNotified}`);
      }
    } catch (err) {
      console.error("[tracker-reminders] ошибка:", err);
    }
  });
  console.log("[tracker-reminders] cron запланирован — каждые 5 минут, рассылает напоминания по наступившему времени этапа");
}
