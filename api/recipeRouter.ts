import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recipes, recipeIngredients, recipeSteps, recipeTrackerStages } from "@db/schema";
import { eq } from "drizzle-orm";
import { normalizeText, diceCoefficient, fuzzyIngredientOverlap } from "./lib/similarity";
import { env } from "./lib/env";
import OpenAI from "openai";

const moonshotClient = env.moonshotApiKey
  ? new OpenAI({ apiKey: env.moonshotApiKey, baseURL: "https://api.moonshot.cn/v1" })
  : null;

/* Тот же набор типов этапов, что и в самом Трекере созревания (api/infusionRouter.ts) —
   плюс add_ingredient для случаев, когда в процессе настаивания нужно что-то досыпать/долить. */
const TRACKER_STAGES_PROMPT = `Ты — эксперт по домашним настойкам. По тексту рецепта (ингредиенты + шаги приготовления)
составь план этапов для трекера созревания — календаря напоминаний пользователю.

ВАЖНО: это НЕ пересказ шагов рецепта. Один шаг рецепта в прозе может содержать несколько
отслеживаемых событий (или ни одного — если шаг чисто подготовительный, напр. "нарежьте цедру").
Твоя задача — вычленить именно ДЕЙСТВИЯ И ДАТЫ, которые нужно отследить по календарю.

Ответь ТОЛЬКО валидным JSON вида:
{
  "stages": [
    { "stageType": "pour", "title": "Поставить: залить вишню водкой", "dayOffset": 0 },
    { "stageType": "shake", "title": "Взболтать", "dayOffset": 3, "repeatEveryDays": 3 },
    { "stageType": "add_ingredient", "title": "Добавить сироп", "dayOffset": 14 },
    { "stageType": "rest", "title": "Дать отстояться", "dayOffset": 14 },
    { "stageType": "strain", "title": "Процедить и разлить", "dayOffset": 21 },
    { "stageType": "taste", "title": "Дегустация", "dayOffset": 25 }
  ]
}

Правила:
- stageType — одно из: pour (поставить/залить), shake (взболтать/помешать), strain (слить/процедить/разлить),
  rest (дать отстояться без действий), taste (дегустация), add_ingredient (досыпать/долить что-то в процессе),
  custom (любое другое разовое действие).
- dayOffset — день от даты старта настойки (0 = день заливки), считая по срокам, упомянутым в тексте.
- repeatEveryDays — указывай ТОЛЬКО если в тексте явно сказано про периодическое действие
  ("встряхивайте каждые 2-3 дня", "ежедневно помешивайте" и т.п.). Для разовых действий не указывай это поле.
- Всегда начинай с этапа pour на dayOffset=0.
- Всегда заканчивай этапом taste на последнем дне.
- Не выдумывай сроки, которых нет в тексте и которые нельзя разумно вывести из контекста рецепта.
- Обычно 4-7 этапов достаточно.`;

