import cron from "node-cron";
import { getDb } from "../queries/connection";
import { infusionStages, infusions, users } from "@db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
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
 * Находит этапы трекера, у которых сегодня наступила дата (status = upcoming,
 * plannedDate попадает в сегодняшний день), группирует по пользователю
 * и отправляет одно письмо на пользователя со всеми его делами на сегодня.
 *
 * Дублей не боимся: раз в сутки прогоняем, plannedDate today больше не
 * совпадёт завтра — как только пользователь отметит этап, он уйдёт из upcoming.
 */
export async function sendDueTrackerReminders(): Promise<{ usersNotified: number; stagesFound: number }> {
  const db = getDb();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

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
        gte(infusionStages.plannedDate, startOfToday),
        lt(infusionStages.plannedDate, endOfToday),
        eq(infusions.status, "active")
      )
    );

  const byUser = new Map<string, { name: string | null; items: { infusionName: string; label: string }[] }>();
  for (const row of due) {
    const entry = byUser.get(row.userEmail) ?? { name: row.userName, items: [] };
    entry.items.push({ infusionName: row.infusionName, label: STAGE_LABELS[row.stageType] ?? row.stageType });
    byUser.set(row.userEmail, entry);
  }

  let usersNotified = 0;
  for (const [email, { items }] of byUser) {
    const listHtml = items
      .map((i) => `<li style="margin-bottom:6px;"><b>${i.infusionName}</b> — ${i.label}</li>`)
      .join("");

    const ok = await sendEmail({
      to: email,
      subject: items.length === 1 ? `Пора: ${items[0].label.toLowerCase()} — ${items[0].infusionName}` : `Сегодня ${items.length} дела по вашим настойкам`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 22px; color: #1a1a1a; margin-bottom: 16px;">🍹 Трекер созревания</h1>
          <p style="font-size: 15px; color: #333; line-height: 1.6;">Сегодня по плану:</p>
          <ul style="font-size: 15px; color: #333; padding-left: 20px;">${listHtml}</ul>
          <a href="${SITE_URL}/#/profile" style="display: inline-block; margin: 20px 0; padding: 12px 28px; background: #8B4513; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Открыть трекер
          </a>
        </div>
      `,
    });
    if (ok) usersNotified++;
    await new Promise((r) => setTimeout(r, 300)); // не долбим email-провайдера пачкой разом
  }

  return { usersNotified, stagesFound: due.length };
}

/** Ежедневный прогон в 9 утра — разумное время, чтобы письмо реально прочитали. */
export function startTrackerReminderCron() {
  cron.schedule("0 9 * * *", async () => {
    try {
      const result = await sendDueTrackerReminders();
      console.log(`[tracker-reminders] этапов на сегодня: ${result.stagesFound}, уведомлено пользователей: ${result.usersNotified}`);
    } catch (err) {
      console.error("[tracker-reminders] ошибка:", err);
    }
  });
  console.log("[tracker-reminders] cron запланирован — ежедневно в 09:00, рассылает напоминания о наступивших этапах");
}
