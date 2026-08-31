import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { callChatCompletion, type ChatMessage } from "./lib/aiClient";
import { saveConversationTurn } from "./lib/aiConversations";
import { findSimilarRecipesByText, formatRecipesForPrompt } from "./lib/recipeRetrieval";

/* Калькулятор вкуса — версия с кнопками (основа/ингредиенты/добавки вместо
   свободного текста). Старый свободнотекстовый сервис не удалён, а переехал
   на вкладку «Прогноз настойки» (см. api/tasteCalculatorRouter.ts, requestType
   "taste_calculator") — из этого калькулятора на него ведёт подсказка-ссылка,
   если пользователю не хватило кнопок. Тарификация общая с остальными ИИ-фичами
   аккаунта (см. api/lib/aiAccess.ts) — свой requestType здесь только чтобы в
   истории ЛК и статистике был виден источник запроса.
   ai_usage.request_type — varchar(20), "taste_builder" (13 симв.) укладывается.

   В отличие от tasteCalculatorRouter — здесь нет продолжения диалога: один
   набор кнопок = один ответ. Пользователь меняет формулу и жмёт кнопку заново,
   а не пишет уточняющее сообщение. Поэтому нет getLastConversation/history —
   каждый запрос сохраняется как отдельная запись в aiConversations (для ЛК),
   но без conversationId и возможности "Возобновить" (см. typeLabels и
   исключение из кнопки "Возобновить" в ProfilePage.tsx). */
const REQUEST_TYPE = "taste_builder";

const SYSTEM_PROMPT = `Ты — опытный и дружелюбный бармен-настойщик сайта «Ай, настойка!». Пользователь собрал
набор для будущей настойки через калькулятор с кнопками (основа, ингредиенты, добавки) — тебе он приходит уже
готовым списком, а не как вопрос от живого человека.

Правила:
- Отвечай сразу по существу, живым разговорным языком: что вероятно получится — вкус, цвет, аромат — с
  оговоркой, что это ориентир, а не гарантия (результат меняется от партии к партии, качества сырья и т.п.).
- Не начинай с пересказа набора ("вы выбрали..." и т.п.) — сразу переходи к сути, как будто уже пробовал
  что-то похожее и делишься впечатлением.
- Обязательно закончи конкретной практической рекомендацией: с каких пропорций начать, на что обратить
  внимание при настаивании, как понять, что напиток готов.
- Не выдумывай точные цифры (крепость, граммы) с ложной уверенностью — если это грубая прикидка, так и скажи.
- Не давай советов о безопасных дозировках употребления алкоголя или влиянии на здоровье — только про сам
  напиток.
- Пиши компактно: 4-7 предложений, без длинных вступлений.
- Если набор получился необычным или спорным по сочетанию — можно мягко это отметить, но никогда не
  отказывайся отвечать и не проси пользователя "уточнить получше" — набор уже финальный, работай с тем, что есть.`;

function buildSystemPrompt(similarRecipesBlock: string): string {
  const base = `${SYSTEM_PROMPT}
- ГЛАВНОЕ: отвечай ВСЕГДА, используя свои общие знания бармена-настойщика. Рецепты сайта ниже (если есть) —
  это дополнение, а не единственный источник. Если среди них нет ничего подходящего — это нормально, просто
  дай полноценный совет по своим знаниям.`;
  if (!similarRecipesBlock) return base;
  return `${base}
- Ниже есть реальные рецепты САЙТА, похожие на собранный набор. Если они реально в тему — упомяни коротко
  В НАЧАЛЕ ответа (1-2 предложения: "на сайте есть рецепт «Х», в нём для похожего вкуса..."), а СРАЗУ ПОСЛЕ
  дай свой полноценный совет по общим знаниям, не ограничиваясь только этими примерами. Если ни один реально
  не подходит — не упоминай их вообще.

ПОХОЖИЕ РЕЦЕПТЫ САЙТА:
${similarRecipesBlock}`;
}

function buildFormulaText(input: { base: string; strength: number; ingredients: string[]; additives: string[] }): string {
  const lines = [`Основа: ${input.base}, ${input.strength}%.`, `Ингредиенты: ${input.ingredients.join(", ")}.`];
  if (input.additives.length > 0) lines.push(`Добавки: ${input.additives.join(", ")}.`);
  return lines.join("\n");
}

export const tasteBuilderRouter = createRouter({
  /* ── Текущий доступ: сколько бесплатных осталось и хватает ли баланса ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  /* ── Собрать набор кнопками → получить один ответ ИИ ── */
  generate: authedQuery
    .input(
      z.object({
        base: z.string().min(1).max(40),
        strength: z.number().min(10).max(96),
        ingredients: z.array(z.string().min(1).max(40)).min(1).max(5),
        additives: z.array(z.string().min(1).max(40)).max(3).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      const charge = await chargeAiRequest(ctx.user.id);

      const formulaText = buildFormulaText(input);

      // Похожие рецепты САЙТА по составу — та же логика, что и в свободнотекстовом
      // калькуляторе: структурированный текст из названий ингредиентов подходит
      // под словарный поиск даже лучше, чем разговорная фраза.
      let similarRecipesBlock = "";
      let similarForLinks: { id: number; slug: string; title: string }[] = [];
      try {
        const similar = await findSimilarRecipesByText(formulaText);
        similarRecipesBlock = formatRecipesForPrompt(similar);
        similarForLinks = similar.map((r) => ({ id: r.id, slug: r.slug, title: r.title }));
      } catch (err) {
        console.error("[tasteBuilder] similar recipes lookup failed:", err);
      }

      const messages: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt(similarRecipesBlock) },
        { role: "user", content: formulaText },
      ];

      let answer: string;
      let tokensUsed: number;
      let modelUsed = "";
      let usedFallback = false;
      try {
        const res = await callChatCompletion(messages, { temperature: 0.8, maxTokens: 2500 });
        answer = res.answer;
        tokensUsed = res.tokensUsed;
        modelUsed = res.modelUsed;
        usedFallback = res.usedFallback;
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed, charge, modelUsed, usedFallback });

      // Один запрос = одна запись в истории ЛК (без conversationId — каждый
      // расчёт самостоятелен, продолжать в чате здесь нечего).
      await saveConversationTurn({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        messages: [
          { role: "user", content: formulaText },
          { role: "assistant", content: answer },
        ],
      });

      const access = await getAiAccessState(ctx.user.id);
      return { answer, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access, similarRecipes: similarForLinks };
    }),
});
