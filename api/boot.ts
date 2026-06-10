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
// import superjson from "superjson"; // plain JSON for tRPC v11 compatibility

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "ainastoika-secret-key-2025");

// Schema
const users = mysqlTable("users", { id: serial("id").primaryKey(), email: varchar("email", { length: 320 }).notNull().unique(), passwordHash: varchar("password_hash", { length: 255 }).notNull(), name: varchar("name", { length: 100 }), avatar: varchar("avatar", { length: 255 }), role: varchar("role", { length: 20 }).default("user").notNull(), createdAt: timestamp("created_at").defaultNow().notNull() });

let db: any;
let useFallback = false;

async function initDb() {
  try {
    const testPool = createPool({ uri: process.env.DATABASE_URL || "mysql://root@localhost:3306/nastoika", connectionLimit: 1, connectTimeout: 2000 });
    await testPool.query("SELECT 1");
    testPool.end();
    db = drizzle(createPool({ uri: process.env.DATABASE_URL || "mysql://root@localhost:3306/nastoika", connectionLimit: 10 }));
    console.log("[DB] MySQL connected");
  } catch {
    console.log("[DB] MySQL not available, using in-memory fallback");
    useFallback = true;
    const memUsers: any[] = [{ id: 1, email: "admin@ai-nastoika.ru", passwordHash: bcrypt.hashSync("admin123", 10), name: "Администратор", role: "admin", createdAt: new Date() }];
    const memRecipes: any[] = [];
    db = {
      select: () => ({ from: (table: any) => ({ where: (cond: any) => {
        const tn = table?.name || "users";
        const data = tn === "users" ? memUsers : memRecipes;
        if (cond && typeof cond === "function") {
          return data.filter((r: any) => { try { return cond(r); } catch { return false; } });
        }
        return data;
      }})}),
      insert: (table: any) => ({ values: (data: any) => { 
        const tn = table?.name || "recipes"; 
        const arr = tn === "users" ? memUsers : memRecipes;
        const newItem = { ...data, id: arr.length + 1, createdAt: new Date() };
        arr.push(newItem);
        return [{ insertId: newItem.id }];
      }}),
    };
  }
}

