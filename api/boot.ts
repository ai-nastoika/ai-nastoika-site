import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { seedAdmin } from "./trpc";
import { createContext } from "./context";
import { startWebsiteCheckCron } from "./lib/websiteChecker";
import { startTrackerReminderCron } from "./lib/trackerReminders";
import { creditTopup, recordDonation } from "./lib/balance";
import { fetchPaymentStatus } from "./lib/payments";
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

// Папка для шаблонов этикеток
const labelsDir = path.resolve(__dirname, "..", "uploads", "labels");
if (!fs.existsSync(labelsDir)) {
  fs.mkdirSync(labelsDir, { recursive: true });
}

// Папка для загруженных картинок заведений
const placesDir = path.resolve(__dirname, "..", "uploads", "places");
if (!fs.existsSync(placesDir)) {
  fs.mkdirSync(placesDir, { recursive: true });
}

// Папка для фото трекера созревания (обложки настоек + фото по этапам)
const trackerDir = path.resolve(__dirname, "..", "uploads", "trackers");
if (!fs.existsSync(trackerDir)) {
  fs.mkdirSync(trackerDir, { recursive: true });
}

// Папка для аватаров пользователей
const avatarsDir = path.resolve(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
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

// ─── Place image upload endpoint ───
app.post("/api/upload-place-image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only jpg, png, webp allowed" }, 400);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `place-${hash}${ext}`;
    const filePath = path.join(placesDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const publicPath = `/uploads/places/${fileName}`;
    return c.json({ success: true, path: publicPath });
  } catch (err) {
    console.error("Place image upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Label template upload endpoint ───
// ВАЖНО: раньше здесь была автоматическая склейка "_base.png" (линии
// ДАТА/КРЕПОСТЬ/%) поверх каждого загруженного шаблона через Python.
// Убрано: она вплавляла линии в файл НАВСЕГДА при каждой заливке, из-за
// чего при повторной загрузке одного и того же шаблона линии клеились
// друг на друга (видно на текущем id=1 — тройной наплыв "ДАТА/КРЕПОСТЬ").
// Теперь этот эндпоинт просто сохраняет файл как есть — рамка/узоры/линии
// уже должны быть частью самого шаблона (нарисованы в оригинале), а фото
// пользователя накладывается динамически при рендере через
// labelTemplateRouter.render (api/lib/labelEngine.ts), не портя исходник.
app.post("/api/upload-label", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only jpg, png, webp allowed" }, 400);
    }
    const maxSize = 10 * 1024 * 1024; // 10MB для этикеток
    if (file.size > maxSize) {
      return c.json({ error: "File too large (max 10MB)" }, 400);
    }
    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `label-${hash}${ext}`;
    const filePath = path.join(labelsDir, fileName);
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const publicPath = `/uploads/labels/${fileName}`;
    return c.json({ success: true, path: publicPath });
  } catch (err) {
    console.error("Label upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Tracker (infusion) image upload endpoint ───
app.post("/api/upload-tracker-image", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only jpg, png, webp allowed" }, 400);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `tracker-${hash}${ext}`;
    const filePath = path.join(trackerDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const publicPath = `/uploads/trackers/${fileName}`;
    return c.json({ success: true, path: publicPath });
  } catch (err) {
    console.error("Tracker image upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Avatar upload endpoint ───
app.post("/api/upload-avatar", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only jpg, png, webp allowed" }, 400);
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: "File too large (max 5MB)" }, 400);
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `avatar-${hash}${ext}`;
    const filePath = path.join(avatarsDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const publicPath = `/uploads/avatars/${fileName}`;
    return c.json({ success: true, path: publicPath });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── ЮKassa webhook: подтверждение оплаты (пополнение баланса ИЛИ донат) ───
// Настраивается в личном кабинете ЮKassa на событие payment.succeeded.
// Телу вебхука не доверяем напрямую (его в теории можно подделать) —
// перепроверяем статус платежа отдельным запросом к самой ЮKassa по id.
// Обработка идемпотентна (см. api/lib/balance.ts) — повторный вебхук
// по уже обработанному платежу просто ничего не сделает повторно.
app.post("/api/webhooks/yookassa", async (c) => {
  try {
    const body = (await c.req.json().catch(() => null)) as { object?: { id?: string } } | null;
    const paymentId = body?.object?.id;
    if (!paymentId) {
      return c.json({ error: "no payment id in webhook body" }, 400);
    }

    const payment = await fetchPaymentStatus(paymentId);
    if (payment.status !== "succeeded" || !payment.paid) {
      // Платёж отменён/ещё не завершён — не ошибка, просто нечего зачислять.
      return c.json({ ok: true, skipped: true });
    }

    const amountKopecks = Math.round(parseFloat(payment.amount.value) * 100);
    const kind = payment.metadata?.kind;

    if (kind === "donation") {
      // Донат — можно и без userId (анонимная поддержка проекта).
      const userId = payment.metadata?.userId ? Number(payment.metadata.userId) : undefined;
      const result = await recordDonation({
        userId: userId && !Number.isNaN(userId) ? userId : undefined,
        amountKopecks,
        externalId: payment.id,
        name: payment.metadata?.name,
        message: payment.metadata?.message,
      });
      return c.json({ ok: true, recorded: result.recorded });
    }

    // По умолчанию — пополнение баланса, для него userId обязателен.
    const userId = Number(payment.metadata?.userId);
    if (!userId || Number.isNaN(userId)) {
      console.error("YooKassa webhook: no userId in payment metadata", payment.id);
      return c.json({ error: "no userId in payment metadata" }, 400);
    }

    const result = await creditTopup({
      userId,
      amountKopecks,
      externalId: payment.id,
      meta: { source: "yookassa_webhook" },
    });

    return c.json({ ok: true, credited: result.credited });
  } catch (err) {
    console.error("YooKassa webhook error:", err);
    return c.json({ error: "internal error" }, 500);
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
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
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
  startWebsiteCheckCron();
  startTrackerReminderCron();
});

export default app;
