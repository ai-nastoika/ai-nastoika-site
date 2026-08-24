import cron from "node-cron";
import { getDb } from "../queries/connection";
import { places } from "@db/schema";
import { and, isNotNull, or, isNull, lt, eq } from "drizzle-orm";

const CHECK_INTERVAL_DAYS = 90;
const BATCH_SIZE = 20; // за один прогон проверяем не больше N сайтов — не долбим интернет разом
const REQUEST_TIMEOUT_MS = 8000;

async function checkOne(url: string): Promise<"ok" | "unreachable"> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    // 2xx/3xx считаем "сайт жив"; 4xx/5xx — недоступен
    return res.status < 400 ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/**
 * Проверяет заведения, у которых ЕСТЬ сайт и он не проверялся >= 90 дней
 * (или не проверялся вообще). Заведения без сайта не трогаем — им это не применимо.
 */
export async function checkDueWebsites(force = false): Promise<{ checked: number; ok: number; unreachable: number }> {
  const db = getDb();
  const cutoff = new Date(Date.now() - CHECK_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const due = await db.query.places.findMany({
    where: force
      ? isNotNull(places.website)
      : and(
          isNotNull(places.website),
          or(isNull(places.websiteLastCheckedAt), lt(places.websiteLastCheckedAt, cutoff))
        ),
    limit: BATCH_SIZE,
  });

  let ok = 0;
  let unreachable = 0;

  for (const place of due) {
    if (!place.website) continue;
    const status = await checkOne(place.website);
    if (status === "ok") ok++;
    else unreachable++;

    await db
      .update(places)
      .set({ websiteStatus: status, websiteLastCheckedAt: new Date() })
      .where(eq(places.id, place.id));

    // небольшая пауза между запросами — вежливо по отношению к чужим серверам
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { checked: due.length, ok, unreachable };
}

/**
 * Запускает ежедневную задачу, которая проверяет сайты, "просроченные" на проверку
 * (>90 дней с последней проверки). За счёт ежедневного запуска нагрузка размазывается
 * по времени, а не бьёт по всем сайтам разом раз в квартал.
 */
export function startWebsiteCheckCron() {
  cron.schedule("0 4 * * *", async () => {
    try {
      const result = await checkDueWebsites();
      console.log(
        `[website-check] проверено: ${result.checked}, доступно: ${result.ok}, недоступно: ${result.unreachable}`
      );
    } catch (err) {
      console.error("[website-check] ошибка:", err);
    }
  });
  console.log("[website-check] cron запланирован — ежедневно в 04:00, проверяет сайты старше 90 дней");
}
