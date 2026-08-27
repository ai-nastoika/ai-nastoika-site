import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { comments } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, getClientIp } from "./lib/rateLimit";
import { TRPCError } from "@trpc/server";

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
    .mutation(async ({ input, ctx }) => {
      // Без авторизации оставляют комментарии/отзывы — единственная защита от
      // спам-бота здесь. 5 сообщений за 5 минут с одного IP — с запасом для
      // живого человека, но не даёт залить базу тысячами записей за минуту.
      const ip = getClientIp(ctx.req);
      const rl = checkRateLimit(`comment:${ip}`, 5, 5 * 60 * 1000);
      if (!rl.allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Слишком много сообщений подряд. Попробуйте через ${rl.retryAfterSec} сек.` });
      }
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
