/* Клиент для распознавания речи (Speech-to-Text) через Timeweb AI Gateway.
   Тот же AI_API_KEY, что и для текста/картинок (см. aiClient.ts/imageClient.ts) —
   отдельные только URL эндпоинта и модель, т.к. это другой метод API
   (audio.transcriptions, не chat.completions).

   Переменные окружения:
   AI_API_KEY     — тот же ключ AI Gateway
   AI_STT_API_URL — по умолчанию https://api.timeweb.ai/v1/audio/transcriptions
   AI_STT_MODEL   — по умолчанию openai/gpt-4o-mini-transcribe
*/

export async function transcribeAudio(fileBuffer: Buffer, fileName: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_STT_API_URL || "https://api.timeweb.ai/v1/audio/transcriptions";
  const model = process.env.AI_STT_MODEL || "openai/gpt-4o-mini-transcribe";

  if (!apiKey) {
    throw new Error("Распознавание речи недоступно: не задан AI_API_KEY на сервере");
  }

  const form = new FormData();
  form.append("model", model);
  form.append("language", "ru");
  form.append("response_format", "json");
  // Buffer — валидный BlobPart (подкласс Uint8Array), доп. библиотек не нужно.
  form.append("file", new Blob([fileBuffer]), fileName);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ошибка распознавания речи (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}