async function createToken(userId: number, email: string, role: string) { return new SignJWT({ sub: String(userId), email, role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET); }
async function verifyToken(token: string) { try { const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 }); return payload as any; } catch { return null; } }
async function getAuthUser(req: http.IncomingMessage) { 
  const auth = req.headers.authorization; 
  if (!auth?.startsWith("Bearer ")) return null; 
  const payload = await verifyToken(auth.slice(7)); 
  if (!payload) return null; 
  if (useFallback) {
    // Fallback: search in mock users array
    const all = await db.select().from(users);
    return (Array.isArray(all) ? all : []).find((u: any) => u.id === Number(payload.sub)) || null;
  }
  const rows = await db.select().from(users).where(eq(users.id, Number(payload.sub))); 
  return rows[0] || null; 
}
function parseBody(req: http.IncomingMessage): Promise<any> { return new Promise((resolve) => { let body = ""; req.on("data", (chunk) => (body += chunk)); req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } }); }); }
function setCors(res: http.ServerResponse) { res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE"); }

const LOGS: any[] = [];
function addLog(log: any) { LOGS.push(log); if (LOGS.length > 100) LOGS.shift(); console.log("[LOG]", JSON.stringify(log)); }

async function handleRoute(pathname: string, req: http.IncomingMessage, url: URL, body?: any): Promise<any> {
  const input = body?.json || (body && body["1"] ? body["1"].json : undefined);
  addLog({ route: pathname, method: req.method, inputType: typeof input, input });

  if (pathname === "auth.register") {
    const { email, password, name } = input || {};
    if (!email || !password) return { error: { message: "Email and password required", code: "BAD_REQUEST" } };
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) return { error: { message: "Email already registered", code: "CONFLICT" } };
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db.insert(users).values({ email, passwordHash, name: name || email.split("@")[0], role: "user" });
    const userId = Number(result[0].insertId);
    const token = await createToken(userId, email, "user");
    return { result: { data: { token, user: { id: userId, name: name || email.split("@")[0], email, role: "user" } } } };
  }

  if (pathname === "auth.login") {
    const { email, password } = input || {};
    if (!email || !password) return { error: { message: "Email and password required", code: "BAD_REQUEST" } };
    const rows = await db.select().from(users).where(eq(users.email, email));
    if (rows.length === 0) return { error: { message: "Invalid credentials", code: "UNAUTHORIZED" } };
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.passwordHash)) return { error: { message: "Invalid credentials", code: "UNAUTHORIZED" } };
    const token = await createToken(user.id, user.email, user.role);
    return { result: { data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } } };
  }

  if (pathname === "auth.me") {
    const user = await getAuthUser(req);
    return { result: { data: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null } };
  }

  if (pathname === "auth.logout") return { result: { data: { success: true } } };
  if (pathname === "ping") return { result: { data: { ok: true } } };

  // RECIPES
  if (pathname === "recipe.list") {
    const rTable = mysqlTable("recipes", { id: serial("id").primaryKey(), slug: varchar("slug", { length: 100 }).notNull().unique(), title: varchar("title", { length: 200 }).notNull(), subtitle: varchar("subtitle", { length: 300 }), category: varchar("category", { length: 50 }).notNull(), categoryLabel: varchar("category_label", { length: 100 }), heroImage: varchar("hero_image", { length: 255 }), abv: varchar("abv", { length: 10 }), time: varchar("time", { length: 50 }), difficulty: varchar("difficulty", { length: 20 }), rating: decimal("rating", { precision: 2, scale: 1 }).default("0"), reviews: int("reviews").default(0), year: varchar("year", { length: 50 }), origin: varchar("origin", { length: 100 }), historyTitle: varchar("history_title", { length: 200 }), historyText: text("history_text"), tastingColor: varchar("tasting_color", { length: 200 }), tastingDescription: text("tasting_description"), tastingPairing: json("tasting_pairing").$type<string[]>(), tastingTemp: varchar("tasting_temp", { length: 50 }), tastingGlass: varchar("tasting_glass", { length: 100 }), sweet: int("sweet").default(0), sour: int("sour").default(0), bitter: int("bitter").default(0), spicy: int("spicy").default(0), fruity: int("fruity").default(0), herbal: int("herbal").default(0), tips: json("tips").$type<string[]>(), authorName: varchar("author_name", { length: 100 }), authorDate: varchar("author_date", { length: 50 }), createdAt: timestamp("created_at").defaultNow().notNull() });
    const rows = await db.select().from(rTable);
    return { result: { data: rows } };
  }

  if (pathname === "recipe.bySlug") {
    const slug = input?.slug || "";
    const rTable = mysqlTable("recipes", { id: serial("id").primaryKey(), slug: varchar("slug", { length: 100 }).notNull().unique(), title: varchar("title", { length: 200 }).notNull(), subtitle: varchar("subtitle", { length: 300 }), category: varchar("category", { length: 50 }).notNull(), categoryLabel: varchar("category_label", { length: 100 }), heroImage: varchar("hero_image", { length: 255 }), abv: varchar("abv", { length: 10 }), time: varchar("time", { length: 50 }), difficulty: varchar("difficulty", { length: 20 }), rating: decimal("rating", { precision: 2, scale: 1 }).default("0"), reviews: int("reviews").default(0), year: varchar("year", { length: 50 }), origin: varchar("origin", { length: 100 }), historyTitle: varchar("history_title", { length: 200 }), historyText: text("history_text"), tastingColor: varchar("tasting_color", { length: 200 }), tastingDescription: text("tasting_description"), tastingPairing: json("tasting_pairing").$type<string[]>(), tastingTemp: varchar("tasting_temp", { length: 50 }), tastingGlass: varchar("tasting_glass", { length: 100 }), sweet: int("sweet").default(0), sour: int("sour").default(0), bitter: int("bitter").default(0), spicy: int("spicy").default(0), fruity: int("fruity").default(0), herbal: int("herbal").default(0), tips: json("tips").$type<string[]>(), authorName: varchar("author_name", { length: 100 }), authorDate: varchar("author_date", { length: 50 }), createdAt: timestamp("created_at").defaultNow().notNull() });
    const rows = await db.select().from(rTable).where(eq(rTable.slug, slug));
    return { result: { data: rows[0] || null } };
  }

  if (pathname === "recipe.upsert") { await db.insert(mysqlTable("recipes", { id: serial("id").primaryKey(), slug: varchar("slug", { length: 100 }).notNull().unique(), title: varchar("title", { length: 200 }).notNull() })).values(input || {}); return { result: { data: { success: true } } }; }
  if (pathname === "recipe.delete") return { result: { data: { success: true } } };
  if (pathname === "place.list") return { result: { data: [] } };
  if (pathname === "place.bySlug") return { result: { data: null } };
  if (pathname === "comment.list") return { result: { data: [] } };
  if (pathname === "recipeParser.checkLimit") return { result: { data: { allowed: true, isLoggedIn: false } } };
  if (pathname === "labelTemplate.list") return { result: { data: [] } };
  if (pathname.startsWith("submission.")) return { result: { data: { success: true, id: Date.now() } } };

  return { result: { data: null } };
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  setCors(res);
  if (req.method === "OPTIONS") { res.end(); return; }
  
  const pathname = url.pathname.replace("/api/trpc/", "");
  
  if (req.method === "POST") {
    const body = await parseBody(req);
    addLog({ type: "POST", pathname: url.pathname, bodyKeys: Object.keys(body), hasJson: "json" in body, has0: "0" in body, has1: "1" in body });
    
    // tRPC v11: {"0": {"json": input}}
    if (body && typeof body === "object" && "0" in body) {
      const input = body["0"];
      addLog({ tpc11Input: input, hasJson: "json" in input });
      const result = await handleRoute(pathname, req, url, { json: input?.json });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify([result]));
      return;
    }
    // Array batch
    if (Array.isArray(body)) {
      const results = [];
      for (const op of body) {
        const p = op["0"]?.json || op.path;
        const input = op["1"];
        results.push(await handleRoute(p, req, url, { json: input?.json }));
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(results));
      return;
    }
    // Single with json
    const result = await handleRoute(pathname, req, url, body);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
    return;
  }
  // GET
  const result = await handleRoute(pathname, req, url);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(result));
}

