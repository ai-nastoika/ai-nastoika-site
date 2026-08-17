import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { callChatCompletion, type ChatMessage } from "./lib/aiClient";

/* Тарификация общая с recipeConsult/infusionConsult (см. api/lib/aiAccess.ts):
   5 бесплатных запросов на аккаунт (разово, при регистрации), дальше — 2 ₽ за
   запрос с баланса. Неавторизованным недоступно вообще — проверяется на уровне
   authedQuery. requestType отдельный, чтобы в истории было видно источник запроса.
   ai_usage.request_type — varchar(20), значение ниже (16 симв.) укладывается. */
const REQUEST_TYPE = "taste_calculator";

const SYSTEM_PROMPT = `Ты — опытный и дружелюбный бармен-настойщик сайта «Ай, настойка!». Пользователь описывает
идею напитка (ингредиенты, которые есть под рукой, или просто желаемый вкус) — помоги ему живым, разговорным
языком, а не сухой карточкой характеристик.

Правила:
- Отвечай как человек в разговоре, а не как генератор карточек: без жёсткой структуры "вкус/нос/послевкусие"
  и без обязательного разбиения на пункты, если пользователь сам не просит списком.
- Дай мягкое, основанное на опыте предположение о том, что может получиться — вкус, цвет, аромат — с оговоркой,
  что это ориентир, а не гарантия (результат варьируется от партии к партии, от качества сырья и т.п.).
- Обязательно закончи конкретной практической рекомендацией: с чего начать, какие пропорции взять за основу,
  на что обратить внимание при настаивании, как понять, что напиток готов.
- Не выдумывай точные цифры (крепость, граммы) с ложной уверенностью — если это грубая прикидка, так и скажи.
- Не давай советов о безопасных дозировках употребления алкоголя или влиянии на здоровье — только про сам напиток.
- Пиши компактно: 4-7 предложений, без длинных вступлений.
- Поддерживай диалог: если пользователь уточняет или продолжает предыдущий вопрос — учитывай контекст переписки
  и не повторяй то, что уже сказал раньше.
- Если сообщение не про еду/напитки/ингредиенты — мягко верни разговор к теме настоек.`;

export const tasteCalculatorRouter = createRouter({
  /* ── Текущий доступ: сколько бесплатных осталось и хватает ли баланса ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  /* ── Задать вопрос/продолжить разговор ── */
  generate: authedQuery
    .input(
      z.object({
        message: z.string().min(1).max(500),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(20)
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      // Бросает TRPCError('FORBIDDEN'), если ни бесплатных, ни денег не осталось.
      const charge = await chargeAiRequest(ctx.user.id);

      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...(input.history ?? []),
        { role: "user", content: input.message },
      ];

      let answer: string;
      let tokensUsed: number;
      try {
        const res = await callChatCompletion(messages, { temperature: 0.8, maxTokens: 2500 });
        answer = res.answer;
        tokensUsed = res.tokensUsed;
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed, charge });

      const access = await getAiAccessState(ctx.user.id);
      return { answer, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access };
    }),
});
