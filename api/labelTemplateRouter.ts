import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { labelTemplates, labelTemplateTypes } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export const labelTemplateRouter = createRouter({
  // ─── Types ───
  listTypes: publicQuery.query(async () => {
    return getDb().query.labelTemplateTypes.findMany({
      orderBy: [asc(labelTemplateTypes.sortOrder)],
    });
  }),

  // Все 5 мутаций ниже (upsertType/deleteType/upsert/delete/toggleActive) — раньше
  // publicQuery, доступны без авторизации. Используются только в админке
  // (LabelTemplatesAdmin в AdminPage.tsx), upsertType/deleteType вообще не
  // вызываются с фронта — тем более нет причины держать их открытыми.
  upsertType: adminQuery
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      sortOrder: z.number().default(0),
      isActive: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.id) {
        await db.update(labelTemplateTypes)
          .set({ name: input.name, description: input.description ?? null, sortOrder: input.sortOrder, isActive: input.isActive })
          .where(eq(labelTemplateTypes.id, input.id));
        return { id: input.id };
      } else {
        const [{ id }] = await db.insert(labelTemplateTypes)
          .values({ name: input.name, description: input.description ?? null, sortOrder: input.sortOrder, isActive: input.isActive })
          .$returningId();
        return { id };
      }
    }),

  deleteType: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(labelTemplateTypes).where(eq(labelTemplateTypes.id, input.id));
      return { success: true };
    }),

  // ─── Templates ───
  list: publicQuery.query(async () => {
    return getDb().query.labelTemplates.findMany({
      orderBy: [asc(labelTemplates.sortOrder)],
    });
  }),

  listByType: publicQuery
    .input(z.object({ typeId: z.number() }))
    .query(async ({ input }) => {
      return getDb().query.labelTemplates.findMany({
        where: eq(labelTemplates.typeId, input.typeId),
        orderBy: [asc(labelTemplates.isBase), asc(labelTemplates.sortOrder)],
      });
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getDb().query.labelTemplates.findFirst({
        where: eq(labelTemplates.id, input.id),
      });
    }),

  upsert: adminQuery
    .input(z.object({
      id: z.number().optional(),
      typeId: z.number().nullable().optional(),
      isBase: z.number().default(0),
      name: z.string().min(1),
      image: z.string().nullable().optional(),
      bg: z.string().nullable().optional(),
      border: z.string().nullable().optional(),
      accent: z.string().default("#8B4513"),
      fontFamily: z.string().default("serif"),
      zones: z.any().optional(),
      sortOrder: z.number().default(0),
      isActive: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const data = {
        typeId: input.typeId ?? null,
        isBase: input.isBase,
        name: input.name,
        image: input.image ?? null,
        bg: input.bg ?? null,
        border: input.border ?? null,
        accent: input.accent,
        fontFamily: input.fontFamily,
        zones: input.zones ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      };
      if (input.id) {
        await db.update(labelTemplates).set(data).where(eq(labelTemplates.id, input.id));
        return { id: input.id };
      } else {
        const [{ id }] = await db.insert(labelTemplates).values(data).$returningId();
        return { id };
      }
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().delete(labelTemplates).where(eq(labelTemplates.id, input.id));
      return { success: true };
    }),

  toggleActive: adminQuery
    .input(z.object({ id: z.number(), isActive: z.number() }))
    .mutation(async ({ input }) => {
      await getDb().update(labelTemplates)
        .set({ isActive: input.isActive })
        .where(eq(labelTemplates.id, input.id));
      return { success: true };
    }),
});
