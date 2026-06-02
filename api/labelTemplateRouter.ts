import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { labelTemplates } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export const labelTemplateRouter = createRouter({
  list: publicQuery.query(async () => {
    return getDb().query.labelTemplates.findMany({
      orderBy: [asc(labelTemplates.sortOrder)],
    });
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getDb().query.labelTemplates.findFirst({
        where: eq(labelTemplates.id, input.id),
      });
    }),

  upsert: publicQuery
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        image: z.string().nullable().optional(),
        bg: z.string().nullable().optional(),
        border: z.string().nullable().optional(),
        accent: z.string().default("#8B4513"),
        fontFamily: z.string().default("serif"),
        sortOrder: z.number().default(0),
        isActive: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.id) {
        await db
          .update(labelTemplates)
          .set({
            name: input.name,
            image: input.image ?? null,
            bg: input.bg ?? null,
            border: input.border ?? null,
            accent: input.accent,
            fontFamily: input.fontFamily,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
          })
          .where(eq(labelTemplates.id, input.id));
        return { id: input.id };
      } else {
        const [{ id }] = await db
          .insert(labelTemplates)
          .values({
            name: input.name,
            image: input.image ?? null,
            bg: input.bg ?? null,
            border: input.border ?? null,
            accent: input.accent,
            fontFamily: input.fontFamily,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
          })
          .$returningId();
        return { id };
      }
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(labelTemplates).where(eq(labelTemplates.id, input.id));
      return { success: true };
    }),

  toggleActive: publicQuery
    .input(z.object({ id: z.number(), isActive: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(labelTemplates)
        .set({ isActive: input.isActive })
        .where(eq(labelTemplates.id, input.id));
      return { success: true };
    }),
});
