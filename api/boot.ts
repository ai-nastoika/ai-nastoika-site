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
import { transcribeAudio } from "./lib/sttClient";
import { editImage, buildPhotoEditPrompt } from "./lib/imageClient";
import { compressImageIfNeeded, cropToOrientation } from "./lib/imageCompress";
import { chargeImageRequest, refundAiRequest, logAiUsage, logAiFailure } from "./lib/aiAccess";
import { execFile } from "child_process";
import { promisify } from "util";
import { jwtVerify } from "jose";
import { getDb } from "./queries/connection";
import { users, generatedLabels } from "@db/schema";
import { env } from "./lib/env";
import { JWT_SECRET } from "./lib/jwtSecret";
import { checkRateLimit, getClientIp } from "./lib/rateLimit";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

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

// Папка для файлов меню заведений (PDF и/или фото страниц)
const menusDir = path.resolve(__dirname, "..", "uploads", "menus");
if (!fs.existsSync(menusDir)) {
  fs.mkdirSync(menusDir, { recursive: true });
}

// Папка для примеров сгенерированных этикеток (витрина на странице генератора)
const labelExamplesDir = path.resolve(__dirname, "..", "uploads", "label-examples");
if (!fs.existsSync(labelExamplesDir)) {
  fs.mkdirSync(labelExamplesDir, { recursive: true });
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

// Папка для временных файлов при разборе видео (звук извлекается и сразу удаляется)
const tmpVideoDir = path.resolve(__dirname, "..", "uploads", "tmp-video");
if (!fs.existsSync(tmpVideoDir)) {
  fs.mkdirSync(tmpVideoDir, { recursive: true });
}
// Проверка прав администратора по тому же JWT, что и в api/context.ts —
// нужна здесь отдельно, т.к. это обычный Hono-роут (загрузка файла), а не tRPC.
// ПРИМЕЧАНИЕ: остальные /api/upload-* эндпоинты ниже такой проверки не имеют
// (существующая особенность, не трогаю в рамках этой задачи) — этот новый
// эндпоинт админом защищён, т.к. напрямую тратит платный ИИ-запрос.
async function requireAdmin(authHeader: string | undefined): Promise<boolean> {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const userId = payload.sub ? Number(payload.sub) : 0;
    if (!userId) return false;
    const db = getDb();
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return dbUser?.role === "admin";
  } catch {
    return false;
  }
}

// То же самое, но для обычного авторизованного пользователя (не только
// админа) — нужен userId для списания баланса за платную генерацию.
async function getAuthedUserId(authHeader: string | undefined): Promise<number | null> {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const userId = payload.sub ? Number(payload.sub) : 0;
    return userId || null;
  } catch {
    return null;
  }
}

const app = new Hono();

// ─── Security headers ──
// CSP настроен под РЕАЛЬНО используемые внешние ресурсы (Яндекс.Карты,
// Google Fonts) — ничего лишнего не разрешено. Это единственный из этих
// заголовков, который теоретически может что-то сломать (если у Яндекс.Карт
// есть под-ресурсы с доменов, которых я не учёл, не имея возможности
// проверить визуально) — ПЕРВОЕ, что нужно проверить после деплоя: страница
// /barmap, карта должна нормально показываться и грузить точки заведений.
// Если что-то не так — открыть консоль браузера (F12), там будет понятная
// ошибка вида "Refused to load ... violates Content Security Policy
// directive", и в ней будет видно, какой домен не хватает в списке ниже.
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://api-maps.yandex.ru https://yastatic.net",
  // 'unsafe-inline' в style-src нужен обязательно — вся вёрстка сайта построена
  // на inline style={{...}} в React, без этого директива сломает всё оформление.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.maps.yandex.net https://api-maps.yandex.ru https://yastatic.net https://avatars.mds.yandex.net",
  "connect-src 'self' https://api-maps.yandex.ru https://*.maps.yandex.net https://yastatic.net",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff"); // браузер не должен угадывать тип файла — против атак через подмену расширения
  c.header("X-Frame-Options", "SAMEORIGIN"); // защита от кликджекинга — сайт нельзя встроить в чужой <iframe>
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  // geolocation НЕ блокируем — используется в "заведения рядом со мной" на барной карте
  c.header("Permissions-Policy", "camera=(), microphone=(), payment=()");
  c.header("Content-Security-Policy", CSP);
  if (env.isProduction) {
    // Требует HTTPS на сайте — если сертификата ещё нет, этот заголовок
    // безвреден (браузер его просто игнорирует по HTTP), но принудительно
    // включать редирект на HTTPS раньше, чем сертификат настроен, не стоит.
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  await next();
});

