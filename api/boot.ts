import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { seedAdmin } from "./trpc";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const __dirname = import.meta.dirname;
const distPath = path.resolve(__dirname, "..", "dist");

// Папка для загруженных картинок рецептов (вне dist — не удаляется при деплое)
const uploadsDir = path.resolve(__dirname, "..", "uploads", "recipes");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = new Hono();

app.use(cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
}));

// ─── Image upload endpoint ───
app.post("/api/upload-image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Проверяем тип файла
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only jpg, png, webp allowed" }, 400);
    }

    // Проверяем размер (макс 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    // Генерируем уникальное имя
    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `recipe-${hash}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Сохраняем файл
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    // Возвращаем путь для heroImage
    const publicPath = `/uploads/recipes/${fileName}`;
    return c.json({ success: true, path: publicPath });
  } catch (err) {
    console.error("Upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Serve uploaded files ───
app.get("/uploads/*", async (c) => {
  const relativePath = c.req.path.replace("/uploads/", "");
  const filePath = path.resolve(__dirname, "..", "uploads", relativePath);
  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const ct: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };
    return new Response(content, {
      headers: {
        "Content-Type": ct[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return c.notFound();
  }
});

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "") || "";
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ token }),
  });
});

// Static files
app.get("/assets/*", async (c) => {
  const filePath = path.join(distPath, c.req.path);
  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const ct: Record<string, string> = {
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
    };
    return new Response(content, { headers: { "Content-Type": ct[ext] || "application/octet-stream" } });
  } catch {
    return c.notFound();
  }
});

// Static images in root dist folder
app.get("*", async (c) => {
  const ext = path.extname(c.req.path);
  const imageExts = [".jpg", ".jpeg", ".png", ".svg", ".ico", ".webp", ".gif", ".woff2", ".woff", ".ttf"];
  if (imageExts.includes(ext)) {
    const filePath = path.join(distPath, c.req.path);
    try {
      const content = fs.readFileSync(filePath);
      const ct: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".ttf": "font/ttf",
      };
      return new Response(content, { headers: { "Content-Type": ct[ext] || "application/octet-stream" } });
    } catch {
      return c.notFound();
    }
  }
  // SPA fallback
  try {
    const file = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
    return c.html(file);
  } catch {
    return c.text("index.html not found", 500);
  }
});

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server: http://localhost:${port}`);
  seedAdmin();
});

export default app;
