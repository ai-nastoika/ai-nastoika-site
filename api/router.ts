import { z } from "zod";
import { router, publicProcedure, authedProcedure, db, users, recipes, createToken, bcrypt } from "./trpc";
import { eq, and, avg, count } from "drizzle-orm";
import { recipeRatings, comments, feedback, recipeIngredients, recipeSteps } from "../db/schema";
import { sendEmail } from "./lib/email";

// ─── Уведомление админу ───
async function notifyAdmin(subject: string, html: string) {
  await sendEmail({ to: "ai-nastoika@mail.ru", subject, html });
}

// ─── Admin procedure ───
const adminProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (ctx.user.role !== "admin") throw new Error("FORBIDDEN");
  return opts.next({ ctx });
});

// ─── Editor procedure (admin или editor) ───
const editorProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (ctx.user.role !== "admin" && ctx.user.role !== "editor") throw new Error("FORBIDDEN");
  return opts.next({ ctx });
});

// ─── Zod-схема для upsert рецепта ───
const recipeUpsertInput = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  category: z.string().min(1),
  categoryLabel: z.string().optional(),
  heroImage: z.string().optional(),
  abv: z.string().optional(),
  time: z.string().optional(),
  difficulty: z.string().optional(),
  year: z.string().optional(),
  origin: z.string().optional(),
  historyTitle: z.string().optional(),
  historyText: z.string().optional(),
  tastingColor: z.string().optional(),
  tastingDescription: z.string().optional(),
  tastingPairing: z.array(z.string()).optional(),
  tastingTemp: z.string().optional(),
  tastingGlass: z.string().optional(),
  sweet: z.number().optional(),
  sour: z.number().optional(),
  bitter: z.number().optional(),
  spicy: z.number().optional(),
  fruity: z.number().optional(),
  herbal: z.number().optional(),
  tips: z.array(z.string()).optional(),
  authorName: z.string().optional(),
  authorDate: z.string().optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.string().optional(),
    note: z.string().optional(),
  })).optional(),
  steps: z.array(z.object({
    stepNum: z.number(),
    title: z.string().optional(),
    text: z.string().min(1),
  })).optional(),
});

