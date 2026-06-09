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
  process.env.JWT_SECRET || "ainastoika-secret-key-2025"
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

// ─── CORS ───
function setCors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
}

// ─── tRPC v11 response format ───
function trpcResult(data: any) {
  return { result: { data: superjson.serialize(data) } };
}

function trpcError(message: string, code = "INTERNAL_SERVER_ERROR") {
  return { error: { message, code } };
}

// ─── Parse tRPC v11 input ───
function parseInput(raw: any): any {
  if (raw && typeof raw === "object" && "json" in raw) return raw.json;
  return raw;
}

// ─── Route handler ───
async function handleRoute(pathname: string, req: http.IncomingMessage, url: URL): Promise<any> {
  const body = req.method === "POST" ? await parseBody(req) : {};
  
  // Parse input from tRPC v11 format
  let input: any = undefined;
  if (body && typeof body === "object") {
    // POST body: {"json": ...}
    if ("json" in body) {
      input = body.json;
    }
    // Batch format: {"0": {"json": path}, "1": {"json": input}}
    else if ("0" in body && "1" in body) {
      // path is in "0", input is in "1"
      input = parseInput(body["1"]);
    }
  }
  
  // GET input from query param
  if (input === undefined && url.searchParams.has("input")) {
    try { input = JSON.parse(url.searchParams.get("input")!).json; } catch {}
  }

  // AUTH: register
  if (pathname === "auth.register") {
    const { email, password, name } = input || {};
    if (!email || !password) return trpcError("Email and password required");
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) return trpcError("Email already registered");
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.insert(users).values({ email, passwordHash, name: name || email.split("@")[0], role: "user" });
    const userId = Number(result[0].insertId);
    const token = await createToken(userId, email, "user");
    return trpcResult({ token, user: { id: userId, name: name || email.split("@")[0], email, role: "user" } });
  }

  // AUTH: login
  if (pathname === "auth.login") {
    const { email, password } = input || {};
    if (!email || !password) return trpcError("Email and password required");
    const rows = await db.select().from(users).where(eq(users.email, email));
    if (rows.length === 0) return trpcError("Invalid credentials");
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.passwordHash)) return trpcError("Invalid credentials");
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
    const rows = await db.select().from(recipes);
    return trpcResult(rows);
  }

  // RECIPE: bySlug
  if (pathname === "recipe.bySlug") {
    const slug = input?.slug || "";
    const rows = await db.select().from(recipes).where(eq(recipes.slug, slug));
    return trpcResult(rows[0] || null);
  }

  // RECIPE: upsert
  if (pathname === "recipe.upsert") {
    const data = input || {};
    await db.insert(recipes).values(data);
    return trpcResult({ success: true });
  }

  // RECIPE: delete
  if (pathname === "recipe.delete") {
    return trpcResult({ success: true });
  }

  // PLACE: list
  if (pathname === "place.list") return trpcResult([]);
  if (pathname === "place.bySlug") return trpcResult(null);

  // COMMENT: list
  if (pathname === "comment.list") return trpcResult([]);

  // RECIPE PARSER: checkLimit
  if (pathname === "recipeParser.checkLimit") return trpcResult({ allowed: true, isLoggedIn: false });

  // LABEL TEMPLATE: list
  if (pathname === "labelTemplate.list") return trpcResult([]);

  // SUBMISSION
  if (pathname === "submission.create") return trpcResult({ id: Date.now() });
  if (pathname === "submission.saveProcessed") return trpcResult({ success: true });
  if (pathname === "submission.submit") return trpcResult({ success: true });
  if (pathname === "submission.listAll") return trpcResult([]);
  if (pathname === "submission.approve") return trpcResult({ success: true });
  if (pathname === "submission.reject") return trpcResult({ success: true });

  // PING
  if (pathname === "ping") return trpcResult({ ok: true, ts: Date.now() });

  return trpcError("Not found", "NOT_FOUND");
}

// ─── Main API handler ───
async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  setCors(res);

  if (req.method === "OPTIONS") { res.end(); return; }

  const pathname = url.pathname.replace("/api/trpc/", "");

  // Batch request (POST /api/trpc?batch=1 with body {"0": {...}, "1": {...}})
  if (url.searchParams.has("batch") || (!pathname && req.method === "POST")) {
    const body = await parseBody(req);
    const results: any[] = [];
    
    // Check if body is batch array
    if (Array.isArray(body)) {
      for (const op of body) {
        const p = op["0"]?.json || op.path;
        const input = op["1"] || op.input;
        results.push(await handleRoute(p, req, new URL(`http://localhost/api/trpc/${p}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`)));
      }
    }
    // Check if body has numbered keys (batch format)
    else if (body && typeof body === "object" && "0" in body) {
      // Single batch op
      const p = body["0"]?.json || body["0"];
      const input = body["1"];
      const inputStr = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
      results.push(await handleRoute(p, req, new URL(`http://localhost/api/trpc/${p}${inputStr}`)));
    }
    else {
      // Single request without path in body
      results.push(await handleRoute(pathname, req, url));
    }
    
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(results));
    return;
  }

  // Single request
  const result = await handleRoute(pathname, req, url);
  res.setHeader("Content-Type", "application/json");
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
