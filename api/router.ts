import { z } from "zod";
import crypto from "crypto";
import { router, publicProcedure, authedProcedure, db, users, recipes, createToken, bcrypt, otpCodes } from "./trpc";
import { eq, and, avg, count, desc, gte, isNull } from "drizzle-orm";
import { recipeRatings, comments, recipeIngredients, recipeSteps } from "../db/schema";
import { isRussianEmail, getEmailValidationError } from "./lib/emailDomains";
import { sendVerificationEmail } from "./lib/email";
import { sendOtpSms, normalizePhone } from "./lib/sms";

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

// ─── Helpers ───
function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-значный код
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

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
    // ─── Регистрация (с проверкой .ru домена) ───
    register: publicProcedure
      .input(z.object({ email: z.string(), password: z.string(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        // Проверка российского email
        const emailError = getEmailValidationError(input.email);
        if (emailError) throw new Error(emailError);

        const existing = await db.select().from(users).where(eq(users.email, input.email));
        if (existing.length > 0) throw new Error("Email уже зарегистрирован");

        const passwordHash = bcrypt.hashSync(input.password, 10);
        const verifyToken = generateToken();
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

        // Отправляем email верификации (не блокируем регистрацию если не ушло)
        sendVerificationEmail(input.email, verifyToken).catch((err) => {
          console.error("[register] Email send failed:", err);
        });

        const token = await createToken(userId, input.email, "user");
        return {
          token,
          user: {
            id: userId,
            name: input.name || input.email.split("@")[0],
            email: input.email,
            role: "user",
            emailVerified: false,
            phone: null,
            phoneVerified: false,
            twoFactorEnabled: false,
          },
        };
      }),

    // ─── Логин (с 2FA если включена) ───
    login: publicProcedure
      .input(z.object({ email: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(users).where(eq(users.email, input.email));
        if (rows.length === 0) throw new Error("Неверный email или пароль");
        const user = rows[0];
        if (!bcrypt.compareSync(input.password, user.passwordHash)) throw new Error("Неверный email или пароль");

        // Если включена 2FA — не выдаём токен сразу
        if (user.twoFactorEnabled && user.phone && user.phoneVerified) {
          const code = generateOtp();
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

          await db.insert(otpCodes).values({
            userId: user.id,
            phone: user.phone,
            code,
            purpose: "two_factor",
            expiresAt,
          });

          // Отправляем SMS
          sendOtpSms(user.phone, code).catch((err) => {
            console.error("[login] SMS send failed:", err);
          });

          // Возвращаем временный токен (не JWT, а одноразовый)
          const tempToken = generateToken();
          // Храним tempToken как emailVerifyToken (используем поле повторно для простоты)
          // Лучше: отдельная таблица login_sessions, но для MVP достаточно
          await db.update(users)
            .set({ emailVerifyToken: `2fa:${tempToken}`, emailVerifyExpires: expiresAt })
            .where(eq(users.id, user.id));

          return {
            requires2FA: true,
            tempToken,
            user: null,
            token: null,
          };
        }

        const token = await createToken(user.id, user.email, user.role);
        return {
          requires2FA: false,
          tempToken: null,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: !!user.emailVerified,
            phone: user.phone,
            phoneVerified: !!user.phoneVerified,
            twoFactorEnabled: !!user.twoFactorEnabled,
          },
        };
      }),

    // ─── Подтверждение 2FA при входе ───
    verifyLoginCode: publicProcedure
      .input(z.object({ tempToken: z.string(), code: z.string() }))
      .mutation(async ({ input }) => {
        // Находим пользователя по tempToken
        const rows = await db.select().from(users)
          .where(eq(users.emailVerifyToken, `2fa:${input.tempToken}`));
        if (rows.length === 0) throw new Error("Сессия истекла, войдите заново");

        const user = rows[0];
        if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
          throw new Error("Код истёк, войдите заново");
        }

        // Проверяем OTP
        const otpRows = await db.select().from(otpCodes)
          .where(and(
            eq(otpCodes.userId, user.id),
            eq(otpCodes.purpose, "two_factor"),
            isNull(otpCodes.usedAt),
            gte(otpCodes.expiresAt, new Date()),
          ));

        const validOtp = otpRows.find((o) => o.code === input.code);
        if (!validOtp) {
          // Инкрементим attempts у последнего кода
          if (otpRows.length > 0) {
            const last = otpRows[otpRows.length - 1];
            await db.update(otpCodes)
              .set({ attempts: last.attempts + 1 })
              .where(eq(otpCodes.id, last.id));
            if (last.attempts >= 4) {
              throw new Error("Слишком много попыток. Войдите заново");
            }
          }
          throw new Error("Неверный код");
        }

        // Помечаем код как использованный
        await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, validOtp.id));
        // Очищаем tempToken
        await db.update(users)
          .set({ emailVerifyToken: null, emailVerifyExpires: null })
          .where(eq(users.id, user.id));

        const token = await createToken(user.id, user.email, user.role);
        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: !!user.emailVerified,
            phone: user.phone,
            phoneVerified: !!user.phoneVerified,
            twoFactorEnabled: !!user.twoFactorEnabled,
          },
        };
      }),

    // ─── Текущий пользователь ───
    me: publicProcedure.query(async ({ ctx }) => {
      const token = (ctx as any).token;
      if (!token) return null;
      const { getAuthUser } = await import("./trpc");
      const user = await getAuthUser(token);
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: !!user.emailVerified,
        phone: user.phone,
        phoneVerified: !!user.phoneVerified,
        twoFactorEnabled: !!user.twoFactorEnabled,
      };
    }),

    logout: publicProcedure.mutation(() => ({ success: true })),

    // ─── Смена пароля ───
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

    // ─── Email verification ───
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const rows = await db.select().from(users)
          .where(eq(users.emailVerifyToken, input.token));
        if (rows.length === 0) throw new Error("Недействительная ссылка");
        const user = rows[0];

        if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
          throw new Error("Ссылка истекла. Запросите новое письмо");
        }

        await db.update(users).set({
          emailVerified: 1,
          emailVerifyToken: null,
          emailVerifyExpires: null,
        }).where(eq(users.id, user.id));

        return { success: true, email: user.email };
      }),

    resendEmailVerification: authedProcedure.mutation(async ({ ctx }) => {
      const rows = await db.select().from(users).where(eq(users.id, ctx.userId));
      if (rows.length === 0) throw new Error("User not found");
      const user = rows[0];

      if (user.emailVerified) throw new Error("Email уже подтверждён");

      const verifyToken = generateToken();
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.update(users).set({
        emailVerifyToken: verifyToken,
        emailVerifyExpires: verifyExpires,
      }).where(eq(users.id, user.id));

      const sent = await sendVerificationEmail(user.email, verifyToken);
      if (!sent) throw new Error("Не удалось отправить письмо. Попробуйте позже");

      return { success: true };
    }),

    // ─── Phone / SMS ───
    sendPhoneCode: authedProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const normalized = normalizePhone(input.phone);
        if (!normalized) throw new Error("Неверный формат номера. Используйте: +7 (900) 123-45-67");

        // Rate limit: не больше 3 SMS за 10 минут
        const recent = await db.select({ count: count() }).from(otpCodes)
          .where(and(
            eq(otpCodes.userId, ctx.userId),
            eq(otpCodes.purpose, "verify_phone"),
            gte(otpCodes.createdAt, new Date(Date.now() - 10 * 60 * 1000)),
          ));
        if ((recent[0]?.count ?? 0) >= 3) {
          throw new Error("Слишком много попыток. Подождите 10 минут");
        }

        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db.insert(otpCodes).values({
          userId: ctx.userId,
          phone: normalized,
          code,
          purpose: "verify_phone",
          expiresAt,
        });

        // Сохраняем номер у пользователя (пока не подтверждён)
        await db.update(users)
          .set({ phone: normalized, phoneVerified: 0 })
          .where(eq(users.id, ctx.userId));

        const sent = await sendOtpSms(normalized, code);
        if (!sent) throw new Error("Не удалось отправить SMS. Попробуйте позже");

        return { success: true, phone: normalized };
      }),

    verifyPhoneCode: authedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const otpRows = await db.select().from(otpCodes)
          .where(and(
            eq(otpCodes.userId, ctx.userId),
            eq(otpCodes.purpose, "verify_phone"),
            isNull(otpCodes.usedAt),
            gte(otpCodes.expiresAt, new Date()),
          ));

        const validOtp = otpRows.find((o) => o.code === input.code);
        if (!validOtp) {
          if (otpRows.length > 0) {
            const last = otpRows[otpRows.length - 1];
            await db.update(otpCodes)
              .set({ attempts: last.attempts + 1 })
              .where(eq(otpCodes.id, last.id));
            if (last.attempts >= 4) throw new Error("Слишком много попыток. Запросите новый код");
          }
          throw new Error("Неверный код");
        }

        await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, validOtp.id));
        await db.update(users).set({ phoneVerified: 1 }).where(eq(users.id, ctx.userId));

        return { success: true };
      }),

    // ─── 2FA (включение / отключение) ───
    enableTwoFactor: authedProcedure.mutation(async ({ ctx }) => {
      const rows = await db.select().from(users).where(eq(users.id, ctx.userId));
      if (rows.length === 0) throw new Error("User not found");
      const user = rows[0];

      if (!user.phone || !user.phoneVerified) {
        throw new Error("Сначала подтвердите номер телефона");
      }

      await db.update(users).set({ twoFactorEnabled: 1 }).where(eq(users.id, ctx.userId));
      return { success: true };
    }),

    disableTwoFactor: authedProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const rows = await db.select().from(users).where(eq(users.id, ctx.userId));
        if (rows.length === 0) throw new Error("User not found");
        if (!bcrypt.compareSync(input.password, rows[0].passwordHash)) {
          throw new Error("Неверный пароль");
        }
        await db.update(users).set({ twoFactorEnabled: 0 }).where(eq(users.id, ctx.userId));
        return { success: true };
      }),
  }),

  // ─── Управление пользователями (только для админа) ───
  user: router({
    list: adminProcedure.query(async () => {
      return db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        createdAt: users.createdAt,
      }).from(users);
    }),

    setRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "editor", "admin"]),
      }))
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

  rating: router({
    myRating: authedProcedure
      .input(z.object({ recipeId: z.number() }))
      .query(async ({ input, ctx }) => {
        const rows = await db.select().from(recipeRatings).where(
          and(
            eq(recipeRatings.recipeId, input.recipeId),
            eq(recipeRatings.userId, ctx.userId)
          )
        );
        return rows[0] || null;
      }),

    myRatings: authedProcedure.query(async ({ ctx }) => {
      const rows = await db.select({
        id: recipeRatings.id,
        recipeId: recipeRatings.recipeId,
        rating: recipeRatings.rating,
        createdAt: recipeRatings.createdAt,
      }).from(recipeRatings).where(eq(recipeRatings.userId, ctx.userId));
      return rows;
    }),

    set: authedProcedure
      .input(z.object({ recipeId: z.number(), rating: z.number().min(1).max(5) }))
      .mutation(async ({ input, ctx }) => {
        const existing = await db.select().from(recipeRatings).where(
          and(
            eq(recipeRatings.recipeId, input.recipeId),
            eq(recipeRatings.userId, ctx.userId)
          )
        );
        if (existing.length > 0) {
          await db.update(recipeRatings)
            .set({ rating: input.rating })
            .where(eq(recipeRatings.id, existing[0].id));
        } else {
          await db.insert(recipeRatings).values({
            recipeId: input.recipeId,
            userId: ctx.userId,
            rating: input.rating,
          });
        }
        const result = await db.select({
          avg: avg(recipeRatings.rating),
          count: count(recipeRatings.id),
        }).from(recipeRatings).where(eq(recipeRatings.recipeId, input.recipeId));
        const newRating = Number(result[0].avg).toFixed(1);
        const newCount = Number(result[0].count);
        await db.update(recipes)
          .set({ rating: newRating, reviews: newCount })
          .where(eq(recipes.id, input.recipeId));
        return { success: true, newRating, newCount };
      }),
  }),

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
        await db.insert(comments).values({
          recipeId: input.recipeId,
          userId: ctx.userId,
          text: input.text,
        });
        return { success: true };
      }),
  }),

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
