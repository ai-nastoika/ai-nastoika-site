import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { comments } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const commentRouter = createRouter({
  byRecipe: publicQuery
    .input(z.object({ recipeId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.comments.findMany({
        where: eq(comments.recipeId, input.recipeId),
        orderBy: [desc(comments.createdAt)],
      });
    }),

  byPlace: publicQuery
    .input(z.object({ placeId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.comments.findMany({
        where: eq(comments.placeId, input.placeId),
        orderBy: [desc(comments.createdAt)],
      });
    }),

  create: publicQuery
    .input(
      z.object({
        recipeId: z.number().optional(),
        placeId: z.number().optional(),
        authorName: z.string().min(1),
        authorAvatar: z.string().max(10).optional(),
        text: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(comments)
        .values({
          recipeId: input.recipeId ?? null,
          placeId: input.placeId ?? null,
          authorName: input.authorName,
          authorAvatar: input.authorAvatar ?? null,
          text: input.text,
          likes: 0,
        })
        .$returningId();
      return db.query.comments.findFirst({ where: eq(comments.id, id) });
    }),

  like: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.comments.findFirst({
        where: eq(comments.id, input.id),
      });
      if (!existing) return null;
      await db
        .update(comments)
        .set({ likes: (existing.likes ?? 0) + 1 })
        .where(eq(comments.id, input.id));
      return db.query.comments.findFirst({
        where: eq(comments.id, input.id),
      });
    }),
});
