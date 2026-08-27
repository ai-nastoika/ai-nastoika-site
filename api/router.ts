import { z } from "zod";
import { listRecentConversations, finishConversation, resumeConversation } from "./lib/aiConversations";
import { router, publicProcedure, authedProcedure, db, users, recipes, createToken, bcrypt } from "./trpc";
import { eq, count, desc, sql } from "drizzle-orm";
import { comments, feedback, transactions, users as usersFull, places } from "../db/schema";
// ^ users из "./trpc" — устаревшая копия схемы без free_requests_left/balance_kopecks
//   (см. api/trpc.ts). usersFull — актуальная таблица из db/schema.ts, с этими полями.
//   Используется ниже только там, где эти поля реально нужны (list/grant*).
import { sendEmail } from "./lib/email";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "./lib/rateLimit";
import { TRPCError } from "@trpc/server";
import { labelTemplateRouter } from "./labelTemplateRouter";
import { recipeRouter } from "./recipeRouter";
import { savedLabelsRouter } from "./savedLabelsRouter";
import { placeRouter } from "./placeRouter";
import { labelExampleRouter } from "./labelExampleRouter";
import { placeSubmissionRouter } from "./placeSubmissionRouter";
import { favoritesRouter } from "./favoritesRouter";
import { recipeConsultRouter } from "./recipeConsultRouter";
import { infusionRouter } from "./infusionRouter";
import { infusionConsultRouter } from "./infusionConsultRouter";
import { tasteCalculatorRouter } from "./tasteCalculatorRouter";
import { abvEstimatorRouter } from "./abvEstimatorRouter";
import { labelGeneratorRouter } from "./labelGeneratorRouter";
import { adminStatsRouter } from "./adminStatsRouter";
import { balanceRouter } from "./balanceRouter";
import { donationRouter } from "./donationRouter";
import { recipeParserRouter } from "./recipeParser";
import { distillerConsultRouter } from "./distillerConsultRouter";
import { placeParserRouter } from "./placeParser";

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
      .mutation(async ({ input, ctx }) => {
        // Защита от массовой регистрации ботом — не больше 5 регистраций
        // с одного IP за час. Реальным людям этого достаточно с большим
        // запасом (никто не регистрирует 6 аккаунтов за час вручную).
        const ip = getClientIp((ctx as { req: Request }).req);
        const rl = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
        if (!rl.allowed) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Слишком много регистраций подряд. Попробуйте через ${Math.ceil(rl.retryAfterSec / 60)} мин.` });
        }

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
      .mutation(async ({ input, ctx }) => {
        // Защита от перебора пароля: лимит и по IP (не долбить много разных
        // аккаунтов с одного адреса), и отдельно по email (не перебирать
        // конкретный аккаунт через много IP/прокси). 10 попыток за 15 минут —
        // с запасом для человека, который просто забыл, какой у него пароль.
        const ip = getClientIp((ctx as { req: Request }).req);
        const rlIp = checkRateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);
        const rlEmail = checkRateLimit(`login-email:${input.email.toLowerCase()}`, 10, 15 * 60 * 1000);
        if (!rlIp.allowed || !rlEmail.allowed) {
          const retryAfterSec = Math.max(rlIp.allowed ? 0 : rlIp.retryAfterSec, rlEmail.allowed ? 0 : rlEmail.retryAfterSec);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Слишком много попыток входа. Попробуйте через ${Math.ceil(retryAfterSec / 60)} мин.` });
        }

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
      // Support both old (token string) and new (user object) context
      if ((ctx as any).user) {
        const user = (ctx as any).user;
        const { getDb } = await import("./queries/connection");
        const { users: usersTable } = await import("@db/schema");
        const { eq } = await import("drizzle-orm");
        const dbUser = await getDb().query.users.findFirst({ where: eq(usersTable.id, user.id) });
        if (!dbUser) return null;
        return { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role, emailVerified: dbUser.emailVerified, avatar: dbUser.avatar, isDonor: dbUser.isDonor };
      }
      const token = (ctx as any).token;
      if (!token) return null;
      const { getAuthUser } = await import("./trpc");
      const user = await getAuthUser(token);
      if (!user) return null;
      // Легаси-ветка (старый контекст по строковому token) — legacy-схема users
      // в ./trpc не знает про isDonor, поэтому здесь безопасное значение по
      // умолчанию; в реальности этот путь не используется — createContext
      // (api/context.ts) всегда выставляет ctx.user, см. первую ветку выше.
      return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified, avatar: user.avatar, isDonor: false };
    }),

    logout: publicProcedure.mutation(() => ({ success: true })),

    changePassword: authedProcedure
      .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        // На случай кражи токена без знания пароля — не даём перебирать
        // currentPassword бесконечно даже авторизованным запросом.
        const rl = checkRateLimit(`change-password:${ctx.userId}`, 10, 15 * 60 * 1000);
        if (!rl.allowed) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Слишком много попыток. Попробуйте через ${Math.ceil(rl.retryAfterSec / 60)} мин.` });
        }
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

    updateAvatar: authedProcedure
      .input(z.object({ avatar: z.string().max(255) }))
      .mutation(async ({ input, ctx }) => {
        await db.update(users).set({ avatar: input.avatar }).where(eq(users.id, ctx.userId));
        return { success: true };
      }),
  }),

  // ─── Управление пользователями ───
  user: router({
    list: adminProcedure.query(async () => {
      return db.select({
        id: usersFull.id,
        email: usersFull.email,
        name: usersFull.name,
        role: usersFull.role,
        createdAt: usersFull.createdAt,
        freeRequestsLeft: usersFull.freeRequestsLeft,
        balanceKopecks: usersFull.balanceKopecks,
      }).from(usersFull);
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

    /* ── Выдать пользователю N бесплатных ИИ-запросов (админ) ── */
    grantFreeRequests: adminProcedure
      .input(z.object({ userId: z.number(), amount: z.number().int().min(1).max(1000) }))
      .mutation(async ({ input }) => {
        await db
          .update(usersFull)
          .set({ freeRequestsLeft: sql`${usersFull.freeRequestsLeft} + ${input.amount}` })
          .where(eq(usersFull.id, input.userId));
        return { success: true };
      }),

    /* ── Начислить пользователю баланс в рублях (админ) ──
       Пишет запись в transactions, чтобы начисление было видно в истории
       баланса личного кабинета — так же, как обычное пополнение через ЮKassa. */
    grantBalance: adminProcedure
      .input(z.object({ userId: z.number(), amountRub: z.number().min(1).max(100000) }))
      .mutation(async ({ input, ctx }) => {
        const amountKopecks = Math.round(input.amountRub * 100);

        await db
          .update(usersFull)
          .set({ balanceKopecks: sql`${usersFull.balanceKopecks} + ${amountKopecks}` })
          .where(eq(usersFull.id, input.userId));

        const [updated] = await db
          .select({ balanceKopecks: usersFull.balanceKopecks })
          .from(usersFull)
          .where(eq(usersFull.id, input.userId));

        await db.insert(transactions).values({
          userId: input.userId,
          type: "admin_topup",
          amountKopecks,
          balanceAfter: updated?.balanceKopecks ?? 0,
          meta: { reason: "admin_grant", grantedBy: ctx.userId },
        });

        return { success: true };
      }),

    /* ── Запрос на удаление аккаунта — создаёт тикет в "Обращения" (не удаляет
       ничего автоматически, обработка вручную админом в течение 7 рабочих дней,
       как обещано на странице "Правила") + подтверждение на почту пользователю. ── */
    requestDeletion: authedProcedure
      .input(z.object({ reason: z.string().max(1000).optional() }))
      .mutation(async ({ input, ctx }) => {
        const [user] = await db.select().from(usersFull).where(eq(usersFull.id, ctx.userId));
        if (!user) throw new Error("Пользователь не найден");

        const reasonText = input.reason?.trim() || "Причина не указана";

        await db.insert(feedback).values({
          userId: ctx.userId,
          name: user.name ?? "Без имени",
          email: user.email,
          topic: "account_deletion",
          message: reasonText,
          status: "new",
        });

        await notifyAdmin(
          `🗑 Запрос на удаление аккаунта — ${user.email}`,
          `<div style="font-family: sans-serif; max-width: 480px;">
            <h2>🗑 Запрос на удаление аккаунта</h2>
            <p><b>От:</b> ${user.name ?? "Без имени"} (${user.email})</p>
            <p><b>ID пользователя:</b> ${ctx.userId}</p>
            <p><b>Причина:</b></p>
            <p>${reasonText.replace(/\n/g, "<br/>")}</p>
            <hr/>
            <p style="color:#888;font-size:13px;">Обработайте в течение 7 рабочих дней (обещано на странице «Правила»). После фактического удаления — ответьте на тикет письмом-подтверждением через раздел «Обращения».</p>
          </div>`
        );

        await sendEmail({
          to: user.email,
          subject: "Ваш запрос на удаление аккаунта принят",
          html: `<div style="font-family: sans-serif; max-width: 480px;">
            <h2>Запрос на удаление аккаунта принят</h2>
            <p>Здравствуйте!</p>
            <p>Мы получили ваш запрос на удаление аккаунта на сайте «Ай, настойка!» (${user.email}).</p>
            <p>Ваш аккаунт и все связанные с ним данные — профиль, рецепты, комментарии, история ИИ-запросов, история операций по балансу — будут полностью удалены в течение <b>7 рабочих дней</b>, в соответствии с требованиями законодательства о персональных данных (152-ФЗ «О персональных данных»).</p>
            <p>Если вы передумали — просто ответьте на это письмо в течение указанного срока, и мы отменим удаление.</p>
            <p>После фактического удаления вы получите отдельное письмо с подтверждением.</p>
            <hr/>
            <p style="color:#888;font-size:13px;">С уважением,<br/>Команда «Ай, настойка!»</p>
          </div>`,
        });

        return { success: true };
      }),
  }),

  // ─── Рецепты ───
  recipe: recipeRouter,

  // ─── Комментарии и отзывы с оценкой "рюмками" ───
  comment: router({
    /* input: ровно один из recipeId/placeId */
    list: publicProcedure
      .input(z.object({ recipeId: z.number().optional(), placeId: z.number().optional() }))
      .query(async ({ input }) => {
        const condition = input.recipeId != null ? eq(comments.recipeId, input.recipeId) : eq(comments.placeId, input.placeId!);
        return db
          .select({
            id: comments.id,
            text: comments.text,
            rating: comments.rating,
            createdAt: comments.createdAt,
            likes: comments.likes,
            userId: comments.userId,
            authorName: users.name,
          })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          .where(condition)
          .orderBy(desc(comments.createdAt));
      }),

    /* Сколько зелёных/жёлтых/красных отзывов у рецепта или места — для рюмок на карточках/странице */
    ratingSummary: publicProcedure
      .input(z.object({ recipeId: z.number().optional(), placeId: z.number().optional() }))
      .query(async ({ input }) => {
        const condition = input.recipeId != null ? eq(comments.recipeId, input.recipeId) : eq(comments.placeId, input.placeId!);
        const rows = await db
          .select({ rating: comments.rating, n: count() })
          .from(comments)
          .where(condition)
          .groupBy(comments.rating);
        const summary = { green: 0, yellow: 0, red: 0 };
        for (const row of rows) {
          if (row.rating === "green" || row.rating === "yellow" || row.rating === "red") {
            summary[row.rating] = Number(row.n);
          }
        }
        return summary;
      }),

    myComments: authedProcedure.query(async ({ ctx }) => {
      return db.select().from(comments).where(eq(comments.userId, ctx.userId));
    }),

    /* Оценку можно приложить только вместе с отзывом — отдельного эндпоинта "поставить рюмку без текста" нет */
    create: authedProcedure
      .input(
        z.object({
          recipeId: z.number().optional(),
          placeId: z.number().optional(),
          text: z.string().min(1),
          rating: z.enum(["green", "yellow", "red"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!input.recipeId && !input.placeId) throw new Error("Нужно указать recipeId или placeId");
        await db.insert(comments).values({
          recipeId: input.recipeId ?? null,
          placeId: input.placeId ?? null,
          userId: ctx.userId,
          text: input.text,
          rating: input.rating ?? null,
        });
        return { success: true };
      }),

    /* ── Редактировать свой комментарий (только автор, не админ —
       модерация правкой чужого текста без ведома автора недопустима) ── */
    update: authedProcedure
      .input(z.object({ id: z.number(), text: z.string().min(1).max(2000), rating: z.enum(["green", "yellow", "red"]).optional() }))
      .mutation(async ({ input, ctx }) => {
        const [existing] = await db.select().from(comments).where(eq(comments.id, input.id));
        if (!existing) throw new Error("Комментарий не найден");
        if (existing.userId !== ctx.userId) throw new Error("Нельзя редактировать чужой комментарий");
        await db.update(comments).set({ text: input.text, rating: input.rating ?? existing.rating }).where(eq(comments.id, input.id));
        return { success: true };
      }),

    /* ── Удалить: свой комментарий (автор) или любой (админ, модерация) ── */
    delete: authedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const [existing] = await db.select().from(comments).where(eq(comments.id, input.id));
        if (!existing) return { success: true }; // уже удалён — не ошибка
        const isOwner = existing.userId === ctx.userId;
        const isAdmin = ctx.user.role === "admin";
        if (!isOwner && !isAdmin) throw new Error("Недостаточно прав для удаления этого комментария");
        await db.delete(comments).where(eq(comments.id, input.id));
        return { success: true };
      }),

    /* ── Для админ-панели: все комментарии сайта, новые сверху, с автором и рецептом/местом ── */
    listAll: adminProcedure.query(async () => {
      return db
        .select({
          id: comments.id,
          text: comments.text,
          rating: comments.rating,
          createdAt: comments.createdAt,
          recipeId: comments.recipeId,
          recipeTitle: recipes.title,
          placeId: comments.placeId,
          placeName: places.name,
          userId: comments.userId,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(comments)
        .leftJoin(recipes, eq(comments.recipeId, recipes.id))
        .leftJoin(places, eq(comments.placeId, places.id))
        .leftJoin(users, eq(comments.userId, users.id))
        .orderBy(desc(comments.createdAt))
        .limit(300);
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
          account_deletion: "Удаление аккаунта",
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
      return db.select().from(feedback).orderBy(desc(feedback.createdAt));
    }),

    setStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["new", "read", "replied", "archived"]) }))
      .mutation(async ({ input }) => {
        await db.update(feedback).set({ status: input.status }).where(eq(feedback.id, input.id));
        return { success: true };
      }),

    /* ── Удалить обращение насовсем (спам, тестовые сообщения) ── */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(feedback).where(eq(feedback.id, input.id));
        return { success: true };
      }),

    /* ── Мои обращения (для личного кабинета — блок "Мои вопросы") ── */
    myFeedback: authedProcedure.query(async ({ ctx }) => {
      return db.select().from(feedback).where(eq(feedback.userId, ctx.userId)).orderBy(desc(feedback.createdAt));
    }),

    /* ── Ответить на обращение (админ) ── */
    reply: adminProcedure
      .input(z.object({ id: z.number(), answer: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(feedback).where(eq(feedback.id, input.id));
        const row = rows[0];
        if (!row) throw new Error("Обращение не найдено");

        await db.update(feedback).set({ answer: input.answer, answeredAt: new Date(), status: "replied" }).where(eq(feedback.id, input.id));

        const topicLabels: Record<string, string> = {
          general: "Общий вопрос",
          recipe: "Рецепт / Ошибка",
          bug: "Баг на сайте",
          feature: "Предложение",
          place: "Добавить заведение",
          account_deletion: "Удаление аккаунта",
          other: "Другое",
        };
        await sendEmail({
          to: row.email,
          subject: `Ответ на ваше обращение — ${topicLabels[row.topic] ?? row.topic}`,
          html: `<div style="font-family: sans-serif; max-width: 480px;">
            <h2>Ответ на ваше обращение</h2>
            <p><b>Ваш вопрос:</b></p>
            <p style="color:#555;">${row.message.replace(/\n/g, "<br/>")}</p>
            <hr/>
            <p><b>Ответ:</b></p>
            <p>${input.answer.replace(/\n/g, "<br/>")}</p>
          </div>`,
        });

        return { success: true };
      }),
  }),

  // ─── Места (барная карта) ───
  place: placeRouter,
  labelExample: labelExampleRouter,
  placeSubmission: placeSubmissionRouter,

  // ─── Избранное ───
  favorites: favoritesRouter,

  // ─── Консультация ИИ по рецепту ───
  recipeConsult: recipeConsultRouter,

  // ─── История диалогов с ИИ — для личного кабинета (последние 10, все фичи вместе) ───
  aiConversation: router({
    listRecent: authedProcedure.query(async ({ ctx }) => {
      return listRecentConversations(ctx.userId, 10);
    }),

    /* ── Завершить диалог (кнопка или уход со страницы) — уходит в архив,
       перестаёт переоткрываться при следующем заходе. Ничего не удаляет. ── */
    finish: authedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await finishConversation(ctx.userId, input.conversationId);
        return { success: true };
      }),

    /* ── Возобновить архивный диалог из ЛК — снимает архивный статус,
       возвращает ссылку, куда перейти (там диалог подхватится сам). ── */
    resume: authedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return resumeConversation(ctx.userId, input.conversationId);
      }),
  }),

  // ─── Калькулятор вкуса с ИИ (требует логина, тарификация как у recipeConsult) ───
  tasteCalculator: tasteCalculatorRouter,

  // ─── Оценка итоговой крепости с учётом ингредиентов (ИИ, поверх точного расчёта базы) ───
  abvEstimator: abvEstimatorRouter,

  // ─── Генерация изображения этикетки (ИИ, платно, без бесплатного лимита) ───
  labelGenerator: labelGeneratorRouter,

  // ─── Трекер созревания ───
  infusion: infusionRouter,
  infusionConsult: infusionConsultRouter,
  adminStats: adminStatsRouter,
  balance: balanceRouter,
  donation: donationRouter,

  recipeParser: recipeParserRouter,
  distillerConsult: distillerConsultRouter,
  placeParser: placeParserRouter,

  labelTemplate: labelTemplateRouter,
  savedLabels: savedLabelsRouter,

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