app.use(cors({
  // Раньше было "*" — любой сайт в интернете мог делать запросы к API от лица
  // залогиненного пользователя и читать ответ. Список разрешённых доменов —
  // см. env.ts (ALLOWED_ORIGINS). В dev-режиме браузер вообще не видит эти
  // запросы как межсайтовые — Vite сам проксирует /api на бэкенд (см.
  // vite.config.ts), так что localhost сюда специально не добавляем.
  origin: env.allowedOrigins,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
}));

// ─── Общий защитный лимит на весь /api/* ──
// Точечные лимиты на логин/регистрацию/комментарии (см. api/router.ts,
// api/commentRouter.ts) считают отдельно и по более узким правилам — это
// именно общая страховка от банального скриптового флуда запросов, которую
// точечные лимиты не покрывают (например, массовый перебор GET-запросов
// к чтению данных). 300 запросов в минуту с одного IP — сайт активно ходит
// в API при обычной навигации (десятки запросов на страницу), поэтому лимит
// щедрый, чтобы не задеть живых людей за одним NAT/офисным IP.
app.use("/api/*", async (c, next) => {
  const ip = getClientIp(c.req.raw);
  const rl = checkRateLimit(`global:${ip}`, 300, 60 * 1000);
  if (!rl.allowed) {
    return c.json({ error: "Слишком много запросов, попробуйте чуть позже" }, 429);
  }
  await next();
});

