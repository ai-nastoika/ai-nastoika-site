/* Service worker для «Ай, настойка!».
   Две задачи, и только эти две:

   1. Наличие SW с fetch-обработчиком нужно, чтобы Chrome на Android считал
      сайт "устанавливаемым" и показывал системное предложение установки
      (событие beforeinstallprompt в AddToHomeScreenPrompt.tsx).

   2. Офлайн-заглушка: если пользователь открыл установленное приложение без
      интернета, вместо стандартной ошибки браузера "нет соединения" показываем
      аккуратную страницу /offline.html в стиле сайта.

   ВАЖНО: сам сайт (рецепты, страницы, данные) НЕ кэшируется намеренно — контент
   часто меняется, и офлайн-кэш заморозил бы у пользователей старые версии.
   Кэшируется только заглушка и её иконка. Все реальные запросы всегда идут в
   сеть; заглушка показывается лишь когда сеть недоступна для навигации. */

const CACHE = "ai-nastoika-offline-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192x192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Удаляем старые версии кэша заглушки при обновлении SW.
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Заглушку показываем только для навигаций (открытие страницы), не для
  // картинок/api/шрифтов — те просто идут в сеть как обычно.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Всё остальное — обычная сеть, ничего не перехватываем и не кэшируем.
});
