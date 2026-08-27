import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import { hash, compare } from "bcryptjs";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, aiUsage } from "@db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { JWT_SECRET } from "./lib/jwtSecret";

async function createToken(userId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export const authRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        email: z.string().email("Некорректный email"),
        password: z.string().min(6, "Минимум 6 символов"),
        name: z.string().min(1, "Введите имя"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email уже зарегистрирован" });
      }
      const passwordHash = await hash(input.password, 12);
      const [{ id }] = await db.insert(users).values({
        email: input.email,
        passwordHash,
        name: input.name,
      }).$returningId();
      const token = await createToken(id);
      const user = await db.query.users.findFirst({ where: eq(users.id, id) });
      return { token, user: { id: user!.id, email: user!.email, name: user!.name, role: user!.role } };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный email или пароль" });
      }
      const valid = await compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный email или пароль" });
      }
      const token = await createToken(user.id);
      return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }),

  me: authedQuery.query(({ ctx }) => {
    return ctx.user;
  }),

  checkAiLimit: publicQuery
    .input(z.object({
      fingerprint: z.string(),
      requestType: z.string().default("recipe_parse"),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      /* Зарегистрированные пользователи — без лимита */
      if (ctx.user) {
        const todayCount = await db.select({ count: sql<number>`count(*)` })
          .from(aiUsage)
          .where(and(
            eq(aiUsage.userId, ctx.user.id),
            eq(aiUsage.requestType, input.requestType),
            gte(aiUsage.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
          ));
        const remaining = Math.max(0, 5 - (todayCount[0]?.count ?? 0));
        return { allowed: remaining > 0, remaining, isLoggedIn: true };
      }

      /* Незарегистрированные — 2 бесплатных */
      const totalCount = await db.select({ count: sql<number>`count(*)` })
        .from(aiUsage)
        .where(and(
          eq(aiUsage.fingerprint, input.fingerprint),
          eq(aiUsage.requestType, input.requestType),
        ));
      const count = totalCount[0]?.count ?? 0;
      return { allowed: count < 2, remaining: Math.max(0, 2 - count), isLoggedIn: false };
    }),

  trackAiUsage: publicQuery
    .input(z.object({
      fingerprint: z.string(),
      requestType: z.string().default("recipe_parse"),
      tokensUsed: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(aiUsage).values({
        userId: ctx.user?.id ?? null,
        fingerprint: input.fingerprint,
        requestType: input.requestType,
        tokensUsed: input.tokensUsed,
      });
      return { success: true };
    }),
});
