import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { aiUsage } from "@db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import OpenAI from "openai";

const client = env.moonshotApiKey
  ? new OpenAI({
      apiKey: env.moonshotApiKey,
      baseURL: "https://api.moonshot.cn/v1",
    })
  : null;

const SYSTEM_PROMPT = `Ты — эксперт по домашним настойкам. Тебе даётся текст рецепта напитка (вишнёвка, самогон, наливка, настойка и т.д.).

Проанализируй текст и извлеки структурированные данные в формате JSON. Если какая-то информация отсутствует в тексте — предложи на основе своих знаний (вкусовой профиль, история, происхождение, сочетания).

Ответь ТОЛЬКО валидным JSON, без markdown, без объяснений:

{
  "slug": "krasnaya-smorodinovka",
  "title": "Красная смородиновка",
  "subtitle": "Классическая ягодная настойка с богатым вкусом",
  "category": "berry",
  "categoryLabel": "Ягодная",
  "abv": "25%",
  "time": "21-30 дней",
  "difficulty": "Средняя",
  "year": "XIX век",
  "origin": "Россия, Средняя полоса",
  "historyTitle": "История смородиновки",
  "historyText": "2-3 абзаца истории напитка...",
  "tastingColor": "Насыщенный рубиново-красный",
  "tastingDescription": "Описание вкуса, аромата, послевкусия...",
  "tastingTemp": "12-14°C",
  "tastingGlass": "Бокал для ликёра или маленький винный",
  "tastingPairing": ["Тёмный шоколад", "Сливочный чизкейк", "Свежие ягоды"],
  "sweet": 70,
  "sour": 50,
  "bitter": 20,
  "spicy": 10,
  "fruity": 85,
  "herbal": 15,
  "tips": ["Используйте только спелые ягоды", "Сахар можно заменить мёдом"],
  "authorName": "Народный рецепт",
  "authorDate": "2025",
  "ingredients": [
    { "name": "Красная смородина", "amount": "1 кг", "note": "свежая или замороженная" },
    { "name": "Водка/спирт", "amount": "0.5 л", "note": "40%" },
    { "name": "Сахар", "amount": "400 г", "note": "можно больше по вкусу" }
  ],
  "steps": [
    { "stepNum": 1, "title": "Подготовка ягод", "text": "Промойте смородину..." },
    { "stepNum": 2, "title": "Заливка", "text": "Залейте ягоды спиртом..." }
  ],
  "trackerStages": [
    { "stageType": "pour", "title": "Поставить: залить ягоды спиртом", "dayOffset": 0 },
    { "stageType": "shake", "title": "Взболтать", "dayOffset": 3, "repeatEveryDays": 3 },
    { "stageType": "strain", "title": "Процедить и разлить", "dayOffset": 21 },
    { "stageType": "taste", "title": "Дегустация", "dayOffset": 25 }
  ]
}

Правила:
- slug: латиница через дефис, маленькие буквы
- category: выбери одно из: berry (ягодная), fruit (фруктовая), citrus (цитрусовая), herbal (травяная), spiced (пряная), bitter (горькая), sweet (сладкая), honey (медовая), coffee (кофейная), floral (цветочная), nut (ореховая), root (корневая), chocolate (шоколадная), vegetable (овощная)
- categoryLabel: русское название выбранной категории (Ягодная / Фруктовая / Цитрусовая / Травяная / Пряная / Горькая / Сладкая / Медовая / Кофейная / Цветочная / Ореховая / Корневая / Шоколадная / Овощная)
- difficulty: Простая | Средняя | Сложная
- sweet/sour/bitter/spicy/fruity/herbal: число от 0 до 100
- tastingPairing: массив строк (закуски/сочетания)
- tips: массив советов (3-5 штук)
- Всегда предлагай историю напитка (2-3 абзаца), даже если в тексте её нет
- Всегда предлагай вкусовой профиль на основе ингредиентов
- Всегда предлагай подходящие закуски
- steps должны быть подробными, с конкретными пропорциями и временем
- trackerStages — ОТДЕЛЬНЫЙ от steps план для календаря напоминаний (Трекер созревания), не пересказ шагов:
  stageType одно из pour/shake/strain/rest/taste/add_ingredient/custom; dayOffset — день от старта (0=день заливки);
  repeatEveryDays указывай только для явно периодических действий ("встряхивайте каждые N дней");
  всегда начинай с pour на dayOffset=0 и заканчивай taste на последнем дне; обычно 4-7 этапов достаточно;
  не выдумывай сроки, которых нет в тексте и которые нельзя разумно вывести из контекста`;

export const recipeParserRouter = createRouter({
  parse: publicQuery
    .input(z.object({
      rawText: z.string().min(10),
      fingerprint: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!client) {
        return { ok: false as const, error: "MOONSHOT_API_KEY не настроен на сервере" };
      }

      /* Проверка лимитов */
      const db = getDb();
      if (!ctx.user) {
        const fp = input.fingerprint || "unknown";
        const countRes = await db.select({ count: sql<number>`count(*)` })
          .from(aiUsage)
          .where(and(
            eq(aiUsage.fingerprint, fp),
            eq(aiUsage.requestType, "recipe_parse"),
          ));
        if ((countRes[0]?.count ?? 0) >= 2) {
          return {
            ok: false as const,
            error: "Лимит бесплатных запросов исчерпан (2 из 2). Войдите в аккаунт для продолжения.",
          };
        }
      }

      try {
        const completion = await client.chat.completions.create({
          model: "moonshot-v1-8k",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: input.rawText },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);

        /* Сохраняем использование */
        await db.insert(aiUsage).values({
          userId: ctx.user?.id ?? null,
          fingerprint: input.fingerprint || null,
          requestType: "recipe_parse",
          tokensUsed: completion.usage?.total_tokens ?? 0,
        });

        return { ok: true as const, data: parsed };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { ok: false as const, error: message };
      }
    }),

  checkLimit: publicQuery
    .input(z.object({ fingerprint: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      if (ctx.user) {
        const todayCount = await db.select({ count: sql<number>`count(*)` })
          .from(aiUsage)
          .where(and(
            eq(aiUsage.userId, ctx.user.id),
            eq(aiUsage.requestType, "recipe_parse"),
            gte(aiUsage.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
          ));
        const remaining = Math.max(0, 5 - (todayCount[0]?.count ?? 0));
        return { allowed: remaining > 0, remaining, isLoggedIn: true };
      }
      const totalCount = await db.select({ count: sql<number>`count(*)` })
        .from(aiUsage)
        .where(and(
          eq(aiUsage.fingerprint, input.fingerprint),
          eq(aiUsage.requestType, "recipe_parse"),
        ));
      const count = totalCount[0]?.count ?? 0;
      return { allowed: count < 2, remaining: Math.max(0, 2 - count), isLoggedIn: false };
    }),
});
