import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { seedAdmin } from "./trpc";

const app = new Hono();

app.use(cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
}));

// tRPC handler — правильный адаптер для v11
app.use("/api/trpc/*", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "") || "";
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ token }),
  });
});

// Health check
app.get("/", (c) => c.json({ status: "ok", message: "Ай, настойка API" }));

// SPA fallback — отдаём index.html для всех не-API путей
app.get("*", async (c) => {
  try {
    const file = await import("fs").then(fs => fs.readFileSync("./dist/index.html", "utf-8"));
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
