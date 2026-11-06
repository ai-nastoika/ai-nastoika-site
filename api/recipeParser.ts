import { z } from "zod";
import { createRouter, editorQuery } from "./middleware";
import { callChatCompletion, type ChatMessage } from "./lib/aiClient";
import { logAiUsage, logAiFailure } from "./lib/aiAccess";

/* Раньше здесь был отдельный клиент на Moonshot (Kimi, api.moonshot.cn) —
   ОКАЗАЛОСЬ МЁРТВЫМ КОДОМ: не был подключён в api/router.ts вообще, там
   вместо этого файла жил инлайновый заглушечный роутер с одним фейковым
   checkLimit. Реальный флоу был полностью ручным: копипаст промпта в чат
   Kimi → копипаст JSON-ответа обратно (см. историю RecipeParserPage.tsx).

   Теперь — через общий Timeweb AI Gateway (тот же AI_API_KEY/AI_MODEL, что
   у всех остальных ИИ-фич сайта), без единого копипаста. Админский
   инструмент — не тарифицируется через chargeAiRequest/aiAccess (это не
   пользовательская фича с балансом, а внутренний рабочий инструмент), но
   в ai_usage всё равно логируем (costKopecks: 0, wasFree: true) — иначе
   индикаторы aiHealth/imageHealth в админке не видят эту активность вообще
   и показывают устаревшие данные от других фич. */

const REQUEST_TYPE_TEXT = "recipe_parser";
// varchar(20) в ai_usage.request_type — "recipe_parser_ocr" (17 симв.) укладывается.
const REQUEST_TYPE_OCR = "recipe_parser_ocr";

/* Распознавание рецепта со скриншота (см. recognizeImage ниже). Пришло на
   замену парсеру видео (расшифровка речи через ffmpeg+STT) — тот снесли:
   для рецептов из Инстаграма и подобных обычно нужен текст со скриншота
   поста, а не расшифровка озвучки видео. См. историю api/boot.ts.

   Модель — перебор:
   1) Qwen (dashscope/qwen3.5-flash) — НЕ смогла распознать текст на реальном
      скриншоте (проверено вручную), убрали.
   2) GPT-4o (openai/gpt-4o) — читает уверенно, но это топовая и самая дорогая
      модель линейки, избыточно для простой задачи "прочитай текст с картинки".
   Остановились на GPT-4o mini (openai/gpt-4o-mini) — тот же провайдер и та же
   vision-способность, что у GPT-4o, но кратно дешевле по токенам (тот же паттерн
   именования уже подтверждён в проекте на openai/gpt-4o-mini-transcribe).
   AI_IMAGE_MODEL (генерация картинок) — ДРУГАЯ, отдельная модель: она только
   рисует и читать изображения не умеет в принципе, путать их нельзя.
   Если и mini не устроит по цене/качеству — меняется через AI_VISION_MODEL
   без правки кода (например, на Gemini Flash — у Google свои vision-модели
   в младшем тире исторически одни из самых дешёвых на рынке, стоит сверить
   точный slug и цену в личном кабинете Timeweb перед переключением). */
const VISION_MODEL = process.env.AI_VISION_MODEL || "openai/gpt-4o-mini";

const VISION_SYSTEM_PROMPT = `Ты распознаёшь текст рецепта настойки на изображении — это скриншот поста из
соцсети, фото страницы рецепта или похожее. Перепиши ВЕСЬ видимый текст, относящийся к рецепту, как есть:
название, список ингредиентов, шаги приготовления, время настаивания, любые примечания автора. Ничего не
придумывай, не пересказывай своими словами, не переводи и не форматируй заново — просто аккуратно перенеси
то, что реально написано на картинке, сохраняя порядок. Не включай посторонний текст: хэштеги, никнейм
автора поста, интерфейс приложения (лайки, время публикации), рекламные вставки.`;

