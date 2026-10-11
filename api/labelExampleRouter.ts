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

  /* Правка: картинка необязательна (не передали — остаётся прежняя),
     подпись можно очистить (пустая строка -> null). */
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        imageUrl: z.string().min(1).optional(),
        prompt: z.string().min(1).max(2000),
        title: z.string().max(150).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(labelExamples)
        .set({
          prompt: input.prompt,
          title: input.title?.trim() ? input.title.trim() : null,
          ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        })
        .where(eq(labelExamples.id, input.id));
      return { success: true };
    }),

  /* Порядок на витрине: получаем id в нужной последовательности и
     проставляем sortOrder = позиция. Так не мешают «дыры» и повторы
     sortOrder, накопившиеся после удалений. */
  reorder: adminQuery
    .input(z.object({ ids: z.array(z.number()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      for (let i = 0; i < input.ids.length; i++) {
        await db.update(labelExamples).set({ sortOrder: i }).where(eq(labelExamples.id, input.ids[i]));
      }
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
