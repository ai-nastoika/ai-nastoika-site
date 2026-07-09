import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { placeSubmissions, places } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const placeSubmissionRouter = createRouter({
  /* ── Определить координаты по ссылке на Яндекс.Карты ──
     Работает и с короткими (https://yandex.ru/maps/-/XXXXXXXX),
     и с полными ссылками — просто идём по редиректу и парсим ll= из финального URL. */
  resolveUrl: publicQuery
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      try {
        const res = await fetch(input.url, { redirect: "follow" });
        const finalUrl = res.url;
        const match = finalUrl.match(/[?&]ll=([\d.]+)%2C([\d.]+)/) || finalUrl.match(/[?&]ll=([\d.]+),([\d.]+)/);
        if (!match) {
          return { lat: null, lng: null, finalUrl };
        }
        return { lng: Number(match[1]), lat: Number(match[2]), finalUrl };
      } catch {
        return { lat: null, lng: null, finalUrl: null };
      }
    }),

  create: publicQuery
    .input(
      z.object({
        authorName: z.string().min(1),
        contactEmail: z.string().email().optional(),
        fingerprint: z.string().optional(),
        rawUrl: z.string().optional(),
        rawCoords: z.string().optional(),
        rawAddress: z.string().optional(),
        rawPhone: z.string().optional(),
        rawHours: z.string().optional(),
        rawReviews: z.string().optional(),
        rawNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(placeSubmissions)
        .values({
          userId: ctx.user?.id ?? null,
          fingerprint: input.fingerprint ?? null,
          authorName: input.authorName,
          contactEmail: input.contactEmail ?? null,
          rawUrl: input.rawUrl ?? null,
          rawCoords: input.rawCoords ?? null,
          rawAddress: input.rawAddress ?? null,
          rawPhone: input.rawPhone ?? null,
          rawHours: input.rawHours ?? null,
          rawReviews: input.rawReviews ?? null,
          rawNotes: input.rawNotes ?? null,
          status: "draft",
        })
        .$returningId();
      return { id };
    }),

  /* ── Сохранить результат обработки ИИ ── */
  saveProcessed: publicQuery
    .input(
      z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
        metro: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        hours: z.string().optional(),
        tags: z.array(z.string()).optional(),
        description: z.string().optional(),
        infusionsHighlight: z.string().optional(),
        infusionsSignature: z.string().optional(),
        externalSummary: z.string().optional(),
        externalPros: z.array(z.string()).optional(),
        externalCons: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await getDb()
        .update(placeSubmissions)
        .set({ ...data, status: "ai_processed" })
        .where(eq(placeSubmissions.id, id));
      return { success: true };
    }),

  /* ── Отправить на модерацию ── */
  submit: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(placeSubmissions)
        .set({ status: "pending" })
        .where(eq(placeSubmissions.id, input.id));
      return { success: true };
    }),

  /* ── Получить по id ── */
  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getDb().query.placeSubmissions.findFirst({
        where: eq(placeSubmissions.id, input.id),
      });
    }),

  /* ── Список ожидающих (админ) ── */
  listPending: adminQuery.query(async () => {
    return getDb().query.placeSubmissions.findMany({
      where: eq(placeSubmissions.status, "pending"),
      orderBy: [desc(placeSubmissions.createdAt)],
    });
  }),

  /* ── Все заявки (админ) ── */
  listAll: adminQuery.query(async () => {
    return getDb().query.placeSubmissions.findMany({
      orderBy: [desc(placeSubmissions.createdAt)],
    });
  }),

  /* ── Одобрить: создаёт запись в places ── */
  approve: adminQuery
    .input(z.object({ id: z.number(), adminNotes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const sub = await db.query.placeSubmissions.findFirst({
        where: eq(placeSubmissions.id, input.id),
      });
      if (!sub) throw new Error("Заявка не найдена");
      if (!sub.slug || !sub.name) {
        throw new Error("Перед одобрением у заявки должны быть заполнены slug и name");
      }
      if (!/^[a-z0-9-]+$/.test(sub.slug)) {
        throw new Error("Slug содержит недопустимые символы (слэши/пробелы/протокол) — исправьте перед одобрением");
      }

      const [{ id: placeId }] = await db
        .insert(places)
        .values({
          slug: sub.slug,
          name: sub.name,
          city: sub.city,
          address: sub.address,
          metro: sub.metro,
          phone: sub.phone,
          website: sub.website,
          lat: sub.lat,
          lng: sub.lng,
          hours: sub.hours,
          image: sub.image,
          tags: sub.tags,
          description: sub.description,
          infusionsHighlight: sub.infusionsHighlight,
          infusionsSignature: sub.infusionsSignature,
          externalSource: sub.rawUrl,
          externalSummary: sub.externalSummary,
          externalPros: sub.externalPros,
          externalCons: sub.externalCons,
          status: "approved",
          submittedByUserId: sub.userId,
        })
        .$returningId();

      await db
        .update(placeSubmissions)
        .set({ status: "approved", adminNotes: input.adminNotes ?? null })
        .where(eq(placeSubmissions.id, input.id));

      return { success: true, placeId };
    }),

  /* ── Отклонить ── */
  reject: adminQuery
    .input(z.object({ id: z.number(), adminNotes: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(placeSubmissions)
        .set({ status: "rejected", adminNotes: input.adminNotes })
        .where(eq(placeSubmissions.id, input.id));
      return { success: true };
    }),
});
