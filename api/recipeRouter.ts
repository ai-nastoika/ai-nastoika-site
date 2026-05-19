import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recipes } from "@db/schema";
import { eq } from "drizzle-orm";

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
});
