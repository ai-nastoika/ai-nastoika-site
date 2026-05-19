import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { places } from "@db/schema";
import { eq } from "drizzle-orm";

export const placeRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.query.places.findMany({
      orderBy: (places, { desc }) => [desc(places.createdAt)],
    });
  }),

  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const place = await db.query.places.findFirst({
        where: eq(places.slug, input.slug),
        with: {
          infusions: true,
          comments: true,
        },
      });
      return place ?? null;
    }),
});