const SYSTEM_PROMPT = `Ты — эксперт по домашним настойкам. Разбери текст рецепта, который пришлёт пользователь
(это может быть текст с сайта/форума ИЛИ расшифровка речи из видео — в последнем случае в тексте могут быть
оговорки, слова-паразиты и разговорные обороты, не обращай на них внимания и вычленяй суть), и заполни ВСЕ
поля JSON.

ВАЖНЫЕ ПРАВИЛА:
1. Если параметр не указан в тексте — заполни его сам на основе знаний о данном типе настойки (типичная крепость, время, вкусовой профиль)
2. Для вкусового профиля используй шкалу 0-100 (0 = нет, 100 = максимум)
3. Для historyText напиши 2-3 предложения об истории этого типа настойки
4. Для tastingDescription опиши вкус, цвет, аромат
5. Для tastingPairing укажи 3-5 продуктов, с которыми подаётся
6. Для tips дай 2-3 полезных совета
7. Определи category из списка (используй именно эти id, это реальные категории фильтра на сайте): berry, fruit, citrus, herbal, spiced, bitter, sweet, honey, coffee, floral, nut, root, chocolate, vegetable
8. Определи categoryLabel по-русски (например: "Сладкая", "Пряная", "Травяная")
9. difficulty: "Легко", "Средне" или "Сложно"

Отвечай ТОЛЬКО валидным JSON, без markdown, без объяснений, строго такой структуры:

{
  "title": "название",
  "subtitle": "краткое описание",
  "category": "sweet",
  "categoryLabel": "Сладкая",
  "abv": "25%",
  "time": "14 дней",
  "difficulty": "Легко",
  "year": "XVIII век",
  "origin": "Россия",
  "historyTitle": "Заголовок истории",
  "historyText": "2-3 предложения об истории",
  "tastingColor": "описание цвета",
  "tastingDescription": "описание вкуса, аромата",
  "tastingTemp": "10-12°C",
  "tastingGlass": "тип бокала",
  "tastingPairing": ["Шоколад", "Сыр", "Мясо"],
  "sweet": 85,
  "sour": 30,
  "bitter": 25,
  "spicy": 10,
  "fruity": 90,
  "herbal": 5,
  "tips": ["Совет 1", "Совет 2", "Совет 3"],
  "authorName": "",
  "authorDate": "",
  "ingredients": [
    {"name": "Название", "amount": "500 мл", "note": "примечание"}
  ],
  "steps": [
    {"stepNum": 1, "title": "Заголовок шага", "text": "Описание действия"}
  ],
  "trackerStages": [
    {"stageType": "pour", "title": "Поставить: залить ягоды водкой", "dayOffset": 0},
    {"stageType": "shake", "title": "Взболтать", "dayOffset": 3, "repeatEveryDays": 3},
    {"stageType": "strain", "title": "Процедить и разлить", "dayOffset": 21},
    {"stageType": "taste", "title": "Дегустация", "dayOffset": 25}
  ]
}

ВАЖНО про поле "trackerStages" — НЕ ПРОПУСКАЙ ЕГО, это отдельная обязательная часть ответа:
Это план для календаря напоминаний (Трекер созревания), а НЕ пересказ шагов рецепта.
Один шаг рецепта в прозе может содержать несколько отслеживаемых событий (или ни одного —
если шаг чисто подготовительный, напр. "нарежьте цедру"). Вычлени именно ДЕЙСТВИЯ И ДАТЫ:
- stageType — одно из: pour (поставить/залить), shake (взболтать/помешать), strain (слить/процедить/разлить),
  rest (дать отстояться без действий), taste (дегустация), add_ingredient (досыпать/долить что-то в процессе),
  custom (любое другое разовое действие).
- dayOffset — день от даты старта настойки (0 = день заливки), по срокам, упомянутым в тексте.
- repeatEveryDays — указывай ТОЛЬКО если в тексте явно сказано про периодическое действие
  ("встряхивайте каждые 2-3 дня"). Для разовых действий это поле не указывай.
- Всегда начинай с этапа pour на dayOffset=0 и заканчивай этапом taste на последнем дне.
- Не выдумывай сроки, которых нет в тексте. Обычно 4-7 этапов достаточно.`;

const VALID_STAGE_TYPES = ["pour", "shake", "strain", "rest", "taste", "add_ingredient", "custom"];

// ИИ иногда придумывает stageType, которого нет в допустимом списке (например
// "steep" или русское слово вместо кода) — recipe.upsert такое не сохранит
// и уронит весь рецепт ошибкой валидации. Подстраховываемся здесь же:
// всё, что не входит в список, тихо приводим к "custom" — название шага
// (title) при этом не теряется, только тип иконки в трекере.
function sanitizeTrackerStages(parsed: Record<string, unknown>) {
  if (!Array.isArray(parsed.trackerStages)) return;
  parsed.trackerStages = parsed.trackerStages.map((stage) => {
    if (stage && typeof stage === "object" && "stageType" in stage) {
      const s = stage as Record<string, unknown>;
      if (typeof s.stageType !== "string" || !VALID_STAGE_TYPES.includes(s.stageType)) {
        return { ...s, stageType: "custom" };
      }
    }
    return stage;
  });
}

export const recipeParserRouter = createRouter({
  /* ── Скриншот рецепта → распознанный текст. Результат кладётся в то же
     поле rawText, что и ручной ввод — дальше единый маршрут через generate
     ниже, без дублирования логики разбора. ── */
  recognizeImage: editorQuery
    .input(z.object({ imageBase64: z.string().min(10), mimeType: z.string().default("image/jpeg") }))
    .mutation(async ({ input, ctx }) => {
      const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;
      const messages: ChatMessage[] = [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Распознай текст рецепта на этой картинке." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ];

      try {
        const res = await callChatCompletion(messages, { temperature: 0.2, maxTokens: 3000, model: VISION_MODEL });
        const text = res.answer.trim();
        if (text.length < 5) {
          throw new Error("Модель не распознала текст на изображении — попробуйте более чёткий скриншот или впишите рецепт вручную.");
        }
        await logAiUsage({
          userId: ctx.user.id,
          requestType: REQUEST_TYPE_OCR,
          tokensUsed: res.tokensUsed,
          charge: { wasFree: true, costKopecks: 0 },
          modelUsed: res.modelUsed,
          usedFallback: res.usedFallback,
        });
        return { text };
      } catch (err) {
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE_OCR });
        throw new Error(err instanceof Error ? err.message : "Не удалось распознать изображение");
      }
    }),

  /* ── Текст (набранный вручную или распознанный со скриншота) → структурированная карточка ── */
  generate: editorQuery
    .input(z.object({ rawText: z.string().min(10, "Текст слишком короткий").max(60000, "Текст слишком длинный — максимум 60 000 символов, сократите или разбейте на части") }))
    .mutation(async ({ input, ctx }) => {
      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        { role: "user" as const, content: input.rawText },
      ];

      const res = await callChatCompletion(messages, { temperature: 0.7, maxTokens: 4000, jsonMode: true });

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(res.answer);
      } catch {
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE_TEXT });
        throw new Error("ИИ вернул невалидный JSON — попробуйте ещё раз (иногда помогает повторный запрос)");
      }
      sanitizeTrackerStages(parsed);

      await logAiUsage({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE_TEXT,
        tokensUsed: res.tokensUsed,
        charge: { wasFree: true, costKopecks: 0 },
        modelUsed: res.modelUsed,
        usedFallback: res.usedFallback,
      });

      return parsed;
    }),
});
