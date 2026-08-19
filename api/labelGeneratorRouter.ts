import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeImageRequest, getImageAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { generateImage } from "./lib/imageClient";

const REQUEST_TYPE = "label_image"; // 11 симв., укладывается в varchar(20)

const bottleAspect: Record<string, string> = {
  standard: "tall rectangular vertical format (standard 0.5L bottle proportions)",
  wine: "tall narrow rectangular vertical format (wine bottle proportions)",
  mini: "short compact rectangular vertical format (mini 0.25L bottle proportions)",
  gift: "elegant tall rectangular vertical format (gift bottle proportions)",
};

/* Промпт собирается из лёгких, не слишком детальных пожеланий — нарочно без
   микро-инструкций (точные градиенты, точные пропорции узоров и т.п.):
   чем детальнее просьба, тем выше шанс, что ИИ что-то испортит при генерации. */
function buildLabelPrompt(input: {
  description: string;
  style?: string;
  colors?: string;
  elements?: string;
  bottleType: string;
}): string {
  const parts: string[] = ["Blank bottle label template", input.description.trim()];
  if (input.style?.trim()) parts.push(`${input.style.trim()} style`);
  if (input.colors?.trim()) parts.push(`color palette: ${input.colors.trim()}`);
  if (input.elements?.trim()) parts.push(`decorative elements: ${input.elements.trim()}`);
  parts.push(bottleAspect[input.bottleType] ?? bottleAspect.standard);
  parts.push(
    "empty clear area in the center-lower portion reserved for text overlay (do not render any text or letters), ornate decorative border, premium alcohol beverage label aesthetic, high resolution, clean design"
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
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed: 0, charge });

      const access = await getImageAccessState(ctx.user.id);
      return { image, costKopecks: charge.costKopecks, access };
    }),
});
