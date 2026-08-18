/* Минимальный service worker — не делает офлайн-кэширование, нужен только для
   того, чтобы Chrome на Android считал сайт "устанавливаемым" и показывал
   системное предложение "Добавить на главный экран" (событие beforeinstallprompt
   в AddToHomeScreenPrompt.tsx срабатывает только при наличии SW с fetch-обработчиком). */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Ничего не перехватываем — все запросы идут в сеть как обычно.
  // Пустой обработчик присутствует специально, это требование Chrome для installability.
});
