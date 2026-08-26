import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { labelExamples } from "@db/schema";
import { eq, asc, desc, count } from "drizzle-orm";

/* ── Витрина примеров сгенерированных этикеток на странице генератора ──
   Пополняется вручную администраторами — это не автосохранение всех
   генераций пользователей, а отобранные удачные примеры с промптами,
   чтобы вдохновлять новых посетителей и подсказывать, как формулировать
   запрос. ── */
export const labelExampleRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(labelExamples).orderBy(asc(labelExamples.sortOrder), desc(labelExamples.createdAt));
  }),

  create: adminQuery
    .input(
      z.object({
        imageUrl: z.string().min(1),
        prompt: z.string().min(1).max(2000),
        title: z.string().max(150).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      // Новый пример — в конец списка (по возрастанию sortOrder).
      const existing = await db.select({ value: count() }).from(labelExamples);
      await db.insert(labelExamples).values({
        imageUrl: input.imageUrl,
        prompt: input.prompt,
        title: input.title,
        sortOrder: Number(existing[0]?.value ?? 0),
      });
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(labelExamples).where(eq(labelExamples.id, input.id));
      return { success: true };
    }),
});
