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
          comments: true,
        },
      });
      return place ?? null;
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(places).where(eq(places.id, input.id));
      return { success: true };
    }),

  upsert: publicQuery
    .input(
      z.object({
        id: z.number().optional(),
        slug: z.string().min(1),
        name: z.string().min(1),
        city: z.string().optional(),
        address: z.string().optional(),
        metro: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        rating: z.string().optional(),
        reviews: z.number().optional(),
        price: z.string().optional(),
        hours: z.string().optional(),
        image: z.string().optional(),
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        infusionsHighlight: z.string().optional(),
        infusionsSignature: z.string().optional(),
        externalSource: z.string().optional(),
        externalSummary: z.string().optional(),
        externalPros: z.array(z.string()).optional(),
        externalCons: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;

      if (id) {
        await db.update(places).set(data).where(eq(places.id, id));
        return db.query.places.findFirst({ where: eq(places.id, id) });
      } else {
        const [{ id: newId }] = await db.insert(places).values(data).$returningId();
        return db.query.places.findFirst({ where: eq(places.id, newId) });
      }
    }),
});
