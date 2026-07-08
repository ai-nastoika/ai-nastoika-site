import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { places, placeInfusions } from "@db/schema";
import { eq } from "drizzle-orm";

export const placeRouter = createRouter({
  /* ── Публичный список — только одобренные места (для барной карты) ── */
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.query.places.findMany({
      where: eq(places.status, "approved"),
      orderBy: (places, { desc }) => [desc(places.createdAt)],
      with: { infusions: true },
    });
  }),

  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const place = await db.query.places.findFirst({
        where: eq(places.slug, input.slug),
        with: { infusions: true, comments: true },
      });
      return place ?? null;
    }),

  /* ── Только админ ── */
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(placeInfusions).where(eq(placeInfusions.placeId, input.id));
      await db.delete(places).where(eq(places.id, input.id));
      return { success: true };
    }),

  upsert: adminQuery
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
        lat: z.number().optional(),
        lng: z.number().optional(),
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
        infusions: z
          .array(
            z.object({
              name: z.string().min(1),
              note: z.string().optional(),
              isSignature: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, infusions, ...data } = input;
      let placeId: number;

      if (id) {
        await db.update(places).set({ ...data, status: "approved" }).where(eq(places.id, id));
        placeId = id;
        await db.delete(placeInfusions).where(eq(placeInfusions.placeId, id));
      } else {
        const [{ id: newId }] = await db
          .insert(places)
          .values({ ...data, status: "approved" })
          .$returningId();
        placeId = newId;
      }

      if (infusions && infusions.length > 0) {
        await db.insert(placeInfusions).values(
          infusions.map((inf) => ({
            placeId,
            name: inf.name,
            note: inf.note ?? null,
            isSignature: inf.isSignature ? 1 : 0,
          }))
        );
      }

      return db.query.places.findFirst({
        where: eq(places.id, placeId),
        with: { infusions: true },
      });
    }),
});
