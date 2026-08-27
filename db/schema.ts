import {
  mysqlTable,
  serial,
  varchar,
  text,
  mediumtext,
  timestamp,
  int,
  decimal,
  bigint,
  json,
  uniqueIndex,
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
  // Ручной флаг администратора — показывать ли рецепт в "Популярные рецепты"
  // на главной странице. 1/0, как и другие такие флаги в этой схеме (см. isDonor).
  featured: int("featured").default(0).notNull(),
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

// ─── Recipe Tracker Stages ───────────────────────────────────
// Отдельный, не привязанный к тексту рецепта блок — план этапов для
// Трекера созревания. Не показывается на странице рецепта, виден
// только в редакторе админки. Один шаг рецепта в прозе может
// объединять несколько таких этапов (или не содержать ни одного).
export const recipeTrackerStages = mysqlTable("recipe_tracker_stages", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }).notNull(),
  stageType: varchar("stage_type", { length: 20 }).notNull(), // pour | shake | strain | rest | taste | add_ingredient | custom
  title: varchar("title", { length: 300 }).notNull(),
  dayOffset: int("day_offset").notNull().default(0), // день от старта настойки (0 = день заливки)
  repeatEveryDays: int("repeat_every_days"), // если задано — повторяется каждые N дней начиная с dayOffset
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
  // ─ координаты для реальной карты (Яндекс.Карты) ─
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  // ссылка на Яндекс.Карты, из которой были извлечены координаты (ll=) —
  // хранится для будущей перепроверки/повторного парсинга, не для показа
  yandexUrl: varchar("yandex_url", { length: 500 }),
  // ─ контроль актуальности сайта: раз в ~90 дней сервер сам проверяет доступность ─
  websiteStatus: varchar("website_status", { length: 20 }).default("unknown"), // unknown | ok | unreachable
  websiteLastCheckedAt: timestamp("website_last_checked_at"),
  // ─ модерация: admin создаёт сразу approved, заявки пользователей — pending ─
  status: varchar("status", { length: 20 }).notNull().default("approved"), // approved | pending | rejected
  submittedByUserId: bigint("submitted_by_user_id", { mode: "number", unsigned: true }),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviews: int("reviews").default(0),
  price: varchar("price", { length: 20 }),
  hours: varchar("hours", { length: 100 }),
  image: varchar("image", { length: 255 }),
  // Файлы меню (PDF и/или фото страниц) — можно прикрепить несколько.
  // Хранится как массив {url, name}, url — путь вида /uploads/menus/....
  menuFiles: json("menu_files").$type<{ url: string; name: string }[]>(),
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

