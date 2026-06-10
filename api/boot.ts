import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { seedAdmin } from "./trpc";
import fs from "fs";
import path from "path";

const __dirname = import.meta.dirname;
const distPath = path.resolve(__dirname, "..", "dist");

const app = new Hono();

app.use(cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
}));

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

// Static files (assets, images, etc.)
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

// Root + SPA fallback — always index.html
app.get("*", async (c) => {
  try {
    const file = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
    return c.html(file);
  } catch {
    return c.text("index.html not found. Run npm run build first.", 500);
  }
});

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
  seedAdmin();
});

export default app;
