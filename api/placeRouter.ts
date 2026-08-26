import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { places, placeInfusions } from "@db/schema";
import { eq } from "drizzle-orm";
import { normalizeText, diceCoefficient, haversineMeters } from "./lib/similarity";
import { normalizeWebsite } from "./lib/normalize";
import { resolveYandexMapsCoords, YandexLinkError } from "./lib/yandexMapsLink";

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
  /* ── Проверка на дубликаты перед сохранением: похожие по названию + близкие по координатам ── */
  checkDuplicates: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        excludeId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const all = await db.query.places.findMany();
      const candidateName = normalizeText(input.name);

      const scored = all
        .filter((p) => p.id !== input.excludeId)
        .map((p) => {
          const nameSim = diceCoefficient(candidateName, normalizeText(p.name));
          let proximity = 0;
          if (input.lat != null && input.lng != null && p.lat != null && p.lng != null) {
            const distM = haversineMeters(input.lat, input.lng, Number(p.lat), Number(p.lng));
            proximity = Math.max(0, 1 - distM / 500);
          }
          const score = nameSim * 0.6 + proximity * 0.4;
          return { place: p, score };
        })
        .filter((r) => r.score > 0.35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return scored.map((r) => ({
        id: r.place.id,
        slug: r.place.slug,
        name: r.place.name,
        city: r.place.city,
        address: r.place.address,
        image: r.place.image,
        score: Math.round(r.score * 100),
      }));
    }),

  /* ── Ручной запуск проверки сайтов (не ждать ночного cron) — force=true,
     иначе кнопка "проверить сейчас" молча проверяла бы 0 сайтов, если все
     уже проверялись в последние 90 дней (обычное поведение checkDueWebsites,
     но не то, что ожидает админ от кнопки с таким названием). ── */
  checkWebsitesNow: adminQuery.mutation(async () => {
    const { checkDueWebsites } = await import("./lib/websiteChecker");
    return checkDueWebsites(true);
  }),

  /* ── Точные координаты из ссылки на Яндекс.Карты (карточка организации
     или кнопка "Поделиться") — без угадывания через ИИ или геокодер по
     адресу. См. api/lib/yandexMapsLink.ts. ── */
  resolveCoords: adminQuery
    .input(z.object({ url: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        return await resolveYandexMapsCoords(input.url);
      } catch (err) {
        if (err instanceof YandexLinkError) {
          throw new Error(err.message);
        }
        throw err;
      }
    }),

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
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/, "Slug может содержать только строчные латинские буквы, цифры и дефис — без слэшей, пробелов и протокола (http://)"),
        name: z.string().min(1),
        city: z.string().optional(),
        address: z.string().optional(),
        metro: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        yandexUrl: z.string().optional(),
        rating: z.string().optional(),
        reviews: z.number().optional(),
        price: z.string().optional(),
        hours: z.string().optional(),
        image: z.string().optional(),
        menuFiles: z.array(z.object({ url: z.string(), name: z.string() })).optional(),
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
      const { id, infusions, ...rest } = input;
      const data = { ...rest, website: normalizeWebsite(rest.website) };
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
