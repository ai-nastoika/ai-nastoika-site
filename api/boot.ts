import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { mysqlTable, serial, varchar, text, timestamp, int, decimal, bigint, json } from "drizzle-orm/mysql-core";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import superjson from "superjson";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── JWT Secret ───
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "ainastoika-secret-key-2025-change-in-production"
);
const JWT_EXPIRES = "7d";

// ─── DB ───
const pool = createPool({
  uri: process.env.DATABASE_URL || "mysql://root@localhost:3306/nastoika",
  connectionLimit: 10,
});
const db = drizzle(pool);

// ─── Schema ───
const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  avatar: varchar("avatar", { length: 255 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const recipes = mysqlTable("recipes", {
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

// ─── Auth helpers ───
async function createToken(userId: number, email: string, role: string): Promise<string> {
  return new SignJWT({ sub: String(userId), email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(JWT_SECRET);
}

async function verifyToken(token: string): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    return payload as { sub: string; email: string; role: string };
  } catch {
    return null;
  }
}

async function getAuthUser(req: http.IncomingMessage) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifyToken(auth.slice(7));
  if (!payload) return null;
  const rows = await db.select().from(users).where(eq(users.id, Number(payload.sub)));
  return rows[0] || null;
}

// ─── Body parser ───
function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// ─── tRPC response helpers (superjson batch format) ───
function serialize(data: any): string {
  return superjson.stringify(data);
}

function trpcResult(data: any) {
  return { result: { data: superjson.serialize(data) } };
}

function trpcError(message: string, code = "INTERNAL_SERVER_ERROR") {
  return { error: { message, code } };
}

// ─── CORS ───
function setCors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
}

// ─── Parse tRPC batch request ───
function getBatchPaths(url: URL): string[] {
  const pathParam = url.searchParams.get("batch") || "1";
  const paths: string[] = [];
  for (let i = 0; i < Number(pathParam); i++) {
    const p = url.searchParams.get(`path${i === 0 ? "" : "." + i}`);
    if (p) paths.push(p);
  }
  // Single request
  if (paths.length === 0) {
    const pathname = url.pathname.replace("/api/trpc/", "");
    if (pathname && !pathname.includes("?")) paths.push(pathname);
  }
  return paths;
}

// ─── API handler ───
async function handleProcedure(pathname: string, req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<any> {
  const body = req.method === "POST" ? await parseBody(req) : {};
  const input = body.json || url.searchParams.get("input") ? JSON.parse(url.searchParams.get("input") || "{}").json : undefined;

  // AUTH: register
  if (pathname === "auth.register") {
    const { email, password, name } = input || body;
    if (!email || !password) return trpcError("Email and password required", "BAD_REQUEST");
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) return trpcError("Email already registered", "CONFLICT");
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.insert(users).values({ email, passwordHash, name: name || email.split("@")[0], role: "user" });
    const userId = Number(result[0].insertId);
    const token = await createToken(userId, email, "user");
    return trpcResult({ token, user: { id: userId, name: name || email.split("@")[0], email, role: "user" } });
  }

  // AUTH: login
  if (pathname === "auth.login") {
    const { email, password } = input || body;
    if (!email || !password) return trpcError("Email and password required", "BAD_REQUEST");
    const rows = await db.select().from(users).where(eq(users.email, email));
    if (rows.length === 0) return trpcError("Invalid credentials", "UNAUTHORIZED");
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.passwordHash)) return trpcError("Invalid credentials", "UNAUTHORIZED");
    const token = await createToken(user.id, user.email, user.role);
    return trpcResult({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  // AUTH: me
  if (pathname === "auth.me") {
    const user = await getAuthUser(req);
    if (!user) return trpcResult(null);
    return trpcResult({ id: user.id, name: user.name, email: user.email, role: user.role });
  }

  // AUTH: logout
  if (pathname === "auth.logout") {
    return trpcResult({ success: true });
  }

  // RECIPE: list
  if (pathname === "recipe.list") {
    try { const rows = await db.select().from(recipes); return trpcResult(rows); }
    catch (e) { return trpcError(String(e), "INTERNAL_SERVER_ERROR"); }
  }

  // RECIPE: bySlug
  if (pathname === "recipe.bySlug") {
    const slug = input?.slug || "";
    try { const rows = await db.select().from(recipes).where(eq(recipes.slug, slug)); return trpcResult(rows[0] || null); }
    catch (e) { return trpcError(String(e), "INTERNAL_SERVER_ERROR"); }
  }

  // RECIPE: upsert
  if (pathname === "recipe.upsert") {
    const data = input || body;
    try { await db.insert(recipes).values(data); return trpcResult({ success: true }); }
    catch (e) { return trpcError(String(e), "INTERNAL_SERVER_ERROR"); }
  }

  // RECIPE: delete
  if (pathname === "recipe.delete") {
    try { return trpcResult({ success: true }); }
    catch (e) { return trpcError(String(e), "INTERNAL_SERVER_ERROR"); }
  }

  // PLACE: list
  if (pathname === "place.list") {
    return trpcResult([]);
  }

  // COMMENT: list
  if (pathname === "comment.list") {
    return trpcResult([]);
  }

  // RECIPE PARSER: checkLimit
  if (pathname === "recipeParser.checkLimit") {
    return trpcResult({ allowed: true, isLoggedIn: false });
  }

  // LABEL TEMPLATE: list
  if (pathname === "labelTemplate.list") {
    return trpcResult([]);
  }

  // SUBMISSION: create
  if (pathname === "submission.create") {
    return trpcResult({ id: Date.now() });
  }
  if (pathname === "submission.saveProcessed") {
    return trpcResult({ success: true });
  }
  if (pathname === "submission.submit") {
    return trpcResult({ success: true });
  }
  if (pathname === "submission.listAll") {
    return trpcResult([]);
  }
  if (pathname === "submission.approve") {
    return trpcResult({ success: true });
  }
  if (pathname === "submission.reject") {
    return trpcResult({ success: true });
  }

  return trpcError("Not found", "NOT_FOUND");
}

// ─── Main API handler ───
async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  res.setHeader("Content-Type", "application/json");
  setCors(res);

  if (req.method === "OPTIONS") { res.end(); return; }

  const pathname = url.pathname.replace("/api/trpc/", "");

  // Check for batch request
  if (url.searchParams.has("batch")) {
    const paths: string[] = [];
    for (let i = 0; i < Number(url.searchParams.get("batch")); i++) {
      const p = url.searchParams.get(i === 0 ? "path" : `path.${i}`);
      if (p) paths.push(p);
    }
    const results = [];
    for (const p of paths) {
      results.push(await handleProcedure(p, req, res, url));
    }
    res.end(JSON.stringify(results));
    return;
  }

  // Single request
  const result = await handleProcedure(pathname, req, res, url);
  res.end(JSON.stringify(result));
}

// ─── Static files ───
function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const distPath = path.join(__dirname, "..", "dist");
  const reqPath = new URL(req.url || "/", "http://localhost").pathname;
  const filePath = path.join(distPath, reqPath === "/" ? "index.html" : reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(distPath, "index.html"), (err2, data2) => {
        if (err2) { res.statusCode = 404; res.end("Not found"); }
        else { res.setHeader("Content-Type", "text/html"); res.end(data2); }
      });
      return;
    }
    const ext = path.extname(filePath);
    const ct: Record<string, string> = {
      ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2"
    };
    res.setHeader("Content-Type", ct[ext] || "application/octet-stream");
    res.end(data);
  });
}

// ─── Seed admin user ───
async function seedAdmin() {
  try {
    const rows = await db.select().from(users).where(eq(users.email, "admin@ai-nastoika.ru"));
    if (rows.length === 0) {
      const hash = bcrypt.hashSync("admin123", 10);
      await db.insert(users).values({ email: "admin@ai-nastoika.ru", passwordHash: hash, name: "Администратор", role: "admin" });
      console.log("[seed] Admin user created: admin@ai-nastoika.ru / admin123");
    }
  } catch (e) {
    console.log("[seed] Skip:", (e as Error).message);
  }
}

// ─── Server ───
const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);
  if (reqUrl.pathname.startsWith("/api/")) { handleApi(req, res, reqUrl); return; }
  serveStatic(req, res);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  seedAdmin();
});

export default server;
