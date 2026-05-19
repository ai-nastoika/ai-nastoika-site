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
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true })
    .notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  amount: varchar("amount", { length: 100 }),
  note: varchar("note", { length: 200 }),
  sortOrder: int("sort_order").default(0),
});

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

// ─── Recipe Steps ──────────────────────────────────────────
export const recipeSteps = mysqlTable("recipe_steps", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true })
    .notNull(),
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
  placeId: bigint("place_id", { mode: "number", unsigned: true })
    .notNull(),
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
  authorName: varchar("author_name", { length: 100 }),
  authorAvatar: varchar("author_avatar", { length: 10 }),
  text: text("text").notNull(),
  likes: int("likes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
