import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { savedLabels } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const savedLabelsRouter = createRouter({
  // Get all saved labels for current user
  list: authedQuery.query(async ({ ctx }) => {
    return getDb().query.savedLabels.findMany({
      where: eq(savedLabels.userId, ctx.user.id),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
  }),

  // Save or update label
  save: authedQuery
    .input(z.object({
      id: z.number().optional(),        // if provided — update
      templateId: z.number(),
      labelText: z.string().default(""),
      labelDate: z.string().default(""),
      labelStrength: z.string().default(""),
      imageShape: z.string().default("rect"),
      imageZoneScale: z.string().default("1"),
      previewUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.id) {
        // Update existing
        await db.update(savedLabels)
          .set({
            templateId: input.templateId,
            labelText: input.labelText,
            labelDate: input.labelDate,
            labelStrength: input.labelStrength,
            imageShape: input.imageShape,
            imageZoneScale: input.imageZoneScale,
            previewUrl: input.previewUrl ?? null,
            updatedAt: new Date(),
          })
          .where(and(
            eq(savedLabels.id, input.id),
            eq(savedLabels.userId, ctx.user.id)
          ));
        return { id: input.id };
      } else {
        // Create new
        const [{ id }] = await db.insert(savedLabels)
          .values({
            userId: ctx.user.id,
            templateId: input.templateId,
            labelText: input.labelText,
            labelDate: input.labelDate,
            labelStrength: input.labelStrength,
            imageShape: input.imageShape,
            imageZoneScale: input.imageZoneScale,
            previewUrl: input.previewUrl ?? null,
          })
          .$returningId();
        return { id };
      }
    }),

  // Delete saved label
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb().delete(savedLabels)
        .where(and(
          eq(savedLabels.id, input.id),
          eq(savedLabels.userId, ctx.user.id)
        ));
      return { success: true };
    }),
});
