import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userRecipeSubmissions } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const submissionRouter = createRouter({
  /* ── Create draft ── */
  create: publicQuery
    .input(
      z.object({
        authorName: z.string().min(1),
        fingerprint: z.string().optional(),
        rawTitle: z.string().min(1),
        rawDescription: z.string().optional(),
        rawIngredients: z.string().optional(),
        rawSteps: z.string().optional(),
        rawNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [{ id }] = await db.insert(userRecipeSubmissions).values({
        userId: ctx.user?.id ?? null,
        fingerprint: input.fingerprint ?? null,
        authorName: input.authorName,
        rawTitle: input.rawTitle,
        rawDescription: input.rawDescription ?? null,
        rawIngredients: input.rawIngredients ?? null,
        rawSteps: input.rawSteps ?? null,
        rawNotes: input.rawNotes ?? null,
        status: "draft",
      }).$returningId();
      return { id };
    }),

  /* ── Save AI-processed data ── */
  saveProcessed: publicQuery
    .input(
      z.object({
        id: z.number(),
        processedData: z.string(),
        slug: z.string().optional(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
        category: z.string().optional(),
        categoryLabel: z.string().optional(),
        abv: z.string().optional(),
        time: z.string().optional(),
        difficulty: z.string().optional(),
        year: z.string().optional(),
        origin: z.string().optional(),
        historyTitle: z.string().optional(),
        historyText: z.string().optional(),
        tastingColor: z.string().optional(),
        tastingDescription: z.string().optional(),
        tastingTemp: z.string().optional(),
        tastingGlass: z.string().optional(),
        sweet: z.number().optional(),
        sour: z.number().optional(),
        bitter: z.number().optional(),
        spicy: z.number().optional(),
        fruity: z.number().optional(),
        herbal: z.number().optional(),
        authorDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb()
        .update(userRecipeSubmissions)
        .set({ ...data, status: "ai_processed" })
        .where(eq(userRecipeSubmissions.id, id));
      return { success: true };
    }),

  /* ── Submit for moderation ── */
  submit: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(userRecipeSubmissions)
        .set({ status: "pending" })
        .where(eq(userRecipeSubmissions.id, input.id));
      return { success: true };
    }),

  /* ── Get by id ── */
  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getDb().query.userRecipeSubmissions.findFirst({
        where: eq(userRecipeSubmissions.id, input.id),
      });
    }),

  /* ── List pending (admin) ── */
  listPending: publicQuery.query(async () => {
    return getDb().query.userRecipeSubmissions.findMany({
      where: eq(userRecipeSubmissions.status, "pending"),
      orderBy: [desc(userRecipeSubmissions.createdAt)],
    });
  }),

  /* ── List all for moderation (admin) ── */
  listAll: publicQuery.query(async () => {
    return getDb().query.userRecipeSubmissions.findMany({
      orderBy: [desc(userRecipeSubmissions.createdAt)],
    });
  }),

  /* ── Approve ── */
  approve: publicQuery
    .input(z.object({ id: z.number(), adminNotes: z.string().optional() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(userRecipeSubmissions)
        .set({ status: "approved", adminNotes: input.adminNotes ?? null })
        .where(eq(userRecipeSubmissions.id, input.id));
      return { success: true };
    }),

  /* ── Reject ── */
  reject: publicQuery
    .input(z.object({ id: z.number(), adminNotes: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(userRecipeSubmissions)
        .set({ status: "rejected", adminNotes: input.adminNotes })
        .where(eq(userRecipeSubmissions.id, input.id));
      return { success: true };
    }),
});
