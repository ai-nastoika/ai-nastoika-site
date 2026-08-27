/**
 * Простой rate limiter в памяти процесса Node.
 *
 * Почему не Redis/внешнее хранилище: сайт крутится на одном VDS одним
 * процессом (pm2 fork, не cluster) — состояние в памяти этого процесса
 * ничем не хуже внешнего хранилища для наших объёмов, а сложности сильно
 * меньше. Если когда-нибудь появится несколько инстансов за балансировщиком
 * — это первое место, куда возвращаться и переезжать на Redis.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Периодическая чистка старых записей, чтобы Map не росла бесконечно на
// живом сервере, который месяцами не перезапускается. .unref() — чтобы этот
// таймер сам по себе не держал процесс живым (не мешает нормальному shutdown).
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * Фиксированное окно: "не больше max запросов за windowMs миллисекунд под
 * этим ключом". Ключ обычно "имя-операции:ip", иногда "имя-операции:ip:email"
 * для более точечных лимитов (см. использование в api/router.ts).
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true, retryAfterSec: 0 };
}

/** IP клиента из заголовков — сервер стоит за nginx-реверс-прокси, поэтому
 *  реальный адрес приходит в X-Forwarded-For, а не в сетевом соединении. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
