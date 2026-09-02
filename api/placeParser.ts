import { z } from "zod";
import { createRouter, editorQuery } from "./middleware";
import { callChatCompletion } from "./lib/aiClient";
import { logAiUsage, logAiFailure } from "./lib/aiAccess";

/* Раньше здесь тоже был ручной Kimi-флоу (копипаст промпта в chat.kimi.ai) —
   при этом сама модель регулярно "улучшала" ссылку на Яндекс.Карты вместо
   того, чтобы скопировать её буквально, из-за чего координаты уезжали не туда.
   Теперь — прямой вызов через Timeweb AI Gateway, конкретно DeepSeek (не общая
   AI_MODEL сайта — можно переопределить через AI_MODEL_PLACES).

   ВАЖНО: обычный chat.completions НЕ умеет "открыть ссылку" или "погуглить" —
   в отличие от старого промпта для Kimi, этот промпт этого не обещает. Модель
   работает только с тем текстом, что ей прислали. Ссылку на Яндекс.Карты и
   явно указанные координаты код достаёт из текста регуляркой/по инструкции
   отдельно от суждения модели — см. extractYandexMapsUrl ниже. */

const REQUEST_TYPE = "place_parser";
const PLACE_PARSER_MODEL_DEEPSEEK = process.env.AI_MODEL_PLACES || "deepseek/deepseek-v4-flash";
const PLACE_PARSER_MODEL_QWEN = process.env.AI_MODEL_PLACES_QWEN || "dashscope/qwen3.5-flash";
// Точный slug не задокументирован явно у Timeweb (в отличие от dashscope/deepseek) —
// предположен по аналогии с остальными провайдерами. Стоит проверить одним запросом
// перед тем как полагаться на этот вариант в бою — если Timeweb использует другую
// строку, здесь вернётся ошибка "модель не найдена", легко поправить через .env.
const PLACE_PARSER_MODEL_GLM = process.env.AI_MODEL_PLACES_GLM || "zhipu/glm-4.7-flashx";

const SYSTEM_PROMPT = `Ты — эксперт по барам и заведениям, где подают домашние настойки (хреновуха, вишнёвка, наливки и т.д.).
Тебе присылают текст о заведении — адрес, ссылку на сайт или Яндекс.Карты, метро, отзывы, особенности и что угодно
ещё, скопированное вперемешку. Ты работаешь ТОЛЬКО с этим текстом — у тебя нет доступа в интернет, ты не можешь
открыть ссылку или что-то погуглить. Если каких-то данных в тексте нет — оставляй поле пустым, а не выдумывай.

ВАЖНЫЕ ПРАВИЛА:
1. Координаты (lat, lng): НЕ вычисляй и не угадывай их сам ни по адресу, ни по названию. Заполняй ТОЛЬКО если
   в присланном тексте координаты УЖЕ УКАЗАНЫ явно (например "координаты: 55.7558, 37.6173") — перенеси эти
   числа в lat/lng ТОЧНО как есть, не меняя и не пересчитывая. Во всех остальных случаях (в том числе если в
   тексте есть только ссылка на Яндекс.Карты, но не сами числа) — оставляй lat и lng равными null. Координаты
   по ссылке определяются отдельно кодом, без твоего участия — если ты не уверен на 100% в точности, всегда
   выбирай null, а не приблизительное значение.
2. Если что-то не удаётся определить из текста — заполни разумным предположением на основе типа заведения
   (например, типичные часы работы бара), но никогда не выдумывай телефон, адрес или координаты.
3. Проанализируй отзывы, которые есть в присланном тексте, за последний год: найди упоминания настоек,
   хреновухи, наливок и т.п. Напиши резюме живым связным языком — 2-4 полных предложения, не телеграфный
   стиль и не одно-два слова. Пиши так, будто пересказываешь впечатление другу, а не составляешь отчёт:
   используй разные слова и обороты (не повторяй один и тот же шаблон фраз от заведения к заведению —
   подбирай синонимы, меняй структуру предложений). Если отзывов в тексте нет — оставь summary/pros/cons
   пустыми, не выдумывай отзывы.
4. Плюсы и минусы (2-4 плюса, 1-3 минуса) — тоже полными фразами, а не голыми словами-ярлыками. Не "уютно" и
   "медленно", а например "уютная атмосфера с приглушённым светом и живой музыкой по выходным" и "в пиковые
   часы обслуживание заметно замедляется". Только то, что действительно следует из текста — не выдумывай,
   но формулируй развёрнуто и своими словами, не копируя дословно фразы из отзывов.
5. slug — латиницей, через дефис, на основе названия и города.
6. tags — 3-5 тегов на русском (например: "настойки", "домашние наливки", "уютная атмосфера").
7. price (ценовая категория) — определяй СТРОГО по среднему чеку на человека, если он упоминается
   в тексте или отзывах: до 800₽ → "₽", 800-2000₽ → "₽₽", от 2000₽ → "₽₽₽".
   Если информации о чеке нет вообще — оставь поле пустой строкой "". Не угадывай и не оценивай "на глаз".
8. description — тоже живым языком, 2-3 полных предложения с деталями и характером места, а не сухой
   перечень фактов через запятую.

Отвечай ТОЛЬКО валидным JSON, без markdown, без объяснений, строго такой структуры:

{
  "slug": "bar-name-city",
  "name": "Название бара",
  "city": "Москва",
  "address": "ул. Примерная, 10",
  "metro": "Пушкинская",
  "phone": "+7 900 000-00-00",
  "website": "https://...",
  "lat": null,
  "lng": null,
  "hours": "Пн-Вс 12:00–00:00",
  "price": "₽₽",
  "infusionsHighlight": "Большой выбор ягодных настоек собственного производства",
  "infusionsSignature": "Хреновуха домашняя",
  "description": "2-3 живых предложения о характере заведения, а не сухой перечень фактов",
  "externalSummary": "Развёрнутое резюме на основе отзывов живым языком, 2-4 предложения, с акцентом на настойки",
  "externalPros": ["Развёрнутая фраза-плюс, а не одно слово", "Второй плюс так же подробно"],
  "externalCons": ["Развёрнутая фраза-минус"],
  "tags": ["настойки", "домашние наливки", "уютная атмосфера"]
}`;

