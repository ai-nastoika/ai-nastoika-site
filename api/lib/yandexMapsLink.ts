/* Достаёт точные координаты прямо из ссылки на Яндекс.Карты — без угадывания
   через ИИ или геокодирования по адресу. Раньше промпт просил модель "угадать"
   lat/lng по тексту адреса, из-за чего координаты были неточными (иногда не
   тот дом, не тот квартал). У Яндекс.Карт координаты организации уже зашиты
   прямо в URL страницы (параметр ll=долгота,широта) — в том числе в ссылке
   с кнопки "Поделиться". Это ровно то же значение, которое видит сам админ,
   когда открывает карточку заведения вручную.

   Поддерживает:
   - Полные ссылки на карточку организации (уже содержат ll=)
   - Короткие ссылки-"Поделиться" вида yandex.ru/maps/-/XXXXXXXX — их нужно
     сначала развернуть (Яндекс отдаёт редирект на полную ссылку). */

export class YandexLinkError extends Error {}

function parseLLFromUrl(url: string): { lat: number; lng: number } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // ll=долгота,широта — именно в таком порядке у Яндекса, не перепутать с обычным lat,lng
  const ll = parsed.searchParams.get("ll");
  if (ll) {
    const [lonStr, latStr] = ll.split(",").map((s) => s.trim());
    const lon = Number(lonStr);
    const lat = Number(latStr);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lng: lon };
    }
  }

  // Резервный формат, встречается в ссылках навигатора: whatshere[point]=долгота,широта
  const whatshere = parsed.searchParams.get("whatshere[point]");
  if (whatshere) {
    const [lonStr, latStr] = whatshere.split(",").map((s) => s.trim());
    const lon = Number(lonStr);
    const lat = Number(latStr);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lng: lon };
    }
  }

  return null;
}

export async function resolveYandexMapsCoords(rawUrl: string): Promise<{ lat: number; lng: number }> {
  const url = rawUrl.trim();
  if (!url) {
    throw new YandexLinkError("Ссылка пустая");
  }
  if (!/^https?:\/\/(www\.)?yandex\.(ru|com)\/(maps|navi)/i.test(url)) {
    throw new YandexLinkError("Это не похоже на ссылку с Яндекс.Карт (yandex.ru/maps/... или yandex.ru/navi/...)");
  }

  // Сначала пробуем распарсить прямо из исходной ссылки — если это уже
  // полная ссылка на карточку организации, координаты будут прямо в URL.
  const direct = parseLLFromUrl(url);
  if (direct) return direct;

  // Короткая ссылка-"Поделиться" (yandex.ru/maps/-/XXXX) — разворачиваем редирект.
  let finalUrl = url;
  try {
    const res = await fetch(url, { redirect: "follow" });
    finalUrl = res.url || url;
  } catch (err) {
    throw new YandexLinkError(
      "Не удалось открыть ссылку — проверьте, что она рабочая и доступна (" +
      (err instanceof Error ? err.message : "сетевая ошибка") + ")"
    );
  }

  const resolved = parseLLFromUrl(finalUrl);
  if (!resolved) {
    throw new YandexLinkError(
      "В ссылке не нашлось координат. Откройте карточку заведения на Яндекс.Картах и используйте именно кнопку «Поделиться» — она формирует ссылку с координатами."
    );
  }
  return resolved;
}
