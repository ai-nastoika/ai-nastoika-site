import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
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
const PLACE_PARSER_MODEL = process.env.AI_MODEL_PLACES || "deepseek/deepseek-v4-flash";

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
   хреновухи, наливок и т.п. Напиши краткое резюме с акцентом именно на них. Если отзывов в тексте нет —
   оставь summary/pros/cons пустыми, не выдумывай отзывы.
4. Выдели 2-4 реальных плюса и 1-3 минуса на основе отзывов — только то, что действительно следует из текста.
5. slug — латиницей, через дефис, на основе названия и города.
6. tags — 3-5 тегов на русском (например: "настойки", "домашние наливки", "уютная атмосфера").
7. price (ценовая категория) — определяй СТРОГО по среднему чеку на человека, если он упоминается
   в тексте или отзывах: до 800₽ → "₽", 800-2000₽ → "₽₽", от 2000₽ → "₽₽₽".
   Если информации о чеке нет вообще — оставь поле пустой строкой "". Не угадывай и не оценивай "на глаз".

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
  "description": "2-3 предложения общего описания заведения",
  "externalSummary": "Краткое резюме на основе отзывов, с акцентом на настойки",
  "externalPros": ["Плюс 1", "Плюс 2"],
  "externalCons": ["Минус 1"],
  "tags": ["настойки", "домашние наливки", "уютная атмосфера"]
}`;

// Ссылку на Яндекс.Карты достаём регуляркой из исходного текста, а не из
// ответа модели — так гарантированно не исказится (см. комментарий выше).
function extractYandexMapsUrl(text: string): string {
  const match = text.match(/https?:\/\/(?:www\.)?yandex\.(?:ru|com)\/(?:maps|navi)\/[^\s"'<>)\]]+/i);
  return match ? match[0] : "";
}

export const placeParserRouter = createRouter({
  generate: adminQuery
    .input(z.object({ rawText: z.string().min(10).max(20000) }))
    .mutation(async ({ input, ctx }) => {
      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        { role: "user" as const, content: input.rawText },
      ];

      let res;
      try {
        res = await callChatCompletion(messages, {
          temperature: 0.5,
          maxTokens: 3000,
          jsonMode: true,
          model: PLACE_PARSER_MODEL,
        });
      } catch (err) {
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE });
        throw err;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(res.answer);
      } catch {
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE });
        throw new Error("ИИ вернул невалидный JSON — попробуйте ещё раз");
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
