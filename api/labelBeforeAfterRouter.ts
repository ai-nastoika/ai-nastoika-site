import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { labelBeforeAfter } from "@db/schema";
import { eq, desc } from "drizzle-orm";

/* ── Блок "Было/Стало" на вводной странице Этикетки (LabelIntroPage.tsx) ──
   Отдельная сущность от labelExampleRouter намеренно: раньше страница молча
   подтягивала первый пример из общей витрины примеров, что на практике
   оказывалось непредсказуемым (последним загруженным, а не первым, из-за
   особенностей сортировки той таблицы) — плохо для самого заметного блока
   на странице. Теперь администратор осознанно выбирает пару "было"/"стало". */
export const labelBeforeAfterRouter = createRouter({
  // Публичная страница показывает самую свежую пару — list возвращает все,
  // на клиенте используется первая (см. LabelIntroPage.tsx).
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(labelBeforeAfter).orderBy(desc(labelBeforeAfter.createdAt));
  }),

  create: adminQuery
    .input(
      z.object({
        beforeImageUrl: z.string().min(1, "Загрузите фото «Было»"),
        afterImageUrl: z.string().min(1, "Загрузите фото «Стало»"),
        title: z.string().max(150).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(labelBeforeAfter).values({
        beforeImageUrl: input.beforeImageUrl,
        afterImageUrl: input.afterImageUrl,
        title: input.title,
      });
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(labelBeforeAfter).where(eq(labelBeforeAfter.id, input.id));
      return { success: true };
    }),
});