// Ссылку на Яндекс.Карты достаём регуляркой из исходного текста, а не из
// ответа модели — так гарантированно не исказится (см. комментарий выше).
function extractYandexMapsUrl(text: string): string {
  const match = text.match(/https?:\/\/(?:www\.)?yandex\.(?:ru|com)\/(?:maps|navi)\/[^\s"'<>)\]]+/i);
  return match ? match[0] : "";
}

export const placeParserRouter = createRouter({
  generate: editorQuery
    .input(z.object({ rawText: z.string().min(10).max(20000), model: z.enum(["deepseek", "qwen", "glm"]).default("deepseek") }))
    .mutation(async ({ input, ctx }) => {
      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        { role: "user" as const, content: input.rawText },
      ];

      let res;
      try {
        res = await callChatCompletion(messages, {
          temperature: 0.75,
          maxTokens: 5000,
          jsonMode: true,
          model: input.model === "qwen" ? PLACE_PARSER_MODEL_QWEN : input.model === "glm" ? PLACE_PARSER_MODEL_GLM : PLACE_PARSER_MODEL_DEEPSEEK,
        });
      } catch (err) {
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE });
        throw err;
      }

      let parsed: Record<string, unknown>;
      try {
        // Некоторые модели через этот шлюз не всегда честно соблюдают jsonMode:
        // заворачивают ответ в markdown-код-блок или добавляют пояснение до/после
        // JSON. Снимаем код-блок, а если этого мало — вытаскиваем содержимое
        // между первой { и последней } (сам JSON, отбросив всё вокруг).
        let cleaned = res.answer.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        }
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("[placeParser] невалидный JSON от модели, сырой ответ:", res.answer.slice(0, 500));
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE });
        const looksTruncated = !res.answer.trim().endsWith("}");
        const hint = looksTruncated
          ? " Похоже, ответ модели оборвался на середине (не хватило лимита токенов) — попробуйте ещё раз, а если повторится часто, дайте знать."
          : "";
        throw new Error(`ИИ (${res.modelUsed}) вернул невалидный JSON.${hint} Начало ответа: "${res.answer.slice(0, 200)}"`);
      }

      await logAiUsage({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        tokensUsed: res.tokensUsed,
        charge: { wasFree: true, costKopecks: 0 },
        modelUsed: res.modelUsed,
        usedFallback: res.usedFallback,
      });

      return { ...parsed, yandexUrl: extractYandexMapsUrl(input.rawText) };
    }),
});
