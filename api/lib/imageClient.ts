/* Клиент для генерации изображений через Timeweb AI Gateway.
   ВАЖНО: в отличие от текстовых моделей (api/lib/aiClient.ts), генерация
   изображений официально не задокументирована как часть AI Gateway (только
   как функция управляемых "AI-агентов") — реализация ниже предполагает
   стандартный OpenAI-совместимый эндпоинт images.generate. Перед боевым
   использованием стоит один раз проверить его вручную (curl/PowerShell),
   как и для текстовых моделей — см. переписку по подключению.

   Переменные окружения:
   AI_API_KEY       — тот же ключ AI Gateway, что и для текста
   AI_IMAGE_API_URL — по умолчанию https://api.timeweb.ai/v1/images/generations
   AI_IMAGE_MODEL   — обязательна, точный slug модели из панели (например, Gemini image-preview)
*/

export type GeneratedImage = { imageBase64?: string; imageUrl?: string };

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_IMAGE_API_URL || "https://api.timeweb.ai/v1/images/generations";
  const model = process.env.AI_IMAGE_MODEL;

  if (!apiKey) {
    throw new Error("Генерация изображений недоступна: не задан AI_API_KEY на сервере");
  }
  if (!model) {
    throw new Error("Генерация изображений недоступна: не задан AI_IMAGE_MODEL на сервере");
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n: 1, size: "1024x1792" }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ошибка генерации изображения (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = json.data?.[0];

  if (item?.b64_json) return { imageBase64: item.b64_json };
  if (item?.url) return { imageUrl: item.url };

  throw new Error("ИИ не вернул изображение — попробуйте ещё раз или измените описание");
}
