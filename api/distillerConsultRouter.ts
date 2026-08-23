import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { callChatCompletion, type ChatMessage } from "./lib/aiClient";
import { saveConversationTurn, getLatestConversation } from "./lib/aiConversations";

/* Тарификация общая с остальными ИИ-фичами сайта (см. api/lib/aiAccess.ts):
   5 бесплатных запросов на аккаунт, дальше — 2 ₽ за запрос с баланса.
   Три советника (брага/первый перегон/второй перегон) — общий пул лимита,
   но раздельная история диалогов (свой requestType на каждый этап), чтобы
   в ЛК и при восстановлении на странице они не путались друг с другом. */

const STAGES = ["mash", "first-run", "second-run"] as const;
type Stage = (typeof STAGES)[number];

function requestTypeFor(stage: Stage): string {
  return `distiller_${stage.replace("-", "_")}`; // distiller_mash / distiller_first_run / distiller_second_run
}

const COMMON_RULES = `
Правила:
- Отвечай конкретно и практично, разговорным языком, 4-8 предложений, без длинных вступлений.
- Каждый винокур собирает свой уникальный процесс — марка дрожжей, конкретная модель аппарата, самодельные
  насадки, режим очистки — единого стандарта нет. Не навязывай "единственно верный" способ, если пользователь
  описал свою специфику — работай с ней, а не переучивай на общий учебник.
- Если данных пользователя не хватает для точного ответа — сначала уточни главное (объём, крепость, тип сырья,
  модель аппарата), а не гадай молча.
- Не выдумывай точные цифры с ложной уверенностью — если это ориентир, а не гарантия, так и скажи.
- Не давай советов о безопасных дозировках употребления алкоголя или влиянии на здоровье — только про сам процесс.
- Обязательно напоминай о безопасности там, где это уместно: спиртовые пары огнеопасны, головы не для питья,
  не оставлять аппарат без присмотра.
- Если вопрос не про домашнюю перегонку вообще — вежливо верни разговор к теме.
- Поддерживай диалог: учитывай контекст предыдущих сообщений, не повторяй то, что уже сказал.`;

const SYSTEM_PROMPTS: Record<Stage, string> = {
  "mash": `Ты — опытный винокур-практик, эксперт по домашнему самогоноварению сайта «Ай, настойка!», раздел
«Винокур». Сейчас консультируешь ИМЕННО по этапу браги — ферментация, подготовка сырья, дрожжи, сроки готовности,
частые ошибки (скисание, пригар, недоброд). Учитывай, что типы браги (сахарная/зерновая/фруктовая) требуют
разного подхода — уточняй, если пользователь не сказал, с чем работает.${COMMON_RULES}`,

  "first-run": `Ты — опытный винокур-практик, эксперт по домашнему самогоноварению сайта «Ай, настойка!», раздел
«Винокур». Сейчас консультируешь ИМЕННО по первому перегону — перегонка браги в спирт-сырец: схема аппарата,
скорость отбора, когда останавливаться, как избежать пригара сырья, разбавление перед вторым перегоном.${COMMON_RULES}`,

  "second-run": `Ты — опытный винокур-практик, эксперт по домашнему самогоноварению сайта «Ай, настойка!», раздел
«Винокур». Сейчас консультируешь ИМЕННО по второму перегону — разделение на фракции: головы/тело/хвосты, сухопарник
и дефлегматор, на что ориентироваться при отборе головной фракции, контроль по запаху/крепости/температуре,
что делать с хвостами. НИКОГДА не поощряй пить головную фракцию и не преуменьшай риск метанола/сивушных масел
в ней — это единственное место, где стоит быть категоричным, а не мягким.${COMMON_RULES}`,
};

export const distillerConsultRouter = createRouter({
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  getLastConversation: authedQuery
    .input(z.object({ stage: z.enum(STAGES) }))
    .query(async ({ input, ctx }) => {
      return getLatestConversation(ctx.user.id, requestTypeFor(input.stage));
    }),

  generate: authedQuery
    .input(
      z.object({
        stage: z.enum(STAGES),
        message: z.string().min(1).max(1000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(20)
          .optional(),
        conversationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const requestType = requestTypeFor(input.stage);

      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      const charge = await chargeAiRequest(ctx.user.id);

      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPTS[input.stage] },
        ...(input.history ?? []),
        { role: "user", content: input.message },
      ];

      let answer: string;
      let tokensUsed: number;
      let modelUsed = "";
      let usedFallback = false;
      try {
        const res = await callChatCompletion(messages, { temperature: 0.7, maxTokens: 2500 });
        answer = res.answer;
        tokensUsed = res.tokensUsed;
        modelUsed = res.modelUsed;
        usedFallback = res.usedFallback;
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType, tokensUsed, charge, modelUsed, usedFallback });

      const conversationId = await saveConversationTurn({
        userId: ctx.user.id,
        requestType,
        conversationId: input.conversationId,
        messages: [...(input.history ?? []), { role: "user", content: input.message }, { role: "assistant", content: answer }],
      });

      const access = await getAiAccessState(ctx.user.id);
      return { answer, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access, conversationId };
    }),
});