// ─── Place Submissions (заявки на добавление заведений) ────
export const placeSubmissions = mysqlTable("place_submissions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  fingerprint: varchar("fingerprint", { length: 64 }),
  authorName: varchar("author_name", { length: 100 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | ai_processed | pending | approved | rejected

  // Самостоятельный ответ заявителя на вопрос "есть ли уже тег «Настойки» в отзывах
  // на Яндекс.Картах" — не финальное решение (это по-прежнему проверяют админы),
  // а только для быстрой сортировки заявок в очереди модерации.
  yandexTagStatus: varchar("yandex_tag_status", { length: 20 }), // has_tag | wants_paid | no_tag_wait

  // ─ сырые данные, вставленные вручную (адрес/координаты копируются
  //   с открытой точки на Яндекс.Картах, отзывы — вручную найденные фрагменты) ─
  rawUrl: varchar("raw_url", { length: 500 }),
  rawCoords: varchar("raw_coords", { length: 100 }), // напр. "55.7558, 37.6173"
  rawAddress: text("raw_address"),
  rawPhone: varchar("raw_phone", { length: 50 }),
  rawHours: varchar("raw_hours", { length: 200 }),
  rawReviews: text("raw_reviews"), // вставленные тексты отзывов для анализа ИИ
  rawNotes: text("raw_notes"),

  // ─ поля, структурированные ИИ — 1:1 с таблицей places ─
  slug: varchar("slug", { length: 100 }),
  name: varchar("name", { length: 200 }),
  city: varchar("city", { length: 100 }),
  address: varchar("address", { length: 300 }),
  metro: varchar("metro", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 200 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  hours: varchar("hours", { length: 100 }),
  image: varchar("image", { length: 255 }),
  tags: json("tags").$type<string[]>(),
  description: text("description"),
  infusionsHighlight: varchar("infusions_highlight", { length: 300 }),
  infusionsSignature: varchar("infusions_signature", { length: 200 }),
  externalSummary: text("external_summary"),
  externalPros: json("external_pros").$type<string[]>(),
  externalCons: json("external_cons").$type<string[]>(),

  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PlaceSubmission = typeof placeSubmissions.$inferSelect;
export type InsertPlaceSubmission = typeof placeSubmissions.$inferInsert;

// ─── Favorites (избранное, привязанное к аккаунту) ─────────
export const favorites = mysqlTable("favorites", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull(), // 'place' | 'recipe'
  itemId: bigint("item_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFavorite: uniqueIndex("unique_favorite").on(table.userId, table.itemType, table.itemId),
}));

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// ─── Comments ──────────────────────────────────────────────
export const comments = mysqlTable("comments", {
  id: serial("id").primaryKey(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }),
  placeId: bigint("place_id", { mode: "number", unsigned: true }),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  authorName: varchar("author_name", { length: 100 }),
  authorAvatar: varchar("author_avatar", { length: 10 }),
  text: text("text").notNull(),
  // Оценка "рюмками" — только вместе с отзывом, не отдельная фича.
  // green = отлично, yellow = нормально, red = плохо. null — комментарий без оценки (вопрос/реплика).
  rating: varchar("rating", { length: 10 }), // green | yellow | red
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
  answer: text("answer"),
  answeredAt: timestamp("answered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

// ─── Label Template Types ───────────────────────────────────
export const labelTemplateTypes = mysqlTable("label_template_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 300 }),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: int("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LabelTemplateType = typeof labelTemplateTypes.$inferSelect;
export type InsertLabelTemplateType = typeof labelTemplateTypes.$inferInsert;

// ─── Label Templates ────────────────────────────────────────
export const labelTemplates = mysqlTable("label_templates", {
  id: serial("id").primaryKey(),
  typeId: int("type_id"),
  isBase: int("is_base").notNull().default(0),
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

// ─── Примеры сгенерированных этикеток — витрина на странице генератора,
// пополняется вручную администраторами (не автосохранение всех генераций
// пользователей — только отобранные удачные примеры). ───
export const labelExamples = mysqlTable("label_examples", {
  id: serial("id").primaryKey(),
  imageUrl: varchar("image_url", { length: 255 }).notNull(),
  // Промпт/описание, которым была получена этикетка — показываем как есть,
  // чтобы вдохновить пользователя и подсказать, как формулировать запрос.
  prompt: text("prompt").notNull(),
  title: varchar("title", { length: 150 }), // короткая подпись под примером, необязательно
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LabelExample = typeof labelExamples.$inferSelect;
export type InsertLabelExample = typeof labelExamples.$inferInsert;

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
  // Восстановление забытого пароля — та же схема, что и подтверждение email:
  // случайный токен + срок действия, обнуляются после использования.
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  phone: varchar("phone", { length: 20 }),
  phoneVerified: int("phone_verified").default(0).notNull(),
  twoFactorEnabled: int("two_factor_enabled").default(0).notNull(),
  // ─── Тарификация ИИ-запросов ───
  // Новый пользователь получает 5 бесплатных запросов к ИИ-консультанту (разово,
  // не сгорают по дням). После того как счётчик обнулился, каждый запрос стоит
  // AI_REQUEST_COST_KOPECKS (см. api/lib/aiAccess.ts) и списывается с balanceKopecks.
  freeRequestsLeft: int("free_requests_left").default(5).notNull(),
  balanceKopecks: int("balance_kopecks").default(0).notNull(),
  // Значок донора в профиле — выставляется после первого успешного доната
  // (см. donations ниже и вебхук в api/boot.ts). Не влияет на лимиты ИИ-запросов.
  isDonor: int("is_donor").default(0).notNull(),
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
  // 0, если списан бесплатный запрос; иначе — сколько реально списано с баланса (в копейках)
  costKopecks: int("cost_kopecks").default(0).notNull(),
  wasFree: int("was_free").default(1).notNull(),
  // Какая модель реально ответила (см. api/lib/aiClient.ts) — основная или резервная
  modelUsed: varchar("model_used", { length: 100 }),
  usedFallback: int("used_fallback").default(0).notNull(), // 1, если основная модель упала и сработал AI_MODEL_FALLBACK
  // 1, если сам вызов ИИ-провайдера не удался (списание при этом отменяется через refundAiRequest —
  // эта запись только для статистики/индикатора доступности в админке, costKopecks у неё всегда 0)
  failed: int("failed").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiUsage = typeof aiUsage.$inferSelect;

// ─── Транзакции по балансу (пополнения и списания за ИИ-запросы) ─────
export const transactions = mysqlTable("transactions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  // topup_pending — платёж создан, ждём подтверждения от шлюза; topup — зачислено;
  // debit — списание за платный ИИ-запрос; refund — возврат за неудавшийся запрос
  type: varchar("type", { length: 20 }).notNull(),
  amountKopecks: int("amount_kopecks").notNull(), // положительное для topup/refund, отрицательное для debit
  balanceAfter: int("balance_after").notNull(),
  // id платежа в ЮKassa — для идемпотентной обработки вебхука (не зачислить дважды)
  externalId: varchar("external_id", { length: 128 }),
  meta: json("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  externalIdIdx: uniqueIndex("transactions_external_id_idx").on(table.externalId),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Донаты (поддержка проекта) ─────────────────────────────
// Отдельно от transactions/баланса: донат не зачисляется на счёт пользователя
// и не даёт дополнительных ИИ-запросов, только значок донора (users.isDonor).
// Может быть анонимным (userId = null) — авторизация для доната не обязательна.
export const donations = mysqlTable("donations", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }), // null — анонимный донат
  name: varchar("name", { length: 100 }), // как подписать в публичном списке благодарности, если укажет
  amountKopecks: int("amount_kopecks").notNull(),
  message: text("message"),
  // id платежа в ЮKassa — идемпотентность обработки вебхука, как и у transactions.externalId
  externalId: varchar("external_id", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  externalIdIdx: uniqueIndex("donations_external_id_idx").on(table.externalId),
}));

export type Donation = typeof donations.$inferSelect;
export type InsertDonation = typeof donations.$inferInsert;

// ─── Saved Labels ───────────────────────────────────────────
export const savedLabels = mysqlTable("saved_labels", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  templateId: int("template_id").notNull(),
  labelText: varchar("label_text", { length: 200 }).default(""),
  labelDate: varchar("label_date", { length: 50 }).default(""),
  labelStrength: varchar("label_strength", { length: 50 }).default(""),
  imageShape: varchar("image_shape", { length: 20 }).default("rect"),
  imageZoneScale: varchar("image_zone_scale", { length: 10 }).default("1"),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SavedLabel = typeof savedLabels.$inferSelect;
export type InsertSavedLabel = typeof savedLabels.$inferInsert;

// ─── Infusion Tracker — «Трекер созревания» ─────────────────
// Один активный процесс настаивания (банка/бутыль пользователя).
export const infusions = mysqlTable("infusions", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  recipeId: bigint("recipe_id", { mode: "number", unsigned: true }), // null, если рецепт свой, не из базы
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  vesselDescription: varchar("vessel_description", { length: 200 }), // напр. "банка 3 л, кладовая"
  coverImage: varchar("cover_image", { length: 255 }),
  startDate: timestamp("start_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | archived
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Infusion = typeof infusions.$inferSelect;
export type InsertInfusion = typeof infusions.$inferInsert;

// ─── Infusion Stages — этапы конкретного трекера ────────────
// "current" не хранится отдельным статусом — вычисляется на лету
// как ближайший по plannedDate этап со статусом upcoming.
export const infusionStages = mysqlTable("infusion_stages", {
  id: serial("id").primaryKey(),
  infusionId: bigint("infusion_id", { mode: "number", unsigned: true }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("custom"), // pour | shake | strain | rest | taste | custom
  title: varchar("title", { length: 300 }).notNull(),
  plannedDate: timestamp("planned_date").notNull(), // хранит и дату, и время — <input type="time"> на фронте пишет в те же часы:минуты
  status: varchar("status", { length: 20 }).notNull().default("upcoming"), // upcoming | done | skipped
  repeatIntervalDays: int("repeat_interval_days"), // если задано — при выполнении создаётся следующий такой же этап
  // 1 — напоминание (email/пуш) присылать; 0 — галочка "не напоминать" в форме этапа
  notifyEnabled: int("notify_enabled").default(1).notNull(),
  // Момент, когда напоминание реально отправлено — защита от повторной отправки
  // при частом опросе в trackerReminders.ts. Сбрасывается в null при переносе
  // plannedDate или включении notifyEnabled — см. infusionRouter.ts updateStage.
  reminderSentAt: timestamp("reminder_sent_at"),
  completedAt: timestamp("completed_at"),
  note: text("note"),
  photoUrl: varchar("photo_url", { length: 255 }),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InfusionStage = typeof infusionStages.$inferSelect;
export type InsertInfusionStage = typeof infusionStages.$inferInsert;

// ─── AI Conversations — история диалогов с ИИ (recipeConsult/infusionConsult/tasteCalculator) ───
// Один ряд = один диалог (тред). При каждом обмене репликами messages перезаписывается
// целиком новым полным массивом — проще, чем отдельная таблица сообщений, и достаточно
// для истории на 10 последних диалогов в личном кабинете.
export const aiConversations = mysqlTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  requestType: varchar("request_type", { length: 20 }).notNull(), // recipe_consultation | infusion_consult | taste_calculator
  contextId: int("context_id"), // recipeId или infusionId; null для taste_calculator (свободный диалог)
  contextLabel: varchar("context_label", { length: 200 }), // название рецепта/настойки на момент создания — для отображения без лишних join'ов
  messages: json("messages").$type<{ role: "user" | "assistant"; content: string }[]>().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AiConversation = typeof aiConversations.$inferSelect;

// ─── Сгенерированные этикетки — храним сами картинки (base64), не только текст
// в ai_conversations. Держим только 3 последние на пользователя — старые удаляются
// в api/labelGeneratorRouter.ts при добавлении новой. ───
export const generatedLabels = mysqlTable("generated_labels", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  imageBase64: mediumtext("image_base64").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GeneratedLabel = typeof generatedLabels.$inferSelect;