export const recipeRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.query.recipes.findMany({
      orderBy: (recipes, { desc }) => [desc(recipes.createdAt)],
      with: { ingredients: true },
    });
  }),

  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.slug, input.slug),
        with: {
          ingredients: true,
          steps: true,
          comments: true,
        },
      });
      return recipe ?? null;
    }),

  byCategory: publicQuery
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.recipes.findMany({
        where: eq(recipes.category, input.category),
      });
    }),

  /* ── Проверка на дубликаты: похожесть названия + категория + пересечение ингредиентов.
     Способ приготовления НЕ сравнивается алгоритмически — это решает человек,
     здесь только подсвечиваются кандидаты для сравнения. ── */
  checkDuplicates: publicQuery
    .input(
      z.object({
        title: z.string().min(1),
        category: z.string().optional(),
        ingredients: z.array(z.string()).optional(),
        excludeId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const all = await db.query.recipes.findMany({ with: { ingredients: true } });
      const candidateTitle = normalizeText(input.title);
      const candidateIngredients = input.ingredients ?? [];

      const scored = all
        .filter((r) => r.id !== input.excludeId)
        .map((r) => {
          const titleSim = diceCoefficient(candidateTitle, normalizeText(r.title));
          const categoryMatch = input.category && r.category === input.category ? 1 : 0;
          const existingIngredientNames = (r.ingredients ?? []).map((i: { name: string }) => i.name);
          const ingOverlap = fuzzyIngredientOverlap(candidateIngredients, existingIngredientNames);
          const score = titleSim * 0.4 + categoryMatch * 0.2 + ingOverlap * 0.4;
          return { recipe: r, score, ingOverlap };
        })
        .filter((r) => r.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return scored.map((r) => ({
        id: r.recipe.id,
        slug: r.recipe.slug,
        title: r.recipe.title,
        category: r.recipe.category,
        heroImage: r.recipe.heroImage,
        score: Math.round(r.score * 100),
        ingredientOverlapPercent: Math.round(r.ingOverlap * 100),
      }));
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, input.id));
      await db.delete(recipeSteps).where(eq(recipeSteps.recipeId, input.id));
      await db.delete(recipes).where(eq(recipes.id, input.id));
      return { success: true };
    }),

  upsert: publicQuery
    .input(
      z.object({
        id: z.number().optional(),
        slug: z.string().min(1),
        title: z.string().min(1),
        subtitle: z.string().optional(),
        category: z.string().min(1),
        categoryLabel: z.string().optional(),
        heroImage: z.string().optional(),
        abv: z.string().optional(),
        time: z.string().optional(),
        difficulty: z.string().optional(),
        rating: z.string().optional(),
        reviews: z.number().optional(),
        year: z.string().optional(),
        origin: z.string().optional(),
        historyTitle: z.string().optional(),
        historyText: z.string().optional(),
        tastingColor: z.string().optional(),
        tastingDescription: z.string().optional(),
        tastingPairing: z.array(z.string()).optional(),
        tastingTemp: z.string().optional(),
        tastingGlass: z.string().optional(),
        sweet: z.number().optional(),
        sour: z.number().optional(),
        bitter: z.number().optional(),
        spicy: z.number().optional(),
        fruity: z.number().optional(),
        herbal: z.number().optional(),
        tips: z.array(z.string()).optional(),
        authorName: z.string().optional(),
        authorDate: z.string().optional(),
        ingredients: z.array(
          z.object({
            name: z.string().min(1),
            amount: z.string().optional(),
            note: z.string().optional(),
          })
        ).optional(),
        steps: z.array(
          z.object({
            stepNum: z.number(),
            title: z.string().optional(),
            text: z.string().min(1),
          })
        ).optional(),
        trackerStages: z.array(
          z.object({
            stageType: z.enum(["pour", "shake", "strain", "rest", "taste", "add_ingredient", "custom"]),
            title: z.string().min(1).max(300),
            dayOffset: z.number().min(0),
            repeatEveryDays: z.number().min(1).max(90).optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ingredients, steps, trackerStages, ...data } = input;

      let recipeId: number;

      if (id) {
        await db.update(recipes).set(data).where(eq(recipes.id, id));
        recipeId = id;
        await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
        await db.delete(recipeSteps).where(eq(recipeSteps.recipeId, id));
        if (trackerStages) {
          await db.delete(recipeTrackerStages).where(eq(recipeTrackerStages.recipeId, id));
        }
      } else {
        const [{ id: newId }] = await db.insert(recipes).values(data).$returningId();
        recipeId = newId;
      }

      if (ingredients && ingredients.length > 0) {
        await db.insert(recipeIngredients).values(
          ingredients.map((ing, i) => ({ ...ing, recipeId, sortOrder: i }))
        );
      }

      if (steps && steps.length > 0) {
        await db.insert(recipeSteps).values(
          steps.map((s, i) => ({ ...s, recipeId, sortOrder: i }))
        );
      }

      if (trackerStages && trackerStages.length > 0) {
        await db.insert(recipeTrackerStages).values(
          trackerStages.map((s, i) => ({ ...s, recipeId, sortOrder: i }))
        );
      }

      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        with: { ingredients: true, steps: true, trackerStages: true },
      });
      return recipe;
    }),

  /* ── Рецепты, у которых ещё нет разметки для трекера (для массовой ИИ-обработки) ── */
  listWithoutTrackerStages: adminQuery.query(async () => {
    const db = getDb();
    const all = await db.query.recipes.findMany({ with: { trackerStages: true } });
    return all.filter((r) => r.trackerStages.length === 0).map((r) => ({ id: r.id, title: r.title }));
  }),

  /* ── Разметить этапы трекера через ИИ (для существующих рецептов без разметки) ── */
  generateTrackerStagesAI: adminQuery
    .input(z.object({ recipeId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, input.recipeId),
        with: { ingredients: true, steps: true },
      });
      if (!recipe) throw new Error("Рецепт не найден");
      if (!moonshotClient) throw new Error("MOONSHOT_API_KEY не настроен на сервере");

      const ingredientsText = recipe.ingredients.map((i) => `${i.name} ${i.amount ?? ""}`).join(", ");
      const stepsText = recipe.steps.map((s) => `${s.stepNum}. ${s.title ?? ""}: ${s.text}`).join("\n");

      const completion = await moonshotClient.chat.completions.create({
        model: "moonshot-v1-8k",
        messages: [
          { role: "system", content: TRACKER_STAGES_PROMPT },
          { role: "user", content: `Рецепт: ${recipe.title}\nИнгредиенты: ${ingredientsText}\nШаги:\n${stepsText}` },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { stages: { stageType: string; title: string; dayOffset: number; repeatEveryDays?: number }[] };
      const stages = parsed.stages ?? [];

      await db.delete(recipeTrackerStages).where(eq(recipeTrackerStages.recipeId, input.recipeId));
      if (stages.length > 0) {
        await db.insert(recipeTrackerStages).values(
          stages.map((s, i) => ({
            recipeId: input.recipeId,
            stageType: s.stageType,
            title: s.title,
            dayOffset: s.dayOffset,
            repeatEveryDays: s.repeatEveryDays,
            sortOrder: i,
          }))
        );
      }

      return { stages };
    }),
});
