import crypto from "crypto";
import { sql, eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { siteVisits, visitDedup } from "@db/schema";

/* Серверный счётчик посещений. Вызывается при отдаче HTML-страниц из
   api/boot.ts. Устойчив к блокировщикам рекламы (в отличие от Метрики/Google),
   т.к. считает на сервере, а не в браузере.

   Что считаем:
   - pageviews — каждый заход на HTML-страницу (обновление страницы тоже);
   - visits — уникальные за день (по хэшу IP+UA), чтобы «обновил 10 раз» ≠ «10 людей».

   Чего НЕ считаем: ботов/краулеров (по User-Agent), запросы к API и статике
   (их фильтрует вызывающий код в boot.ts — сюда попадают только просмотры страниц).

   Приватность: сырые IP не храним — только необратимый короткий хэш IP+UA+дата
   для дедупликации в пределах суток. */

// Грубый, но достаточный фильтр ботов по User-Agent. Цель — отсечь очевидных
// краулеров (поисковики, мониторинги, качалки), а не построить идеальную защиту.
const BOT_UA = /bot|crawl|spider|slurp|bing|yandex|google|baidu|duckduck|facebookexternalhit|whatsapp|telegram|preview|monitor|uptime|curl|wget|python-requests|headless|lighthouse|pingdom|semrush|ahrefs|mj12|dotbot/i;

function todayStr(): string {
  // Дата по серверному времени в формате YYYY-MM-DD.
  return new Date().toISOString().slice(0, 10);
}

/* Учесть один просмотр страницы. Не бросает исключений и ничего не возвращает —
   счётчик не должен влиять на отдачу страницы пользователю (fire-and-forget). */
export async function recordVisit(ip: string | null, userAgent: string | null): Promise<void> {
  try {
    if (userAgent && BOT_UA.test(userAgent)) return; // бот — не считаем

    const db = getDb();
    const day = todayStr();

    // Хэш IP+UA+дата. Соль-дата делает хэш «одноразовым» на сутки и не даёт
    // хранить сырой IP. Проверяем, был ли уже такой заход сегодня.
    const raw = `${ip ?? "noip"}|${userAgent ?? "noua"}|${day}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 64);

    const existing = await db.select({ hash: visitDedup.hash }).from(visitDedup).where(eq(visitDedup.hash, hash)).limit(1);
    const isNewVisitor = existing.length === 0;

    if (isNewVisitor) {
      // Отметить хэш как учтённый и заодно почистить вчерашние записи дедупа,
      // чтобы таблица не росла бесконечно (хэши прошлых дней уже не нужны).
      await db.insert(visitDedup).values({ hash, day }).catch(() => {});
      await db.delete(visitDedup).where(sql`${visitDedup.day} <> ${day}`).catch(() => {});
    }

    // Апсерт строки дня: +1 просмотр всегда, +1 визит только для нового посетителя.
    await db
      .insert(siteVisits)
      .values({ day, pageviews: 1, visits: isNewVisitor ? 1 : 0 })
      .onDuplicateKeyUpdate({
        set: {
          pageviews: sql`${siteVisits.pageviews} + 1`,
          visits: sql`${siteVisits.visits} + ${isNewVisitor ? 1 : 0}`,
        },
      });
  } catch {
    // Счётчик не критичен — молча игнорируем любые сбои, чтобы не ломать выдачу.
  }
}
