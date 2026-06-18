import { z } from "zod";
import { router, publicProcedure, authedProcedure, db, users, recipes, createToken, bcrypt } from "./trpc";
import { eq, and, avg, count } from "drizzle-orm";
import { recipeRatings, comments, feedback } from "../db/schema";
import { sendEmail } from "./lib/email";
import crypto from "crypto";

// ─── Email уведомление админу ───
async function notifyAdmin(subject: string, html: string) {
  await sendEmail({ to: "ai-nastoika@mail.ru", subject, html });
}

// ─── Admin procedure ───
const adminProcedure = authedProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (ctx.user.role !== "admin") throw new Error("FORBIDDEN");
  return opts.next({ ctx });
});

export const appRouter = router({
  ping: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

  auth: router({
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const existing = await db.select().from(users).where(eq(users.email, input.email));
        if (existing.length > 0) throw new Error("Email already registered");
        const passwordHash = bcrypt.hashSync(input.password, 10);
        const verifyToken = crypto.randomBytes(32).toString("hex");
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
        const result = await db.insert(users).values({
          email: input.email,
          passwordHash,
          name: input.name || input.email.split("@")[0],
          role: "user",
          emailVerified: 0,
          emailVerifyToken: verifyToken,
          emailVerifyExpires: verifyExpires,
        });
        const userId = Number(result[0].insertId);
        const siteUrl = process.env.SITE_URL || "https://dev.ai-nastoika.ru";
        await sendEmail({
          to: input.email,
          subject: "Подтвердите email — Ай, настойка!",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h1 style="font-size: 24px; color: #1a1a1a;">🍹 Ай, настойка!</h1>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Здравствуйте, ${input.name || input.email.split("@")[0]}!<br/>
                Подтвердите вашу электронную почту чтобы начать пользоваться сайтом.
              </p>
              <a href="${siteUrl}/#/login?verify=${verifyToken}"
                style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #8B4513; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Подтвердить email
              </a>
              <p style="font-size: 13px; color: #aaa; margin-top: 32px;">
                Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.
              </p>
            </div>
          `,
        });
        await notifyAdmin(
          "👤 Новый пользователь — AI Настойка",
          `<p><b>Новый пользователь зарегистрировался!</b></p>
           <p>Имя: ${input.name || input.email.split("@")[0]}</p>
           <p>Email: ${input.email}</p>`
        );
        return { success: true, message: "Письмо с подтверждением отправлено на " + input.email };
      }),

    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(users).where(eq(users.emailVerifyToken, input.token));
        if (rows.length === 0) throw new Error("Неверная или устаревшая ссылка подтверждения");
        const user = rows[0];
        if (user.emailVerified) return { success: true, message: "Email уже подтверждён" };
        if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
          throw new Error("Ссылка подтверждения истекла. Запросите новую.");
        }
        await db.update(users).set({
          emailVerified: 1,
          emailVerifyToken: null,
          emailVerifyExpires: null,
        }).where(eq(users.id, user.id));
        const token = await createToken(user.id, user.email, user.role);
        return { success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    resendVerification: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(users).where(eq(users.email, input.email));
        if (rows.length === 0) throw new Error("Email не найден");
        const user = rows[0];
        if (user.emailVerified) throw new Error("Email уже подтверждён");
        const verifyToken = crypto.randomBytes(32).toString("hex");
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.update(users).set({ emailVerifyToken: verifyToken, emailVerifyExpires: verifyExpires }).where(eq(users.id, user.id));
        const siteUrl = process.env.SITE_URL || "https://dev.ai-nastoika.ru";
        await sendEmail({
          to: input.email,
          subject: "Подтвердите email — Ай, настойка!",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h1 style="font-size: 24px; color: #1a1a1a;">🍹 Ай, настойка!</h1>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Подтвердите вашу электронную почту:
              </p>
              <a href="${siteUrl}/#/login?verify=${verifyToken}"
                style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #8B4513; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Подтвердить email
              </a>
              <p style="font-size: 13px; color: #aaa; margin-top: 32px;">
                Ссылка действительна 24 часа.
              </p>
            </div>
          `,
        });
        return { success: true, message: "Письмо отправлено повторно" };
      }),

    login: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(users).where(eq(users.email, input.email));
        if (rows.length === 0) throw new Error("Invalid credentials");
        const user = rows[0];
        if (!bcrypt.compareSync(input.password, user.passwordHash)) throw new Error("Invalid credentials");
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        const token = await createToken(user.id, user.email, user.role);
        return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const token = (ctx as any).token;
      if (!token) return null;
      const { getAuthUser } = await import("./trpc");
      const user = await getAuthUser(token);
      if (!user) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified };
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
        return rows[0] || null;
      }),
    upsert: publicProcedure
      .input(z.any())
      .mutation(async ({ input }) => {
        await db.insert(recipes).values(input);
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async () => ({ success: true })),
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
        await db.insert(comments).values({ recipeId: input.recipeId, userId: ctx.userId, text: input.text });
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