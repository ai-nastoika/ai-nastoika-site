/**
 * Небольшие чистые функции для проверки на дубликаты (мест и рецептов).
 * Никаких внешних зависимостей — простые, предсказуемые алгоритмы.
 */

/** Нормализация текста для сравнения: нижний регистр, без лишних пробелов/пунктуации */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[«»"'.,!?()–—-]/g, "")
    .replace(/\s+/g, " ");
}

/** Разбивка строки на биграммы (пары соседних символов) */
function bigrams(s: string): string[] {
  const clean = s.replace(/\s+/g, "");
  const result: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) {
    result.push(clean.slice(i, i + 2));
  }
  return result;
}

/**
 * Коэффициент Дайса (Sørensen–Dice) — насколько похожи две строки, от 0 до 1.
 * Устойчив к небольшим опечаткам и перестановкам слов лучше, чем точное сравнение.
 */
export function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.length === 0 || bigramsB.length === 0) return a === b ? 1 : 0;

  const mapB = new Map<string, number>();
  for (const bg of bigramsB) mapB.set(bg, (mapB.get(bg) ?? 0) + 1);

  let intersection = 0;
  for (const bg of bigramsA) {
    const count = mapB.get(bg) ?? 0;
    if (count > 0) {
      intersection++;
      mapB.set(bg, count - 1);
    }
  }

  return (2 * intersection) / (bigramsA.length + bigramsB.length);
}

/** Коэффициент Жаккара для двух множеств строк — доля общих элементов */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Расстояние между двумя координатами в метрах (формула гаверсинуса) */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
