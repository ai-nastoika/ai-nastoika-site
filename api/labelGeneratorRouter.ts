import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import {
  chargeImageRequest,
  chargeLabelRevision,
  getImageAccessState,
  logAiUsage,
  logAiFailure,
  refundAiRequest,
  LABEL_MAX_REVISIONS,
} from "./lib/aiAccess";
import { generateImage, editImage, ensureImageBase64 } from "./lib/imageClient";
import { compressImageIfNeeded } from "./lib/imageCompress";
import { saveConversationTurn } from "./lib/aiConversations";
import { getDb } from "./queries/connection";
import { generatedLabels } from "@db/schema";
import { and, eq, desc, gt, lt, isNotNull, sql, count } from "drizzle-orm";

const REQUEST_TYPE = "label_image"; // 11 симв., укладывается в varchar(20)
const REVISION_REQUEST_TYPE = "label_revision"; // 14 симв., укладывается в varchar(20)

/* Формат картинки определяем по первым байтам, а не по имени: в базе лежит чистый base64
   от модели (обычно PNG), а /images/edits требует честный Content-Type файла. */
function detectImageMime(buf: Buffer): string {
  if (buf.length > 3 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) return "image/png";
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

/* Промпт правки: свободный текст пользователя + жёсткая рамка «меняй только то, о чём просят».
   Без неё модель при редактировании любит перерисовывать всё подряд и портить надписи.
   Формулировка намеренно универсальна — она подходит и для плоской этикетки «с нуля»,
   и для картинки бутылки, сделанной по фото пользователя. */
function buildRevisionPrompt(instruction: string): string {
  return (
    "Edit this image according to the user's instruction below. " +
    "Keep everything else exactly as it is — the composition, proportions, colors, style and all existing text — " +
    "and change only what the instruction asks for. " +
    "Do not add any new text, logos or watermarks unless the instruction asks for it. " +
    "All text on the image must stay fully legible and spelled exactly as it is now, unless the instruction is to change it. " +
    `Instruction: ${instruction.trim()}`
  );
}

/* Три ориентации вместо типа бутылки — жёстко привязаны к реально поддерживаемым
   API размерам (см. lib/imageClient.ts), поэтому пропорция гарантированно
   совпадает с тем, что реально просим у модели, а не с угаданным промпт-текстом. */
export const ORIENTATIONS = {
  vertical: { apiSize: "1024x1536" as const, promptHint: "portrait orientation, taller than wide (3:4-like proportions)" },
  square: { apiSize: "1024x1024" as const, promptHint: "square format, equal width and height (1:1 proportions)" },
  horizontal: { apiSize: "1536x1024" as const, promptHint: "landscape orientation, wider than tall (4:3-like proportions)" },
};
type Orientation = keyof typeof ORIENTATIONS;

/* Промпт собирается из лёгких, не слишком детальных пожеланий к фону — нарочно
   без микро-инструкций (точные градиенты, пропорции узоров и т.п.): чем детальнее
   просьба, тем выше шанс, что ИИ что-то испортит при генерации.
   Текст, наоборот, задаётся явно и дословно — накладывать его отдельным CSS-слоем
   поверх картинки ненадёжно (сдвигается, не сочетается со шрифтом фона), поэтому
   вставляет его сама модель. */
function buildLabelPrompt(input: {
  description: string;
  style?: string;
  colors?: string;
  elements?: string;
  orientation: Orientation;
  title: string;
  subtitle?: string;
  abv?: string;
  date?: string;
}): string {
  const parts: string[] = [
    "Flat 2D printable bottle label artwork, top-down view of the label graphic itself",
    input.description.trim(),
  ];
  if (input.style?.trim()) parts.push(`${input.style.trim()} style`);
  if (input.colors?.trim()) parts.push(`color palette: ${input.colors.trim()}`);
  if (input.elements?.trim()) parts.push(`decorative elements: ${input.elements.trim()}`);
  parts.push(ORIENTATIONS[input.orientation].promptHint);

  parts.push(
    `render the exact text "${input.title.trim()}" as the main title, large and clearly legible, ` +
      "in elegant lettering that matches the overall design style"
  );
  if (input.subtitle?.trim()) {
    parts.push(`below the title render the exact text "${input.subtitle.trim()}" in smaller, clearly legible lettering`);
  }
  const smallDetails: string[] = [];
  if (input.abv?.trim()) smallDetails.push(`"${input.abv.trim()}"`);
  if (input.date?.trim()) smallDetails.push(`"${input.date.trim()}"`);
  if (smallDetails.length > 0) {
    parts.push(`include the exact text ${smallDetails.join(" and ")} as small legible detail text near the bottom`);
  }

  parts.push(
    "ensure sufficient contrast between text and background so every word is fully readable, " +
      "ornate decorative border, premium alcohol beverage label aesthetic, high resolution, clean design, " +
      "flat vector-like sticker artwork isolated on a plain neutral background — " +
      "absolutely NOT a photo of a bottle, NOT a glass bottle mockup, NOT a 3D render, no bottle shape, " +
      "no cork, no bottle neck or cap, no shadows implying a physical object, just the flat printable label graphic itself"
  );
  return parts.join(", ");
}

export const labelGeneratorRouter = createRouter({
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getImageAccessState(ctx.user.id);
  }),

  generate: authedQuery
    .input(
      z.object({
        description: z.string().min(3).max(500),
        style: z.string().max(100).optional(),
        colors: z.string().max(100).optional(),
        elements: z.string().max(200).optional(),
        orientation: z.enum(["vertical", "square", "horizontal"]).default("vertical"),
        title: z.string().min(1).max(80),
        subtitle: z.string().max(120).optional(),
        abv: z.string().max(20).optional(),
        date: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Фиксированная стоимость, без бесплатного лимита — списываем ДО обращения к ИИ.
      const charge = await chargeImageRequest(ctx.user.id);

      const prompt = buildLabelPrompt(input);

      let imageBase64: string;
      try {
        const image = await generateImage(prompt, ORIENTATIONS[input.orientation].apiSize);
        // Гарантируем base64 сразу — если модель вернула временную ссылку,
        // скачиваем её прямо сейчас. Иначе кнопка "Скачать" на фронтенде
        // (fetch + blob) может упасть из-за CORS/истёкшей ссылки, а через
        // время ссылка вообще перестанет открываться — тогда и в личном
        // кабинете, и на распечатке останется битая картинка навсегда.
        imageBase64 = await ensureImageBase64(image);
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE });
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed: 0, charge });

      // Храним саму картинку — не только текстовое резюме — чтобы в личном
      // кабинете можно было пересмотреть/перепечатать последние этикетки.
      // Описание сохраняем полностью, без обрезки (text, не varchar).
      const db = getDb();
      const imageData = imageBase64;
      const [inserted] = await db.insert(generatedLabels).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        imageBase64: imageData,
      });
      // id нужен фронтенду, чтобы потом отправить ИМЕННО эту этикетку на правки
      const labelId = Number(inserted.insertId);

      // Держим только 3 последние на пользователя — старые удаляем.
      const existing = await db
        .select({ id: generatedLabels.id })
        .from(generatedLabels)
        .where(eq(generatedLabels.userId, ctx.user.id))
        .orderBy(desc(generatedLabels.createdAt));
      const idsToDelete = existing.slice(3).map((r) => r.id);
      for (const id of idsToDelete) {
        await db.delete(generatedLabels).where(eq(generatedLabels.id, id));
      }

      // В историю диалогов пишем текстовое резюме запроса, не саму картинку —
      // ai_conversations рассчитан на текстовые диалоги, а не хранение изображений
      // (для этого теперь есть отдельная generatedLabels выше).
      const requestSummary = [
        `Название: ${input.title}`,
        input.subtitle ? `Подпись: ${input.subtitle}` : null,
        input.style ? `Стиль: ${input.style}` : null,
        input.colors ? `Цвета: ${input.colors}` : null,
        `Описание: ${input.description}`,
      ]
        .filter(Boolean)
        .join("\n");

      await saveConversationTurn({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        contextLabel: input.title,
        messages: [
          { role: "user", content: requestSummary },
          { role: "assistant", content: `Этикетка «${input.title}» сгенерирована и доступна для скачивания/печати на странице генератора.` },
        ],
      });

      const access = await getImageAccessState(ctx.user.id);
      return { image: { imageBase64 }, costKopecks: charge.costKopecks, access, labelId, revisionsLeft: LABEL_MAX_REVISIONS, hasPrevious: false };
    }),

  /* ── Доработка готовой этикетки свободным текстом ──
     Берём ПОСЛЕДНЮЮ версию картинки из нашей базы (не с клиента — ей нельзя доверять
     и незачем гонять мегабайты туда-обратно), отправляем в /images/edits вместе с
     инструкцией и заменяем сохранённую версию на новую. До LABEL_MAX_REVISIONS правок
     на этикетку, каждая — 5 ₽. Порядок важен (см. комментарии ниже): сначала
     резервируем номер правки, потом списываем деньги, потом обращаемся к ИИ —
     и при любом сбое откатываем и то, и другое. */
  revise: authedQuery
    .input(
      z.object({
        labelId: z.number().int().positive(),
        instruction: z.string().trim().min(3, "Напишите, что нужно изменить (хотя бы пару слов)").max(400, "Слишком длинно — не больше 400 символов"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const owned = and(eq(generatedLabels.id, input.labelId), eq(generatedLabels.userId, userId));

      const [label] = await db
        .select({ id: generatedLabels.id, imageBase64: generatedLabels.imageBase64 })
        .from(generatedLabels)
        .where(owned);
      if (!label) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Эту этикетку не удалось найти — возможно, она уже вытеснена более новыми (мы храним три последние).",
        });
      }

      // Подготавливаем исходную картинку ДО списания денег: если с ней что-то не так — человек ничего не теряет.
      // sourceBase64 — нормализованный текущий вариант (без data:-префикса, ссылки уже скачаны):
      // именно он после успешной правки станет «предыдущей версией».
      let sourceBuffer: Buffer;
      let sourceBase64: string;
      try {
        let raw = label.imageBase64;
        // Совсем старые записи могли хранить ссылку вместо base64 — забираем картинку себе.
        if (raw.startsWith("http")) raw = await ensureImageBase64({ imageUrl: raw });
        raw = raw.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, "");
        sourceBase64 = raw;
        sourceBuffer = Buffer.from(raw, "base64");
        if (sourceBuffer.length < 100) throw new Error("empty image");
      } catch (err) {
        console.error("[labelGenerator.revise] не удалось прочитать исходную картинку:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось открыть сохранённую этикетку для правки. Деньги не списаны — попробуйте создать этикетку заново.",
        });
      }

      // 1) Резервируем номер правки атомарным условным UPDATE — параллельные запросы не пройдут лимит.
      const [reserve] = await db
        .update(generatedLabels)
        .set({ revisions: sql`${generatedLabels.revisions} + 1` })
        .where(and(owned, lt(generatedLabels.revisions, LABEL_MAX_REVISIONS)));
      if (reserve.affectedRows === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Для этой этикетки все ${LABEL_MAX_REVISIONS} правки уже использованы. Скачайте её или создайте новую.`,
        });
      }
      const releaseSlot = () =>
        db
          .update(generatedLabels)
          .set({ revisions: sql`${generatedLabels.revisions} - 1` })
          .where(and(owned, gt(generatedLabels.revisions, 0)));

      // 2) Списываем 5 ₽ ДО обращения к ИИ (при нехватке средств — вернём номер правки).
      let charge: Awaited<ReturnType<typeof chargeLabelRevision>>;
      try {
        charge = await chargeLabelRevision(userId);
      } catch (err) {
        await releaseSlot();
        throw err;
      }

      // 3) Сама правка. Любой сбой → возврат денег и номера правки.
      let newImageBase64: string;
      try {
        const mime = detectImageMime(sourceBuffer);
        const prepared = await compressImageIfNeeded(sourceBuffer, mime);
        const ext = prepared.mimeType === "image/png" ? "png" : prepared.mimeType === "image/webp" ? "webp" : "jpg";
        const image = await editImage(buildRevisionPrompt(input.instruction), prepared.buffer, `label.${ext}`, prepared.mimeType);
        newImageBase64 = await ensureImageBase64(image);
      } catch (err) {
        await refundAiRequest(userId, charge);
        await releaseSlot();
        await logAiFailure({ userId, requestType: REVISION_REQUEST_TYPE });
        throw err;
      }

      await logAiUsage({ userId, requestType: REVISION_REQUEST_TYPE, tokensUsed: 0, charge });

      // Сохраняем новую версию как текущую, а прежнюю — как «предыдущую» (её можно бесплатно вернуть,
      // см. undoRevision). Что именно просили — дописываем в описание, чтобы в личном кабинете
      // было видно историю правок этой этикетки.
      const [after] = await db.select({ revisions: generatedLabels.revisions }).from(generatedLabels).where(owned);
      const revisionNo = after?.revisions ?? 1;
      await db
        .update(generatedLabels)
        .set({
          imageBase64: newImageBase64,
          prevImageBase64: sourceBase64,
          description: sql`CONCAT(COALESCE(${generatedLabels.description}, ''), ${`\nПравка ${revisionNo}: ${input.instruction}`})`,
        })
        .where(owned);

      const access = await getImageAccessState(userId);
      return {
        image: { imageBase64: newImageBase64 },
        revisionsLeft: Math.max(0, LABEL_MAX_REVISIONS - revisionNo),
        hasPrevious: true,
        costKopecks: charge.costKopecks,
        access,
      };
    }),

  /* ── Вернуть предыдущую версию — бесплатно ──
     Меняет местами текущую и предыдущую версии (а не стирает новую): если человек нажал
     по ошибке или передумал, повторное нажатие возвращает всё как было — оплаченная правка
     не пропадает. Счётчик правок НЕ откатывается: работа модели уже выполнена и оплачена. */
  undoRevision: authedQuery
    .input(z.object({ labelId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const owned = and(eq(generatedLabels.id, input.labelId), eq(generatedLabels.userId, ctx.user.id));

      const [label] = await db
        .select({ imageBase64: generatedLabels.imageBase64, prevImageBase64: generatedLabels.prevImageBase64 })
        .from(generatedLabels)
        .where(owned);
      if (!label) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Эту этикетку не удалось найти — возможно, она уже вытеснена более новыми." });
      }
      if (!label.prevImageBase64) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "У этой этикетки нет предыдущей версии — правок ещё не было." });
      }

      // Обмен значениями делаем в коде, а не одним UPDATE вида SET a = b, b = a: в MySQL присваивания
      // выполняются слева направо и вторая колонка получила бы уже новое значение первой — обе версии
      // стали бы одинаковыми, и одна из них пропала бы. Условие IS NOT NULL страхует от гонки.
      await db
        .update(generatedLabels)
        .set({ imageBase64: label.prevImageBase64, prevImageBase64: label.imageBase64 })
        .where(and(owned, isNotNull(generatedLabels.prevImageBase64)));

      return { image: { imageBase64: label.prevImageBase64 }, hasPrevious: true };
    }),

  /* Сколько этикеток сохранено — для цифры на вкладке личного кабинета. Раньше ради
     неё кабинет при каждом открытии скачивал все три этикетки целиком (мегабайты
     картинок в base64), даже если вкладку «Этикетки» не открывали. */
  myLabelsCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [row] = await db.select({ value: count() }).from(generatedLabels).where(eq(generatedLabels.userId, ctx.user.id));
    return Math.min(3, Number(row?.value ?? 0));
  }),

  /* Последние 3 сгенерированные этикетки — для личного кабинета и для «Доработать».
     Колонки перечислены явно: предыдущая версия (мегабайты base64) клиенту не нужна —
     отдаём только флаг hasPrevious и сколько правок уже потрачено. */
  myLabels: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: generatedLabels.id,
        userId: generatedLabels.userId,
        title: generatedLabels.title,
        description: generatedLabels.description,
        imageBase64: generatedLabels.imageBase64,
        revisions: generatedLabels.revisions,
        hasPrevious: sql<number>`(${generatedLabels.prevImageBase64} IS NOT NULL)`.mapWith(Boolean),
        createdAt: generatedLabels.createdAt,
      })
      .from(generatedLabels)
      .where(eq(generatedLabels.userId, ctx.user.id))
      .orderBy(desc(generatedLabels.createdAt))
      .limit(3);
  }),
});
