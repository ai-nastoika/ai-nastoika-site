import { z } from "zod";
import { createRouter, editorQuery } from "./middleware";
import { callChatCompletion } from "./lib/aiClient";
import { generateImage } from "./lib/imageClient";
import { logAiUsage, logAiFailure } from "./lib/aiAccess";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
const REQUEST_TYPE_IMAGE = "recipe_parser_image";

const __dirname = import.meta.dirname;
// Та же папка, что в api/boot.ts для /api/upload-image (там из api/, тут тоже из api/ — один уровень вверх).
const uploadsDir = path.resolve(__dirname, "..", "uploads", "recipes");

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
10. Для imagePrompt напиши на АНГЛИЙСКОМ простое, спокойное описание сцены для фото этой настойки в альбомной ориентации (16:9) — без вычурности и "рекламной" перенасыщенности, просто аппетитно и естественно, натуральные тона (не кислотно-яркие, не студийная пересветка). Опиши: красивую или оригинальную бутылку/графин, по форме и стилю подходящую характеру именно этой настойки (например, гранёный графин для крепкой пряной, изящная узкая бутылка для лёгкой цитрусовой, глиняный кувшин для травяной) — сосуд полностью в кадре вместе с пробкой/крышкой, ничего не обрезано; рядом — 2-3 главных ингредиента из состава этого рецепта; и что-то из раздела "с чем подавать" (tastingPairing) этого же рецепта в качестве закуски рядом. Больше ничего не добавляй — не нужно нагромождать реквизит, специи россыпью, ткани, цветы и т.п., если их не назвал сам рецепт.
   Если характер настойки уместно предполагает открытую натуру (ягодная — лесная поляна или сад, травяная — луг или огород, медовая — пасека, зимняя пряная — заснеженный двор и т.п.) — иногда (не всегда, для разнообразия) вынеси сцену на улицу: сосуд на подоконнике, деревянном столе в саду или на пне, с размытым природным пейзажем на фоне вместо интерьера. Для настоек без явной "уличной" ассоциации (кофейная, шоколадная и т.п.) оставляй уютный интерьер.
   ОБЯЗАТЕЛЬНЫЕ технические требования, добавляй в конец дословно (эта часть не варьируется): "the liquid inside the vessel itself must be completely clear with no berries, fruit pieces or herbs floating inside it — ingredients and pairing food are placed around the vessel, never inside it; the entire bottle or decanter including its cork or cap fully visible within the frame, nothing cropped; natural, true-to-life lighting suited to the scene — soft daylight, warm afternoon light, gentle overcast, or golden hour, never flat overexposed studio-white lighting and never a dark or gloomy room; natural, moderate colors, not oversaturated; photorealistic, horizontal composition, landscape orientation, 16:9 aspect ratio".

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
  "imagePrompt": "A calm, natural scene: a bottle or decanter whose shape and style matches this recipe's character, 2-3 of its main ingredients nearby, a pairing snack from tastingPairing, and — when it fits the character of the infusion — sometimes an outdoor natural backdrop instead of an interior. End with: the liquid inside the vessel itself must be completely clear with no berries, fruit pieces or herbs floating inside it — ingredients and pairing food are placed around the vessel, never inside it; the entire bottle or decanter including its cork or cap fully visible within the frame, nothing cropped; natural, true-to-life lighting suited to the scene, never flat overexposed studio-white lighting and never a dark or gloomy room; natural, moderate colors, not oversaturated; photorealistic, horizontal composition, landscape orientation, 16:9 aspect ratio",
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

function saveGeneratedImage(base64: string): string {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const fileName = `recipe-ai-${crypto.randomBytes(8).toString("hex")}.png`;
  fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(base64, "base64"));
  return `/uploads/recipes/${fileName}`;
}

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
  /* ── Текст (набранный вручную или расшифровка видео) → структурированная карточка + картинка ── */
  generate: editorQuery
    .input(z.object({ rawText: z.string().min(10).max(20000), generateImage: z.boolean().default(true) }))
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

      // Картинку генерируем сразу следом, промпт для неё приходит только
      // из этого же JSON-ответа — раньше эту генерацию делали руками отдельно.
      // Сбой картинки не должен ронять весь результат — карточку можно
      // сохранить и без неё, добавить картинку вручную или перегенерировать
      // отдельной кнопкой (recipeParser.regenerateImage).
      let heroImage: string | undefined;
      let imageError: string | undefined;
      const imagePrompt = typeof parsed.imagePrompt === "string" ? parsed.imagePrompt : "";
      if (input.generateImage && imagePrompt) {
        try {
          const image = await generateImage(imagePrompt, "1536x1024");
          heroImage = image.imageBase64 ? saveGeneratedImage(image.imageBase64) : image.imageUrl;
          await logAiUsage({
            userId: ctx.user.id,
            requestType: REQUEST_TYPE_IMAGE,
            tokensUsed: 0,
            charge: { wasFree: true, costKopecks: 0 },
          });
        } catch (err) {
          imageError = err instanceof Error ? err.message : "Не удалось сгенерировать картинку";
          await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE_IMAGE });
        }
      }

      return { ...parsed, heroImage, imageError };
    }),

  /* ── Перегенерировать только картинку (если автоматическая не понравилась) ── */
  regenerateImage: editorQuery
    .input(z.object({ prompt: z.string().min(3).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const image = await generateImage(input.prompt, "1536x1024");
        const heroImage = image.imageBase64 ? saveGeneratedImage(image.imageBase64) : image.imageUrl;
        if (!heroImage) throw new Error("ИИ не вернул изображение — попробуйте ещё раз");
        await logAiUsage({
          userId: ctx.user.id,
          requestType: REQUEST_TYPE_IMAGE,
          tokensUsed: 0,
          charge: { wasFree: true, costKopecks: 0 },
        });
        return { heroImage };
      } catch (err) {
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE_IMAGE });
        throw err;
      }
    }),
});
