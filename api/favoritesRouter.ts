import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { favorites, places } from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const favoritesRouter = createRouter({
  /* ── ID избранных элементов заданного типа (для быстрой проверки isFavorite на карточке) ── */
  myIds: authedQuery
    .input(z.object({ itemType: z.enum(["place", "recipe"]) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const rows = await db
        .select({ itemId: favorites.itemId })
        .from(favorites)
        .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.itemType, input.itemType)));
      return rows.map((r) => r.itemId);
    }),

  /* ── Добавить/убрать из избранного (переключатель) ── */
  toggle: authedQuery
    .input(z.object({ itemType: z.enum(["place", "recipe"]), itemId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, ctx.user.id),
            eq(favorites.itemType, input.itemType),
            eq(favorites.itemId, input.itemId)
          )
        );

      if (existing.length > 0) {
        await db.delete(favorites).where(eq(favorites.id, existing[0].id));
        return { favorited: false };
      }

      await db.insert(favorites).values({
        userId: ctx.user.id,
        itemType: input.itemType,
        itemId: input.itemId,
      });
      return { favorited: true };
    }),

  /* ── Полные карточки избранных мест (для личного кабинета) ── */
  myPlaces: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const favRows = await db
      .select({ itemId: favorites.itemId })
      .from(favorites)
      .where(and(eq(favorites.userId, ctx.user.id), eq(favorites.itemType, "place")));

    const ids = favRows.map((r) => r.itemId);
    if (ids.length === 0) return [];

    return db.query.places.findMany({ where: inArray(places.id, ids) });
  }),
});