export const appRouter = router({
  ping: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

  auth: router({
    register: publicProcedure
      .input(z.object({ email: z.string(), password: z.string(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const existing = await db.select().from(users).where(eq(users.email, input.email));
        if (existing.length > 0) throw new Error("Email already registered");
        const passwordHash = bcrypt.hashSync(input.password, 10);
        const result = await db.insert(users).values({
          email: input.email,
          passwordHash,
          name: input.name || input.email.split("@")[0],
          role: "user",
        });
        const userId = Number(result[0].insertId);
        const token = await createToken(userId, input.email, "user");
        await notifyAdmin(
          "👤 Новый пользователь — AI Настойка",
          `<p><b>Новый пользователь зарегистрировался!</b></p>
           <p>Имя: ${input.name || input.email.split("@")[0]}</p>
           <p>Email: ${input.email}</p>`
        );
        return { token, user: { id: userId, name: input.name || input.email.split("@")[0], email: input.email, role: "user" } };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(users).where(eq(users.email, input.email));
        if (rows.length === 0) throw new Error("Invalid credentials");
        const user = rows[0];
        if (!bcrypt.compareSync(input.password, user.passwordHash)) throw new Error("Invalid credentials");
        const token = await createToken(user.id, user.email, user.role);
        return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const token = (ctx as any).token;
      if (!token) return null;
      const { getAuthUser } = await import("./trpc");
      const user = await getAuthUser(token);
      if (!user) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),

    logout: publicProcedure.mutation(() => ({ success: true })),

    changePassword: authedProcedure
      .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const rows = await db.select().from(users).where(eq(users.id, ctx.userId));
        if (rows.length === 0) throw new Error("User not found");
        const user = rows[0];
        if (!bcrypt.compareSync(input.currentPassword, user.passwordHash)) {
          throw new Error("Неверный текущий пароль");
        }
        const passwordHash = bcrypt.hashSync(input.newPassword, 10);
        await db.update(users).set({ passwordHash }).where(eq(users.id, ctx.userId));
        return { success: true };
      }),

    updateProfile: authedProcedure
      .input(z.object({ name: z.string().min(1).optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.userId));
        return { success: true };
      }),
  }),

  // ─── Управление пользователями ───
  user: router({
    list: adminProcedure.query(async () => {
      return db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users);
    }),

    setRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "editor", "admin"]) }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.userId) throw new Error("Нельзя изменить свою роль");
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.userId) throw new Error("Нельзя удалить себя");
        await db.delete(users).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // ─── Рецепты ───
  recipe: router({
    list: publicProcedure.query(async () => {
      return db.select().from(recipes);
    }),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const rows = await db.select().from(recipes).where(eq(recipes.slug, input.slug));
        if (!rows[0]) return null;
        const recipe = rows[0];

        const ingredients = await db
          .select()
          .from(recipeIngredients)
          .where(eq(recipeIngredients.recipeId, recipe.id));

        const steps = await db
          .select()
          .from(recipeSteps)
          .where(eq(recipeSteps.recipeId, recipe.id));

        return { ...recipe, ingredients, steps };
      }),

    upsert: editorProcedure
      .input(recipeUpsertInput)
      .mutation(async ({ input }) => {
        const { ingredients, steps, ...recipeData } = input;

        const existing = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, input.slug));

        let recipeId: number;

        if (existing.length > 0) {
          recipeId = existing[0].id;
          await db.update(recipes).set(recipeData).where(eq(recipes.id, recipeId));
          await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
          await db.delete(recipeSteps).where(eq(recipeSteps.recipeId, recipeId));
        } else {
          const result = await db.insert(recipes).values(recipeData);
          recipeId = Number(result[0].insertId);
        }

        if (ingredients && ingredients.length > 0) {
          await db.insert(recipeIngredients).values(
            ingredients.map((ing, i) => ({
              recipeId,
              name: ing.name,
              amount: ing.amount ?? null,
              note: ing.note ?? null,
              sortOrder: i,
            }))
          );
        }

        if (steps && steps.length > 0) {
          await db.insert(recipeSteps).values(
            steps.map((s, i) => ({
              recipeId,
              stepNum: s.stepNum,
              title: s.title ?? null,
              text: s.text,
              sortOrder: i,
            }))
          );
        }

        return { success: true, id: recipeId };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, input.id));
        await db.delete(recipeSteps).where(eq(recipeSteps.recipeId, input.id));
        await db.delete(recipes).where(eq(recipes.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Оценки ───
  rating: router({
    myRating: authedProcedure
      .input(z.object({ recipeId: z.number() }))
      .query(async ({ input, ctx }) => {
        const rows = await db.select().from(recipeRatings).where(
          and(eq(recipeRatings.recipeId, input.recipeId), eq(recipeRatings.userId, ctx.userId))
        );
        return rows[0] || null;
      }),

    myRatings: authedProcedure.query(async ({ ctx }) => {
      return db.select({
        id: recipeRatings.id,
        recipeId: recipeRatings.recipeId,
        rating: recipeRatings.rating,
        createdAt: recipeRatings.createdAt,
      }).from(recipeRatings).where(eq(recipeRatings.userId, ctx.userId));
    }),

    set: authedProcedure
      .input(z.object({ recipeId: z.number(), rating: z.number().min(1).max(5) }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.select().from(recipeRatings).where(
          and(eq(recipeRatings.recipeId, input.recipeId), eq(recipeRatings.userId, ctx.userId))
        );
        if (existing.length > 0) {
          await db.update(recipeRatings).set({ rating: input.rating }).where(eq(recipeRatings.id, existing[0].id));
        } else {
          await db.insert(recipeRatings).values({ recipeId: input.recipeId, userId: ctx.userId, rating: input.rating });
        }
        const result = await db.select({
          avg: avg(recipeRatings.rating),
          count: count(recipeRatings.id),
        }).from(recipeRatings).where(eq(recipeRatings.recipeId, input.recipeId));
        const newRating = Number(result[0].avg).toFixed(1);
        const newCount = Number(result[0].count);
        await db.update(recipes).set({ rating: newRating, reviews: newCount }).where(eq(recipes.id, input.recipeId));
        return { success: true, newRating, newCount };
      }),
  }),

  // ─── Комментарии ───
  comment: router({
    list: publicProcedure
      .input(z.object({ recipeId: z.number() }))
      .query(async ({ input }) => {
        return db.select().from(comments).where(eq(comments.recipeId, input.recipeId));
      }),

    myComments: authedProcedure.query(async ({ ctx }) => {
      return db.select().from(comments).where(eq(comments.userId, ctx.userId));
    }),

    create: authedProcedure
      .input(z.object({ recipeId: z.number(), text: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        // Получаем имя пользователя
        const userRows = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.userId));
        const authorName = userRows[0]?.name || "Аноним";
        const authorAvatar = authorName.charAt(0).toUpperCase();
        await db.insert(comments).values({
          recipeId: input.recipeId,
          userId: ctx.userId,
          authorName,
          authorAvatar,
          text: input.text,
        });
        return { success: true };
      }),
  }),

  // ─── Обратная связь ───
  feedback: router({
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        topic: z.string(),
        message: z.string().min(1),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.insert(feedback).values({
          name: input.name,
          email: input.email,
          topic: input.topic,
          message: input.message,
          userId: input.userId,
          status: "new",
        });

        const topicLabels: Record<string, string> = {
          general: "Общий вопрос",
          recipe: "Рецепт / Ошибка",
          bug: "Баг на сайте",
          feature: "Предложение",
          place: "Добавить заведение",
          other: "Другое",
        };

        await notifyAdmin(
          `📩 Новое обращение — ${topicLabels[input.topic] ?? input.topic}`,
          `<div style="font-family: sans-serif; max-width: 480px;">
            <h2>📩 Новое обращение с сайта</h2>
            <p><b>От:</b> ${input.name} (${input.email})</p>
            <p><b>Тема:</b> ${topicLabels[input.topic] ?? input.topic}</p>
            <hr/>
            <p>${input.message.replace(/\n/g, "<br/>")}</p>
          </div>`
        );

        return { success: true };
      }),

    list: adminProcedure.query(async () => {
      return db.select().from(feedback).orderBy(feedback.createdAt);
    }),

    setStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["new", "read", "replied"]) }))
      .mutation(async ({ input }) => {
        await db.update(feedback).set({ status: input.status }).where(eq(feedback.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Места ───
  place: router({
    list: publicProcedure.query(() => []),
    bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(() => null),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(() => ({ success: true })),
    upsert: publicProcedure.input(z.any()).mutation(() => ({ success: true })),
  }),

  recipeParser: router({
    checkLimit: publicProcedure.input(z.object({ fingerprint: z.string() })).query(() => ({ allowed: true, isLoggedIn: false })),
  }),

  labelTemplate: router({
    list: publicProcedure.query(() => []),
    upsert: publicProcedure.input(z.any()).mutation(() => ({ success: true })),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(() => ({ success: true })),
    toggleActive: publicProcedure.input(z.object({ id: z.number(), isActive: z.number() })).mutation(() => ({ success: true })),
  }),

  submission: router({
    create: publicProcedure.input(z.any()).mutation(() => ({ id: Date.now() })),
    saveProcessed: publicProcedure.input(z.any()).mutation(() => ({ success: true })),
    submit: publicProcedure.input(z.object({ id: z.number() })).mutation(() => ({ success: true })),
    byId: publicProcedure.input(z.object({ id: z.number() })).query(() => null),
    listPending: publicProcedure.query(() => []),
    listAll: publicProcedure.query(() => []),
    approve: publicProcedure.input(z.any()).mutation(() => ({ success: true })),
    reject: publicProcedure.input(z.any()).mutation(() => ({ success: true })),
  }),
});

export type AppRouter = typeof appRouter;
