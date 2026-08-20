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

export async function generateImage(prompt: string, size: "1024x1024" | "1024x1536" | "1536x1024"): Promise<GeneratedImage> {
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
    // Подтверждено примером из панели Timeweb (GPT Image 2): модель принимает
    // только фиксированный набор размеров (1024x1024, 1024x1536, 1536x1024),
    // а не произвольные пропорции — quality:"low" как в примере Timeweb.
    body: JSON.stringify({ model, prompt, n: 1, size, quality: "low" }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (errText.includes("safety system") || errText.includes("rejected by the safety")) {
      throw new Error(
        "Настройки безопасности ИИ-модели не позволяют сгенерировать изображение по вашему описанию. " +
          "Попробуйте изменить описание или начните заново. Плата за запрос не взималась."
      );
    }
    throw new Error(`Ошибка генерации изображения (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = json.data?.[0];

  if (item?.b64_json) return { imageBase64: item.b64_json };
  if (item?.url) return { imageUrl: item.url };

  throw new Error("ИИ не вернул изображение — попробуйте ещё раз или измените описание");
}
