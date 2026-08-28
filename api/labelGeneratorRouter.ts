import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeImageRequest, getImageAccessState, logAiUsage, logAiFailure, refundAiRequest } from "./lib/aiAccess";
import { generateImage } from "./lib/imageClient";
import { saveConversationTurn } from "./lib/aiConversations";
import { getDb } from "./queries/connection";
import { generatedLabels } from "@db/schema";
import { eq, desc } from "drizzle-orm";

const REQUEST_TYPE = "label_image"; // 11 симв., укладывается в varchar(20)

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

      let image: { imageBase64?: string; imageUrl?: string };
      try {
        image = await generateImage(prompt, ORIENTATIONS[input.orientation].apiSize);
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
      const imageData = image.imageBase64 ?? image.imageUrl ?? "";
      await db.insert(generatedLabels).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        imageBase64: imageData,
      });

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
      return { image, costKopecks: charge.costKopecks, access };
    }),

  /* Последние 3 сгенерированные этикетки — для личного кабинета */
  myLabels: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(generatedLabels)
      .where(eq(generatedLabels.userId, ctx.user.id))
      .orderBy(desc(generatedLabels.createdAt))
      .limit(3);
  }),
});
