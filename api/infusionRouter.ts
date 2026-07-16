import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { infusions, infusionStages, recipes } from "@db/schema";
import { eq, and, asc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const stageTypeEnum = z.enum(["pour", "shake", "strain", "rest", "taste", "custom"]);

/* ── Генерация этапов трекера из структурированных шагов рецепта ──
   Правила:
   - Шаги без stageType — просто инструкции, в трекер не попадают.
   - Первый шаг с заданным stageType всегда порождает ещё и стартовый
     этап "Поставить" (день 0) — момент, когда пользователь создал трекер.
   - Если у шага задан repeatEveryDays — это повторяющееся действие
     (напр. взбалтывание): первое повторение через repeatEveryDays,
     дальше drizzle сам создаёт следующие при отметке "готово".
   - waitDays двигает "текущую дату" вперёд для следующего шага.
   - Если последний сгенерированный этап — не дегустация, добавляем её
     финальным шагом на той же дате. */
function generateStagesFromRecipeSteps(
  steps: { stepNum: number; title: string | null; stageType: string | null; waitDays: number | null; repeatEveryDays: number | null }[],
  startDate: Date,
  recipeName: string
) {
  const tagged = steps
    .filter((s) => s.stageType)
    .sort((a, b) => a.stepNum - b.stepNum);

  if (tagged.length === 0) return [];

  const stages: { type: string; title: string; plannedDate: Date; repeatIntervalDays?: number }[] = [];
  let runningDate = new Date(startDate);
  let lastType = "";

  tagged.forEach((step, i) => {
    if (i === 0) {
      stages.push({ type: "pour", title: `Поставить: ${recipeName}`, plannedDate: new Date(runningDate) });
    }

    if (step.repeatEveryDays) {
      const firstOccurrence = new Date(runningDate);
      firstOccurrence.setDate(firstOccurrence.getDate() + step.repeatEveryDays);
      stages.push({
        type: step.stageType!,
        title: step.title || "Взболтать",
        plannedDate: firstOccurrence,
        repeatIntervalDays: step.repeatEveryDays,
      });
    } else {
      stages.push({ type: step.stageType!, title: step.title || "Этап", plannedDate: new Date(runningDate) });
    }

    lastType = step.stageType!;
    if (step.waitDays) runningDate.setDate(runningDate.getDate() + step.waitDays);
  });

  if (lastType !== "taste") {
    stages.push({ type: "taste", title: "Дегустация", plannedDate: new Date(runningDate) });
  }

  return stages;
}

/* ── Проверка, что трекер принадлежит текущему пользователю ── */
async function getOwnedInfusion(infusionId: number, userId: number) {
  const db = getDb();
  const infusion = await db.query.infusions.findFirst({ where: eq(infusions.id, infusionId) });
  if (!infusion || infusion.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Трекер не найден" });
  }
  return infusion;
}

/* ── То же самое, но начиная от stageId (для действий над этапом) ── */
async function getOwnedStage(stageId: number, userId: number) {
  const db = getDb();
  const stage = await db.query.infusionStages.findFirst({ where: eq(infusionStages.id, stageId) });
  if (!stage) throw new TRPCError({ code: "NOT_FOUND", message: "Этап не найден" });
  await getOwnedInfusion(stage.infusionId, userId);
  return stage;
}

function dayDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── Считаем производные поля для карточки списка ── */
function summarize(infusion: typeof infusions.$inferSelect, stages: (typeof infusionStages.$inferSelect)[]) {
  const now = new Date();
  const sorted = [...stages].sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
  const done = sorted.filter((s) => s.status === "done");
  const upcoming = sorted.filter((s) => s.status === "upcoming");
  const nextStage = upcoming[0] ?? null;

  const total = sorted.length || 1;
  const progressPct = Math.round((done.length / total) * 100);

  const dayNow = Math.max(1, dayDiff(infusion.startDate, now) + 1);
  const lastPlanned = sorted[sorted.length - 1]?.plannedDate ?? infusion.startDate;
  const dayTotal = Math.max(dayNow, dayDiff(infusion.startDate, lastPlanned) + 1);

  return { progressPct, dayNow, dayTotal, nextStage };
}

export const infusionRouter = createRouter({
  /* ── Список моих настоек (для сетки карточек + статистики) ── */
  list: authedQuery
    .input(z.object({ status: z.enum(["active", "archived"]).optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [eq(infusions.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(infusions.status, input.status));

      const rows = await db.query.infusions.findMany({
        where: and(...conditions),
        with: { stages: true },
        orderBy: [asc(infusions.startDate)],
      });

      return rows.map((r) => {
        const { stages, ...infusion } = r;
        const summary = summarize(infusion, stages);
        return {
          ...infusion,
          recipeTag: infusion.recipeId ? "Из базы рецептов" : "Свой рецепт",
          ...summary,
        };
      });
    }),

  /* ── Статистика для карточек сверху (Активных / Действие сегодня / Завершено) ── */
  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.query.infusions.findMany({
      where: eq(infusions.userId, ctx.user.id),
      with: { stages: true },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const active = rows.filter((r) => r.status === "active");
    const dueToday = active.filter((r) =>
      r.stages.some((s) => s.status === "upcoming" && s.plannedDate >= startOfToday && s.plannedDate < endOfToday)
    ).length;
    const completed = rows.filter((r) => r.status === "archived").length;

    const durations = rows
      .filter((r) => r.status === "archived")
      .map((r) => {
        const { dayTotal } = summarize(r, r.stages);
        return dayTotal;
      });
    const avgDays = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return { active: active.length, dueToday, completed, avgDays };
  }),

  /* ── Детали одного трекера + этапы с вычисленным состоянием ── */
  get: authedQuery.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const infusion = await getOwnedInfusion(input.id, ctx.user.id);
    const db = getDb();
    const stages = await db
      .select()
      .from(infusionStages)
      .where(eq(infusionStages.infusionId, input.id))
      .orderBy(asc(infusionStages.plannedDate));

    const upcoming = stages.filter((s) => s.status === "upcoming");
    const currentId = upcoming[0]?.id ?? null;

    const stagesWithState = stages.map((s) => ({
      ...s,
      state: s.status === "done" ? "done" : s.status === "skipped" ? "skipped" : s.id === currentId ? "current" : "upcoming",
    }));

    const summary = summarize(infusion, stages);
    return {
      ...infusion,
      recipeTag: infusion.recipeId ? "Из базы рецептов" : "Свой рецепт",
      progressPct: summary.progressPct,
      dayNow: summary.dayNow,
      dayTotal: summary.dayTotal,
      stages: stagesWithState,
    };
  }),

  /* ── Создать новый трекер (из базы рецептов или свой) ── */
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        recipeId: z.number().optional(),
        vesselDescription: z.string().max(200).optional(),
        coverImage: z.string().max(255).optional(),
        startDate: z.coerce.date(),
        notes: z.string().max(2000).optional(),
        stages: z
          .array(
            z.object({
              type: stageTypeEnum,
              title: z.string().min(1).max(300),
              plannedDate: z.coerce.date(),
              repeatIntervalDays: z.number().min(1).max(90).optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      let stagesToInsert = input.stages ?? [];

      if (input.recipeId) {
        const recipe = await db.query.recipes.findFirst({
          where: eq(recipes.id, input.recipeId),
          with: { steps: true },
        });
        if (!recipe) throw new TRPCError({ code: "NOT_FOUND", message: "Рецепт не найден" });

        // Этапы явно не заданы — подбираем автоматически по структуре рецепта
        if (!input.stages || input.stages.length === 0) {
          stagesToInsert = generateStagesFromRecipeSteps(recipe.steps, input.startDate, recipe.title);
        }
      }

      if (stagesToInsert.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Добавьте хотя бы один этап" });
      }

      const result = await db.insert(infusions).values({
        userId: ctx.user.id,
        recipeId: input.recipeId,
        name: input.name,
        description: input.description,
        vesselDescription: input.vesselDescription,
        coverImage: input.coverImage,
        startDate: input.startDate,
        notes: input.notes,
      });
      const infusionId = Number(result[0].insertId);

      await db.insert(infusionStages).values(
        stagesToInsert.map((s, i) => ({
          infusionId,
          type: s.type,
          title: s.title,
          plannedDate: s.plannedDate,
          repeatIntervalDays: s.repeatIntervalDays,
          sortOrder: i,
        }))
      );

      return { id: infusionId };
    }),

  /* ── Добавить этап вручную ── */
  addStage: authedQuery
    .input(
      z.object({
        infusionId: z.number(),
        type: stageTypeEnum,
        title: z.string().min(1).max(300),
        plannedDate: z.coerce.date(),
        repeatIntervalDays: z.number().min(1).max(90).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await getOwnedInfusion(input.infusionId, ctx.user.id);
      const db = getDb();
      const existing = await db
        .select({ value: count() })
        .from(infusionStages)
        .where(eq(infusionStages.infusionId, input.infusionId));
      await db.insert(infusionStages).values({
        infusionId: input.infusionId,
        type: input.type,
        title: input.title,
        plannedDate: input.plannedDate,
        repeatIntervalDays: input.repeatIntervalDays,
        sortOrder: Number(existing[0]?.value ?? 0),
      });
      return { success: true };
    }),

  /* ── Отметить этап выполненным (+ заметка/фото); если этап повторяющийся — создаём следующий ── */
  completeStage: authedQuery
    .input(z.object({ stageId: z.number(), note: z.string().max(1000).optional(), photoUrl: z.string().max(255).optional() }))
    .mutation(async ({ input, ctx }) => {
      const stage = await getOwnedStage(input.stageId, ctx.user.id);
      const db = getDb();

      await db
        .update(infusionStages)
        .set({ status: "done", completedAt: new Date(), note: input.note, photoUrl: input.photoUrl })
        .where(eq(infusionStages.id, input.stageId));

      if (stage.repeatIntervalDays) {
        const nextDate = new Date(stage.plannedDate);
        nextDate.setDate(nextDate.getDate() + stage.repeatIntervalDays);
        await db.insert(infusionStages).values({
          infusionId: stage.infusionId,
          type: stage.type,
          title: stage.title,
          plannedDate: nextDate,
          repeatIntervalDays: stage.repeatIntervalDays,
          sortOrder: stage.sortOrder,
        });
      }

      return { success: true };
    }),

  /* ── Перенести этап на другую дату ── */
  postponeStage: authedQuery
    .input(z.object({ stageId: z.number(), newDate: z.coerce.date() }))
    .mutation(async ({ input, ctx }) => {
      await getOwnedStage(input.stageId, ctx.user.id);
      const db = getDb();
      await db.update(infusionStages).set({ plannedDate: input.newDate }).where(eq(infusionStages.id, input.stageId));
      return { success: true };
    }),

  /* ── Удалить ещё не выполненный этап ── */
  deleteStage: authedQuery.input(z.object({ stageId: z.number() })).mutation(async ({ input, ctx }) => {
    await getOwnedStage(input.stageId, ctx.user.id);
    const db = getDb();
    await db.delete(infusionStages).where(eq(infusionStages.id, input.stageId));
    return { success: true };
  }),

  /* ── Обновить заметки трекера ── */
  updateNotes: authedQuery
    .input(z.object({ id: z.number(), notes: z.string().max(2000) }))
    .mutation(async ({ input, ctx }) => {
      await getOwnedInfusion(input.id, ctx.user.id);
      const db = getDb();
      await db.update(infusions).set({ notes: input.notes, updatedAt: new Date() }).where(eq(infusions.id, input.id));
      return { success: true };
    }),

  /* ── Сменить фото обложки (после /api/upload-tracker-image) ── */
  setCoverPhoto: authedQuery
    .input(z.object({ id: z.number(), coverImage: z.string().max(255) }))
    .mutation(async ({ input, ctx }) => {
      await getOwnedInfusion(input.id, ctx.user.id);
      const db = getDb();
      await db.update(infusions).set({ coverImage: input.coverImage, updatedAt: new Date() }).where(eq(infusions.id, input.id));
      return { success: true };
    }),

  /* ── Архивировать / вернуть из архива ── */
  setArchived: authedQuery
    .input(z.object({ id: z.number(), archived: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await getOwnedInfusion(input.id, ctx.user.id);
      const db = getDb();
      await db
        .update(infusions)
        .set({ status: input.archived ? "archived" : "active", updatedAt: new Date() })
        .where(eq(infusions.id, input.id));
      return { success: true };
    }),

  /* ── Удалить трекер целиком ── */
  delete: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    await getOwnedInfusion(input.id, ctx.user.id);
    const db = getDb();
    await db.delete(infusionStages).where(eq(infusionStages.infusionId, input.id));
    await db.delete(infusions).where(eq(infusions.id, input.id));
    return { success: true };
  }),
});
