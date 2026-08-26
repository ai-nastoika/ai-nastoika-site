import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recipes, recipeIngredients, recipeSteps } from "@db/schema";
import { eq } from "drizzle-orm";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { callChatCompletion } from "./lib/aiClient";
import { saveConversationTurn, getLatestConversation } from "./lib/aiConversations";
import { findSimilarRecipesByProfile, formatRecipesForPrompt } from "./lib/recipeRetrieval";

/* Тарификация: 5 бесплатных запросов на аккаунт (разово), дальше — 2 ₽ за
   запрос с баланса. Вся логика списания — в api/lib/aiAccess.ts, общая
   для recipeConsult и infusionConsult. */
const REQUEST_TYPE = "recipe_consultation";

function buildSystemPrompt(
  recipe: { title: string; categoryLabel: string | null; category: string; abv: string | null; time: string | null; difficulty: string | null; tastingDescription: string | null },
  ingredients: { name: string; amount: string | null; note: string | null }[],
  steps: { stepNum: number; title: string | null; text: string }[],
  similarRecipesBlock: string
): string {
  return `Ты — опытный бармен-настойщик, эксперт по домашним настойкам, наливкам и напиткам на их основе.
Ты консультируешь читателя сайта «Ай, настойка!» по КОНКРЕТНОМУ рецепту ниже — отвечай только на вопросы,
связанные с этим рецептом: замены ингредиентов, изменение крепости/сладости, время выдержки, замена базового
спирта (водка/самогон/спирт), пропорции, хранение и похожие практические вопросы.

Правила:
- Отвечай конкретно и по существу, 3-6 предложений, без длинных вступлений.
- Если предлагаешь замену ингредиента — объясни, как это повлияет на вкус/крепость/срок выдержки.
- Не выдумывай факты об этом конкретном рецепте, которых нет ниже — если не уверен, честно скажи, что это общая рекомендация, а не проверенный вариант именно этого рецепта.
- Если вопрос не имеет отношения к рецептам/настойкам — вежливо верни разговор к теме.${similarRecipesBlock ? `
- Ниже приведены другие рецепты САЙТА, похожие по вкусу/составу на текущий. Если вопрос пользователя касается
  замены ингредиента, добавки или похожего вкуса — используй их как конкретные, проверенные примеры вместо
  абстрактных советов ("некоторые добавляют...") — например, "в рецепте «Х» на сайте для похожего эффекта
  используют Y". Не притягивай их за уши, если реально не подходят к вопросу.` : ""}

РЕЦЕПТ: ${recipe.title}
Категория: ${recipe.categoryLabel ?? recipe.category}
Крепость: ${recipe.abv ?? "не указана"}
Время приготовления: ${recipe.time ?? "не указано"}
Сложность: ${recipe.difficulty ?? "не указана"}

Ингредиенты:
${ingredients.map((i) => `- ${i.name}${i.amount ? ` — ${i.amount}` : ""}${i.note ? ` (${i.note})` : ""}`).join("\n")}

Способ приготовления:
${steps.map((s) => `${s.stepNum}. ${s.title ? s.title + ": " : ""}${s.text}`).join("\n")}
${recipe.tastingDescription ? `\nОписание вкуса: ${recipe.tastingDescription}` : ""}${similarRecipesBlock ? `\n\nПОХОЖИЕ РЕЦЕПТЫ САЙТА (для справки, не пересказывай целиком, если не спросили):\n${similarRecipesBlock}` : ""}`;
}

export const recipeConsultRouter = createRouter({
  /* ── Текущий доступ: сколько бесплатных осталось и хватает ли баланса ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  /* ── Последний диалог по этому рецепту — чтобы продолжить при повторном открытии ── */
  getLastConversation: authedQuery
    .input(z.object({ recipeId: z.number() }))
    .query(async ({ input, ctx }) => {
      return getLatestConversation(ctx.user.id, REQUEST_TYPE, input.recipeId);
    }),

  /* ── Задать вопрос по рецепту ── */
  ask: authedQuery
    .input(
      z.object({
        recipeId: z.number(),
        question: z.string().min(1).max(1000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(20)
          .optional(),
        conversationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      // Бросает TRPCError('FORBIDDEN'), если ни бесплатных, ни денег не осталось.
      const charge = await chargeAiRequest(ctx.user.id);

      const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, input.recipeId) });
      if (!recipe) {
        await refundAiRequest(ctx.user.id, charge);
        throw new Error("Рецепт не найден");
      }

      const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, input.recipeId));
      const steps = await db.select().from(recipeSteps).where(eq(recipeSteps.recipeId, input.recipeId));

      // Ищем похожие рецепты САЙТА по вкусовому профилю + составу — чтобы
      // модель могла ссылаться на конкретные примеры вместо общих фраз.
      // Не блокируем ответ, если поиск почему-то упал — просто отвечаем без него.
      let similarRecipesBlock = "";
      try {
        const similar = await findSimilarRecipesByProfile(
          input.recipeId,
          {
            sweet: recipe.sweet ?? 0,
            sour: recipe.sour ?? 0,
            bitter: recipe.bitter ?? 0,
            spicy: recipe.spicy ?? 0,
            fruity: recipe.fruity ?? 0,
            herbal: recipe.herbal ?? 0,
          },
          ingredients.map((i) => i.name)
        );
        similarRecipesBlock = formatRecipesForPrompt(similar);
      } catch (err) {
        console.error("[recipeConsult] similar recipes lookup failed:", err);
      }

      const messages = [
        { role: "system" as const, content: buildSystemPrompt(recipe, ingredients, steps, similarRecipesBlock) },
        ...(input.history ?? []),
        { role: "user" as const, content: input.question },
      ];

      let answer: string;
      let tokensUsed = 0;
      let modelUsed = "";
      let usedFallback = false;
      try {
        const res = await callChatCompletion(messages, { temperature: 0.7, maxTokens: 2500 });
        answer = res.answer;
        tokensUsed = res.tokensUsed;
        modelUsed = res.modelUsed;
        usedFallback = res.usedFallback;
      } catch (err) {
        // Вызов не удался — возвращаем списанный бесплатный запрос/деньги пользователю.
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed, charge, modelUsed, usedFallback });

      const conversationId = await saveConversationTurn({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        contextId: input.recipeId,
        contextLabel: recipe.title,
        conversationId: input.conversationId,
        messages: [...(input.history ?? []), { role: "user", content: input.question }, { role: "assistant", content: answer }],
      });

      const access = await getAiAccessState(ctx.user.id);
      return { answer, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access, conversationId };
    }),
});