// Seed
async function seedAdmin() { try { const rows = await db.select().from(users).where(eq(users.email, "admin@ai-nastoika.ru")); if (rows.length === 0) { const hash = bcrypt.hashSync("admin123", 10); await db.insert(users).values({ email: "admin@ai-nastoika.ru", passwordHash: hash, name: "Администратор", role: "admin" }); console.log("[seed] Admin: admin@ai-nastoika.ru / admin123"); } } catch (e) { console.log("[seed] skip:", (e as Error).message); } }

// Static
function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) { const distPath = path.join(__dirname, "..", "dist"); const reqPath = new URL(req.url || "/", "http://localhost").pathname; const filePath = path.join(distPath, reqPath === "/" ? "index.html" : reqPath); fs.readFile(filePath, (err, data) => { if (err) { fs.readFile(path.join(distPath, "index.html"), (err2, data2) => { if (err2) { res.statusCode = 404; res.end("Not found"); } else { res.setHeader("Content-Type", "text/html"); res.end(data2); } }); return; } const ext = path.extname(filePath); const ct: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" }; res.setHeader("Content-Type", ct[ext] || "application/octet-stream"); res.end(data); }); }

async function startServer() {
  await initDb();
  
  const server = http.createServer((req, res) => { 
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`); 
    if (reqUrl.pathname === "/api/debug") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(LOGS)); return; } 
    if (reqUrl.pathname.startsWith("/api/")) { handleApi(req, res, reqUrl); return; } 
    serveStatic(req, res); 
  });
  
  server.listen(3000, () => { 
    console.log("Server: http://localhost:3000"); 
    seedAdmin(); 
  });
}

startServer();
export default {} as any;
