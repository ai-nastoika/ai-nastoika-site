import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recipes, recipeIngredients, recipeSteps } from "@db/schema";
import { eq } from "drizzle-orm";
import { normalizeText, diceCoefficient, jaccardSimilarity } from "./lib/similarity";

export const recipeRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.query.recipes.findMany({
      orderBy: (recipes, { desc }) => [desc(recipes.createdAt)],
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
      const candidateIngSet = new Set((input.ingredients ?? []).map((i) => normalizeText(i)));

      const scored = all
        .filter((r) => r.id !== input.excludeId)
        .map((r) => {
          const titleSim = diceCoefficient(candidateTitle, normalizeText(r.title));
          const categoryMatch = input.category && r.category === input.category ? 1 : 0;
          const existingIngSet = new Set(
            (r.ingredients ?? []).map((i: { name: string }) => normalizeText(i.name))
          );
          const ingJaccard = jaccardSimilarity(candidateIngSet, existingIngSet);
          const score = titleSim * 0.4 + categoryMatch * 0.2 + ingJaccard * 0.4;
          return { recipe: r, score, ingJaccard };
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
        ingredientOverlapPercent: Math.round(r.ingJaccard * 100),
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
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ingredients, steps, ...data } = input;

      let recipeId: number;

      if (id) {
        await db.update(recipes).set(data).where(eq(recipes.id, id));
        recipeId = id;
        await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
        await db.delete(recipeSteps).where(eq(recipeSteps.recipeId, id));
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

      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, recipeId),
        with: { ingredients: true, steps: true },
      });
      return recipe;
    }),
});
