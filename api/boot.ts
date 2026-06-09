import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, serial, varchar, text, timestamp, int, decimal, bigint, json } from "drizzle-orm/mysql-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── DB ───
const pool = createPool({
  uri: process.env.DATABASE_URL || "mysql://root@localhost:3306/nastoika",
  connectionLimit: 10,
});
const db = drizzle(pool);

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

// ─── API handlers ───
async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const pathname = url.pathname.replace("/api/trpc/", "");

  if (pathname === "recipe.list" && req.method === "GET") {
    try { const rows = await db.select().from(recipes); res.end(JSON.stringify({ result: { data: rows } })); }
    catch { res.end(JSON.stringify({ result: { data: [] } })); }
    return;
  }
  if (pathname === "recipe.bySlug" && req.method === "GET") {
    const input = url.searchParams.get("input");
    const slug = input ? JSON.parse(input).json.slug : "";
    try {
      const rows = await db.select().from(recipes);
      const found = rows.find((r: any) => r.slug === slug);
      res.end(JSON.stringify({ result: { data: found || null } }));
    } catch { res.end(JSON.stringify({ result: { data: null } })); }
    return;
  }
  if (pathname === "recipe.upsert" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: Buffer) => body += chunk);
    req.on("end", async () => {
      try { const data = JSON.parse(body).json; await db.insert(recipes).values(data); res.end(JSON.stringify({ result: { data: { success: true } } })); }
      catch { res.end(JSON.stringify({ result: { data: { success: false } } })); }
    });
    return;
  }
  if (pathname === "auth.register" && req.method === "POST") {
    res.end(JSON.stringify({ result: { data: { token: "tk_" + Date.now(), user: { id: 1, name: "User", email: "user@test.com", role: "user" } } } }));
    return;
  }
  if (pathname === "auth.login" && req.method === "POST") {
    res.end(JSON.stringify({ result: { data: { token: "tk_" + Date.now(), user: { id: 1, name: "Admin", email: "admin@ai-nastoika.ru", role: "admin" } } } }));
    return;
  }
  if (pathname === "auth.me" && req.method === "GET") {
    res.end(JSON.stringify({ result: { data: { id: 1, name: "Admin", email: "admin@ai-nastoika.ru", role: "admin" } } }));
    return;
  }
  res.end(JSON.stringify({ result: { data: null } }));
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

// ─── Server ───
const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (reqUrl.pathname.startsWith("/api/")) {
    handleApi(req, res, reqUrl);
    return;
  }
  serveStatic(req, res);
});

const port = Number(process.env.PORT || 3000);
export default server;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});