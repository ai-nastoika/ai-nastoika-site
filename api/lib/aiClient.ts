/* Общий клиент для вызова LLM через Timeweb AI Gateway (или любой другой
   OpenAI-совместимый эндпоинт). Используется recipeConsultRouter,
   infusionConsultRouter, tasteCalculatorRouter — вместо дублирования fetch
   в каждом файле.

   Переменные окружения:
   AI_API_KEY       — обязательна
   AI_API_URL       — по умолчанию https://api.openai.com/v1/chat/completions
   AI_MODEL         — основная модель, по умолчанию gpt-4o-mini
   AI_MODEL_FALLBACK — необязательна. Если задана и основная модель упала
                        (сетевая ошибка, 4xx/5xx от провайдера) — автоматически
                        пробуем эту модель тем же ключом/URL, без участия пользователя.
*/

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiCallResult = {
  answer: string;
  tokensUsed: number;
  modelUsed: string;
  usedFallback: boolean;
};

async function callModel(
  apiUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ answer: string; tokensUsed: number }> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ошибка ИИ-сервиса (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };

  return {
    answer: json.choices?.[0]?.message?.content ?? "Не удалось получить ответ от ИИ",
    tokensUsed: json.usage?.total_tokens ?? 0,
  };
}

export async function callChatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<AiCallResult> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
  const primaryModel = process.env.AI_MODEL || "gpt-4o-mini";
  const fallbackModel = process.env.AI_MODEL_FALLBACK; // может быть не задана

  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2500;

  if (!apiKey) {
    throw new Error("ИИ временно недоступен: не задан AI_API_KEY на сервере");
  }

  try {
    const result = await callModel(apiUrl, apiKey, primaryModel, messages, temperature, maxTokens);
    return { ...result, modelUsed: primaryModel, usedFallback: false };
  } catch (primaryErr) {
    if (!fallbackModel) throw primaryErr;

    // Основная модель недоступна — пробуем резервную тем же ключом.
    // Логируем в stdout (виден в `pm2 logs`), чтобы было заметно, что сработал фолбэк.
    console.error(
      `[ai] основная модель "${primaryModel}" недоступна (${(primaryErr as Error).message}), пробуем резервную "${fallbackModel}"`
    );

    try {
      const result = await callModel(apiUrl, apiKey, fallbackModel, messages, temperature, maxTokens);
      return { ...result, modelUsed: fallbackModel, usedFallback: true };
    } catch (fallbackErr) {
      // Обе модели недоступны — показываем ошибку основной, она обычно информативнее
      // (резервная чаще падает по вторичным причинам вроде неверного имени модели).
      throw primaryErr ?? fallbackErr;
    }
  }
}
