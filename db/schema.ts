import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  bigint,
  json,
} from "drizzle-orm/mysql-core";

// ─── Recipes ───────────────────────────────────────────────
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

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = typeof recipes.$inferInsert;

// ─── Recipe Ingredients ────────────────────────────────────
export const recipeIngredients = mysqlTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  amount: varchar("amount", { length: 100 }),
  note: varchar("note", { length: 200 }),
  sortOrder: int("sort_order").default(0),
});

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

// ─── Recipe Steps ──────────────────────────────────────────
export const recipeSteps = mysqlTable("recipe_steps", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }).notNull(),
  stepNum: int("step_num").notNull(),
  title: varchar("title", { length: 200 }),
  text: text("text").notNull(),
  sortOrder: int("sort_order").default(0),
});

export type RecipeStep = typeof recipeSteps.$inferSelect;

// ─── Places (Bars) ─────────────────────────────────────────
export const places = mysqlTable("places", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }),
  address: varchar("address", { length: 300 }),
  metro: varchar("metro", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 200 }),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviews: int("reviews").default(0),
  price: varchar("price", { length: 20 }),
  hours: varchar("hours", { length: 100 }),
  image: varchar("image", { length: 255 }),
  tags: json("tags").$type<string[]>(),
  description: text("description"),
  infusionsHighlight: varchar("infusions_highlight", { length: 300 }),
  infusionsSignature: varchar("infusions_signature", { length: 200 }),
  externalSource: varchar("external_source", { length: 200 }),
  externalSummary: text("external_summary"),
  externalPros: json("external_pros").$type<string[]>(),
  externalCons: json("external_cons").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Place = typeof places.$inferSelect;
export type InsertPlace = typeof places.$inferInsert;

// ─── Place Infusions ───────────────────────────────────────
export const placeInfusions = mysqlTable("place_infusions", {
  id: serial("id").primaryKey(),
  placeId: bigint("place_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  note: varchar("note", { length: 300 }),
  isSignature: int("is_signature").default(0),
});

export type PlaceInfusion = typeof placeInfusions.$inferSelect;

// ─── Comments ──────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }),
  placeId: bigint("place_id", { mode: "number", unsigned: true }),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  authorName: varchar("author_name", { length: 100 }),
  authorAvatar: varchar("author_avatar", { length: 10 }),
  text: text("text").notNull(),
  likes: int("likes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ─── Recipe Ratings ────────────────────────────────────────
export const recipeRatings = mysqlTable("recipe_ratings", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  rating: int("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RecipeRating = typeof recipeRatings.$inferSelect;

// ─── Feedback ──────────────────────────────────────────────
export const feedback = mysqlTable("feedback", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  topic: varchar("topic", { length: 50 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"), // new | read | replied
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

// ─── Label Templates ────────────────────────────────────────
export const labelTemplates = mysqlTable("label_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  image: varchar("image", { length: 255 }),
  bg: varchar("bg", { length: 255 }),
  border: varchar("border", { length: 255 }),
  accent: varchar("accent", { length: 20 }).notNull().default("#8B4513"),
  fontFamily: varchar("font_family", { length: 20 }).notNull().default("serif"),
  zones: json("zones"),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LabelTemplate = typeof labelTemplates.$inferSelect;
export type InsertLabelTemplate = typeof labelTemplates.$inferInsert;

// ─── User Recipe Submissions ───────────────────────────────
export const userRecipeSubmissions = mysqlTable("user_recipe_submissions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  fingerprint: varchar("fingerprint", { length: 64 }),
  authorName: varchar("author_name", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  rawTitle: varchar("raw_title", { length: 200 }).notNull(),
  rawDescription: text("raw_description"),
  rawIngredients: text("raw_ingredients"),
  rawSteps: text("raw_steps"),
  rawNotes: text("raw_notes"),
  processedData: text("processed_data"),
  slug: varchar("slug", { length: 100 }),
  title: varchar("title", { length: 200 }),
  subtitle: varchar("subtitle", { length: 255 }),
  category: varchar("category", { length: 30 }),
  categoryLabel: varchar("category_label", { length: 50 }),
  abv: varchar("abv", { length: 20 }),
  time: varchar("time", { length: 50 }),
  difficulty: varchar("difficulty", { length: 20 }),
  year: varchar("year", { length: 50 }),
  origin: varchar("origin", { length: 100 }),
  historyTitle: varchar("history_title", { length: 200 }),
  historyText: text("history_text"),
  tastingColor: varchar("tasting_color", { length: 100 }),
  tastingDescription: text("tasting_description"),
  tastingTemp: varchar("tasting_temp", { length: 50 }),
  tastingGlass: varchar("tasting_glass", { length: 100 }),
  sweet: int("sweet"),
  sour: int("sour"),
  bitter: int("bitter"),
  spicy: int("spicy"),
  fruity: int("fruity"),
  herbal: int("herbal"),
  authorDate: varchar("author_date", { length: 20 }),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserRecipeSubmission = typeof userRecipeSubmissions.$inferSelect;
export type InsertUserRecipeSubmission = typeof userRecipeSubmissions.$inferInsert;

// ─── Users ─────────────────────────────────────────────────
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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── OTP Codes ─────────────────────────────────────────────
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

export type OtpCode = typeof otpCodes.$inferSelect;

// ─── AI Usage Tracking ─────────────────────────────────────
export const aiUsage = mysqlTable("ai_usage", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  fingerprint: varchar("fingerprint", { length: 64 }),
  requestType: varchar("request_type", { length: 20 }).notNull(),
  tokensUsed: int("tokens_used").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});