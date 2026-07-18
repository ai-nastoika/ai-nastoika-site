import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { feedback, userRecipeSubmissions, placeSubmissions } from "@db/schema";
import { eq, count, and, ne } from "drizzle-orm";

export const adminStatsRouter = createRouter({
  /* ── Сводный счётчик для бейджа на кнопке "Админка" в шапке ──
     Новые обращения (не архивные и не отвеченные) + рецепты и заведения на модерации. */
  pendingCount: adminQuery.query(async () => {
    const db = getDb();

    const [feedbackRows, recipeSubmissionRows, placeSubmissionRows] = await Promise.all([
      db
        .select({ value: count() })
        .from(feedback)
        .where(and(ne(feedback.status, "replied"), ne(feedback.status, "archived"))),
      db.select({ value: count() }).from(userRecipeSubmissions).where(eq(userRecipeSubmissions.status, "pending")),
      db.select({ value: count() }).from(placeSubmissions).where(eq(placeSubmissions.status, "pending")),
    ]);

    const feedbackCount = Number(feedbackRows[0]?.value ?? 0);
    const recipeCount = Number(recipeSubmissionRows[0]?.value ?? 0);
    const placeCount = Number(placeSubmissionRows[0]?.value ?? 0);

    return {
      feedback: feedbackCount,
      recipes: recipeCount,
      places: placeCount,
      total: feedbackCount + recipeCount + placeCount,
    };
  }),
});
