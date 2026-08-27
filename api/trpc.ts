import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { SignJWT, jwtVerify } from "jose";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { mysqlTable, serial, varchar, text, timestamp, int, decimal, bigint, json } from "drizzle-orm/mysql-core";
import bcrypt from "bcryptjs";

import { JWT_SECRET } from "./lib/jwtSecret";
import { env } from "./lib/env";

const pool = createPool({
  // Раньше был fallback "mysql://root@localhost:3306/nastoika" (root, БЕЗ
  // пароля) — та же проблема, что и с JWT_SECRET: если DATABASE_URL вдруг
  // не подхватится, сервер тихо подключался бы локально под root вместо
  // явного падения. env.databaseUrl использует required() — без реальной
  // строки подключения сервер просто не запустится.
  uri: env.databaseUrl,
  connectionLimit: 10,
});
const db = drizzle(pool);

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  avatar: varchar("avatar", { length: 255 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  emailVerified: int("email_verified").default(0).notNull(),
  emailVerifyToken: varchar("email_verify_token", { length: 255 }),
  emailVerifyExpires: timestamp("email_verify_expires"),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: int("phone_verified").default(0).notNull(),
  twoFactorEnabled: int("two_factor_enabled").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipes = mysqlTable("recipes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  category: varchar("category", { length: 50 }).notNull(),
  categoryLabel: varchar("category_label", { length: 100 }),
  heroImage: varchar("hero_image", { length: 255 }),
  abv: varchar("abv", { length: 10 }),
  time: varchar("time", { length: 50 }),
  difficulty: varchar("difficulty", { length: 20 }),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviews: int("reviews").default(0),
  year: varchar("year", { length: 50 }),
  origin: varchar("origin", { length: 100 }),
  historyTitle: varchar("history_title", { length: 200 }),
  historyText: text("history_text"),
  tastingColor: varchar("tasting_color", { length: 200 }),
  tastingDescription: text("tasting_description"),
  tastingPairing: json("tasting_pairing").$type<string[]>(),
  tastingTemp: varchar("tasting_temp", { length: 50 }),
  tastingGlass: varchar("tasting_glass", { length: 100 }),
  sweet: int("sweet").default(0),
  sour: int("sour").default(0),
  bitter: int("bitter").default(0),
  spicy: int("spicy").default(0),
  fruity: int("fruity").default(0),
  herbal: int("herbal").default(0),
  tips: json("tips").$type<string[]>(),
  authorName: varchar("author_name", { length: 100 }),
  authorDate: varchar("author_date", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = mysqlTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

async function createToken(userId: number, email: string, role: string) {
  return new SignJWT({ sub: String(userId), email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    return payload as { sub: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getAuthUser(token: string) {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const rows = await db.select().from(users).where(eq(users.id, Number(payload.sub)));
  return rows[0] || null;
}

// ─── tRPC setup ───
const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Auth procedure ───
// Поддерживает оба варианта контекста:
// - новый (api/context.ts): ctx.user уже готовый объект { id, email, name, role }
// - старый (boot.ts: createContext: () => ({ token })): ctx.token строка, ищем юзера сами
export const authedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;
  const ctxAny = ctx as any;

  if (ctxAny.user) {
    return opts.next({ ctx: { ...ctx, user: ctxAny.user, userId: ctxAny.user.id } });
  }

  const user = await getAuthUser(ctxAny.token);
  if (!user) throw new Error("UNAUTHORIZED");
  return opts.next({ ctx: { ...ctx, user, userId: user.id } });
});

// ─── Seed admin ───
export async function seedAdmin() {
  try {
    const rows = await db.select().from(users).where(eq(users.email, "admin@ai-nastoika.ru"));
    if (rows.length === 0) {
      const hash = bcrypt.hashSync("admin123", 10);
      await db.insert(users).values({
        email: "admin@ai-nastoika.ru",
        passwordHash: hash,
        name: "Администратор",
        role: "admin",
        emailVerified: 1,
      });
      console.log("[seed] Admin: admin@ai-nastoika.ru / admin123");
    }
  } catch (e) {
    console.log("[seed] skip:", (e as Error).message);
  }
}

export { db, createToken, bcrypt };