// ─── Image upload endpoint ───
// Используется только в админке (изображения рецептов) — требует прав админа.
app.post("/api/upload-image", async (c) => {
  const isAdmin = await requireAdmin(c.req.header("Authorization"));
  if (!isAdmin) {
    return c.json({ error: "Требуются права администратора" }, 403);
  }
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

// ─── Place menu file upload endpoint (PDF или фото страниц меню) ───
// Защищено проверкой админа (см. requireAdmin выше) — в отличие от соседних
// /api/upload-place-image и т.п., у которых такой проверки исторически нет.
app.post("/api/upload-place-menu", async (c) => {
  const isAdmin = await requireAdmin(c.req.header("Authorization"));
  if (!isAdmin) {
    return c.json({ error: "Требуются права администратора" }, 403);
  }
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Разрешены только PDF, jpg, png, webp" }, 400);
    }

    const maxSize = 15 * 1024 * 1024; // 15MB — сканы меню PDF бывают крупнее обычных фото
    if (file.size > maxSize) {
      return c.json({ error: "Файл слишком большой (макс. 15MB)" }, 400);
    }

    const ext = file.type === "application/pdf" ? ".pdf"
      : file.type === "image/png" ? ".png"
      : file.type === "image/webp" ? ".webp"
      : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `menu-${hash}${ext}`;
    const filePath = path.join(menusDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const publicPath = `/uploads/menus/${fileName}`;
    return c.json({ success: true, path: publicPath, originalName: file.name });
  } catch (err) {
    console.error("Menu upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Label example image upload endpoint (для витрины на странице генератора) ───
// Защищено проверкой админа — те же причины и тот же паттерн, что у upload-place-menu.
app.post("/api/upload-label-example", async (c) => {
  const isAdmin = await requireAdmin(c.req.header("Authorization"));
  if (!isAdmin) {
    return c.json({ error: "Требуются права администратора" }, 403);
  }
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Разрешены только jpg, png, webp" }, 400);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({ error: "Файл слишком большой (макс. 10MB)" }, 400);
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const hash = crypto.randomBytes(8).toString("hex");
    const fileName = `example-${hash}${ext}`;
    const filePath = path.join(labelExamplesDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const publicPath = `/uploads/label-examples/${fileName}`;
    return c.json({ success: true, path: publicPath });
  } catch (err) {
    console.error("Label example upload error:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// ─── Place image upload endpoint ───
// Используется только в парсере заведений в админке — требует прав админа.
app.post("/api/upload-place-image", async (c) => {
  const isAdmin = await requireAdmin(c.req.header("Authorization"));
  if (!isAdmin) {
    return c.json({ error: "Требуются права администратора" }, 403);
  }
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
// Используется только в админке (шаблоны этикеток) — требует прав админа.
app.post("/api/upload-label", async (c) => {
  const isAdmin = await requireAdmin(c.req.header("Authorization"));
  if (!isAdmin) {
    return c.json({ error: "Требуются права администратора" }, 403);
  }
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
// Используется в трекере созревания обычными пользователями — требует
// авторизации (любой залогиненный), но не прав админа: это фото своей же
// настойки, а не публикация в общей базе рецептов/заведений.
app.post("/api/upload-tracker-image", async (c) => {
  const userId = await getAuthedUserId(c.req.header("Authorization"));
  if (!userId) {
    return c.json({ error: "Требуется авторизация" }, 401);
  }
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
// Свой аватар может загрузить только сам залогиненный пользователь.
app.post("/api/upload-avatar", async (c) => {
  const userId = await getAuthedUserId(c.req.header("Authorization"));
  if (!userId) {
    return c.json({ error: "Требуется авторизация" }, 401);
  }
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

// ─── Видео → расшифровка речи (парсер рецептов из видео) ───
// Скачивание по ссылке (YouTube/TikTok/Instagram) — это следующий этап,
// сюда принимается уже готовый файл видео, загруженный вручную.
// Требует ffmpeg, установленный на сервере (apt install ffmpeg) — без него
// извлечение звука упадёт с понятной ошибкой ниже.
app.post("/api/parse-recipe-video", async (c) => {
  if (!(await requireAdmin(c.req.header("authorization")))) {
    return c.json({ error: "Требуются права администратора" }, 403);
  }

  let videoPath: string | undefined;
  let audioPath: string | undefined;

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }
    if (!file.type.startsWith("video/")) {
      return c.json({ error: "Ожидается видеофайл" }, 400);
    }
    const maxSize = 150 * 1024 * 1024; // 150 МБ — с запасом для короткого видео (TikTok/Reels/Shorts)
    if (file.size > maxSize) {
      return c.json({ error: "Файл слишком большой (макс. 150 МБ)" }, 400);
    }

    const hash = crypto.randomBytes(8).toString("hex");
    videoPath = path.join(tmpVideoDir, `${hash}-in`);
    audioPath = path.join(tmpVideoDir, `${hash}-out.mp3`);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(videoPath, Buffer.from(arrayBuffer));

    try {
      // -vn без видео, моно 16кГц — этого с запасом хватает для распознавания
      // речи и заметно уменьшает файл, который дальше улетает в STT.
      await execFileAsync("ffmpeg", [
        "-y", "-i", videoPath,
        "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", "-q:a", "4",
        audioPath,
      ]);
    } catch {
      throw new Error(
        "Не удалось извлечь звук из видео — проверьте, что на сервере установлен ffmpeg (sudo apt install ffmpeg)"
      );
    }

    const audioBuffer = fs.readFileSync(audioPath);
    const transcript = await transcribeAudio(audioBuffer, "audio.mp3");

    return c.json({ success: true, transcript });
  } catch (err) {
    console.error("Video parse error:", err);
    const message = err instanceof Error ? err.message : "Не удалось обработать видео";
    return c.json({ error: message }, 500);
  } finally {
    if (videoPath) { try { fs.unlinkSync(videoPath); } catch { /* уже нет — не страшно */ } }
    if (audioPath) { try { fs.unlinkSync(audioPath); } catch { /* уже нет — не страшно */ } }
  }
});

// ─── Этикетка по своему фото + текстовое описание (GPT Image 2 /images/edits,
// проверено вручную curl'ом — работает через Timeweb Gateway). В отличие от
// генератора с нуля (labelGeneratorRouter.ts, tRPC, /images/generations),
// здесь на входе реальное фото пользователя — тарифицируется так же
// (10 ₽/генерация, без бесплатного лимита), но через обычный Hono-роут,
// т.к. нужна загрузка файла. ───
app.post("/api/edit-label-photo", async (c) => {
  const userId = await getAuthedUserId(c.req.header("authorization"));
  if (!userId) {
    return c.json({ error: "Требуется авторизация" }, 401);
  }

  let charge: Awaited<ReturnType<typeof chargeImageRequest>> | undefined;
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const prompt = body["prompt"];
    const style = body["style"];
    const orientation = body["orientation"];
    const labelText = body["labelText"];
    const textPlacement = body["textPlacement"];
    if (!file || typeof file === "string") {
      return c.json({ error: "No file uploaded" }, 400);
    }
    if (typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Опишите, что нужно сделать с фото" }, 400);
    }
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "Ожидается изображение (JPG/PNG/WebP)" }, 400);
    }
    const maxSize = 10 * 1024 * 1024; // 10 МБ — с запасом для фото с телефона
    if (file.size > maxSize) {
      return c.json({ error: "Файл слишком большой (макс. 10 МБ)" }, 400);
    }

    // Списываем ДО обращения к ИИ — так же, как в labelGeneratorRouter.ts.
    charge = await chargeImageRequest(userId);

    const arrayBuffer = await file.arrayBuffer();
    let workingBuffer = Buffer.from(arrayBuffer);

    // Обрезаем под нужную ориентацию ДО сжатия — так итоговый файл меньше
    // и не тратим лишние токены на пиксели, которые всё равно обрежутся.
    if (orientation === "vertical" || orientation === "square" || orientation === "horizontal") {
      workingBuffer = await cropToOrientation(workingBuffer, orientation);
    }

    const { buffer: photoBuffer, filename: photoFilename, mimeType: photoMimeType } = await compressImageIfNeeded(
      workingBuffer,
      file.type
    );

    const finalPrompt = buildPhotoEditPrompt({
      description: prompt.trim(),
      style: typeof style === "string" ? style : undefined,
      labelText: typeof labelText === "string" ? labelText : undefined,
      textPlacement: textPlacement === "top" || textPlacement === "bottom" ? textPlacement : "middle",
    });

    const image = await editImage(finalPrompt, photoBuffer, photoFilename, photoMimeType);

    await logAiUsage({ userId, requestType: "label_photo_edit", tokensUsed: 0, charge });

    // Сохраняем в ту же таблицу, что и обычную генерацию — те же "последние 3"
    // видны в ЛК, независимо от того, каким способом этикетка была создана.
    // Название в галерее — текст этикетки, если он был указан (понятнее для
    // поиска глазами), иначе само описание. Описание при этом всегда
    // сохраняем отдельно и полностью — раньше при отсутствии labelText
    // оно частично дублировало title (тоже обрезаясь до 500 символов),
    // а при наличии labelText вообще нигде не было видно в ЛК.
    const db = getDb();
    const imageData = image.imageBase64 ?? image.imageUrl ?? "";
    const labelTitle = typeof labelText === "string" && labelText.trim() ? labelText.trim() : prompt.trim();
    await db.insert(generatedLabels).values({
      userId,
      title: labelTitle.slice(0, 500),
      description: prompt.trim(),
      imageBase64: imageData,
    });
    const existing = await db
      .select({ id: generatedLabels.id })
      .from(generatedLabels)
      .where(eq(generatedLabels.userId, userId))
      .orderBy(desc(generatedLabels.createdAt));
    for (const row of existing.slice(3)) {
      await db.delete(generatedLabels).where(eq(generatedLabels.id, row.id));
    }

    return c.json({ success: true, image });
  } catch (err) {
    console.error("Label photo edit error:", err);
    if (charge) {
      await refundAiRequest(userId, charge);
      await logAiFailure({ userId, requestType: "label_photo_edit" });
    }
    const message = err instanceof Error ? err.message : "Не удалось обработать фото";
    return c.json({ error: message }, 500);
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
  // manifest.json и sw.js раньше сюда не попадали и падали в SPA-заглушку ниже —
  // браузер получал HTML вместо JSON/JS. sw.js особенно важен: без него Chrome
  // на Android не предлагает "Установить как приложение" (см. комментарий в
  // самом public/sw.js) — ломалось молча, без явной ошибки в консоли.
  const staticExts: Record<string, string> = { ".json": "application/json", ".js": "application/javascript", ".txt": "text/plain" };
  if (imageExts.includes(ext) || ext in staticExts) {
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
        ...staticExts,
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
