/**
 * Приводит адрес сайта к нормальному виду:
 * - "tonyc.clients.site" → "https://tonyc.clients.site" (протокола нет — добавляем)
 * - "https://tonyc.clients.site" → без изменений (протокол уже есть)
 * - "https://https://tonyc.clients.site" → "https://tonyc.clients.site" (убираем задвоение)
 */
export function normalizeWebsite(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  let url = input.trim();
  if (!url) return undefined;

  // Схлопываем повторяющиеся протоколы в начале строки до одного
  url = url.replace(/^(?:https?:\/\/)+/i, (match) => {
    const first = match.match(/https?:\/\//i);
    return first ? first[0] : match;
  });

  // Если протокола нет вообще — добавляем https://
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url;
}
