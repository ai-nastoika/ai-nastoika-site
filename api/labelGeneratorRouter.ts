import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeImageRequest, getImageAccessState, logAiUsage, logAiFailure, refundAiRequest } from "./lib/aiAccess";
import { generateImage } from "./lib/imageClient";
import { saveConversationTurn } from "./lib/aiConversations";

const REQUEST_TYPE = "label_image"; // 11 симв., укладывается в varchar(20)

const bottleAspect: Record<string, string> = {
  standard: "tall rectangular vertical format (standard 0.5L bottle proportions)",
  wine: "tall narrow rectangular vertical format (wine bottle proportions)",
  mini: "short compact rectangular vertical format (mini 0.25L bottle proportions)",
  gift: "elegant tall rectangular vertical format (gift bottle proportions)",
};

/* Промпт собирается из лёгких, не слишком детальных пожеланий к фону — нарочно
   без микро-инструкций (точные градиенты, пропорции узоров и т.п.): чем детальнее
   просьба, тем выше шанс, что ИИ что-то испортит при генерации.
   Текст, наоборот, задаётся явно и дословно — накладывать его отдельным CSS-слоем
   поверх картинки ненадёжно (сдвигается, не сочетается со шрифтом фона), поэтому
   вставляет его сама модель — gemini-3.1-flash-image-preview для этого достаточно точна. */
function buildLabelPrompt(input: {
  description: string;
  style?: string;
  colors?: string;
  elements?: string;
  bottleType: string;
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
  parts.push(bottleAspect[input.bottleType] ?? bottleAspect.standard);
  parts.push("aspect ratio 3:4 portrait orientation (width:height), image noticeably taller than wide but not extremely elongated");

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
        bottleType: z.enum(["standard", "wine", "mini", "gift"]).default("standard"),
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
        image = await generateImage(prompt);
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        await logAiFailure({ userId: ctx.user.id, requestType: REQUEST_TYPE });
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed: 0, charge });

      // В историю пишем текстовое резюме запроса, не саму картинку — base64-изображение
      // (сотни КБ) раздуло бы каждую выборку "последние 10 диалогов" в личном кабинете.
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
});
