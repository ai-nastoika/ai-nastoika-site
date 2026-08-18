import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { callChatCompletion } from "./lib/aiClient";
import { saveConversationTurn } from "./lib/aiConversations";

/* Тарификация общая с остальными ИИ-фичами (см. api/lib/aiAccess.ts):
   5 бесплатных запросов на аккаунт, дальше — 2 ₽ за запрос с баланса.
   ai_usage.request_type — varchar(20), значение ниже (15 симв.) укладывается. */
const REQUEST_TYPE = "abv_ai_estimate";

const strainingLabels: Record<string, string> = {
  none: "не отжимал(а) и не процеживал(а), просто слил(а) жидкость",
  light: "слегка процедил(а) через марлю/сито, без отжима мякоти",
  full: "отжал(а) мякоть/ягоды полностью, весь сок добавлен обратно",
};

const SYSTEM_PROMPT = `Ты — опытный технолог и дегустатор домашних настоек сайта «Ай, настойка!». Пользователю уже
посчитали точную крепость БАЗЫ (спирт + вода + сахар, без учёта ароматических ингредиентов) по формуле разбавления.
Твоя задача — оценить, какой может получиться ИТОГОВАЯ крепость готового напитка с учётом добавленных ингредиентов,
срока настаивания и способа отжима/процеживания.

Как рассуждать:
- Свежие сочные ягоды/фрукты обычно отдают больше собственной жидкости в напиток, чем замороженные после разморозки
  (хотя заморозка разрушает клеточные стенки и иногда усиливает отдачу сока — учитывай оба эффекта).
- Чем больше масса добавленных ингредиентов относительно объёма базы — тем сильнее разбавление их собственным соком.
- Если пользователь отжимал/выжимал мякоть после настаивания — весь этот сок ушёл в напиток, разбавление сильнее.
  Если просто слил жидкость без отжима — часть сока осталась в мякоти, разбавление слабее.
- Более долгий срок настаивания обычно означает более полную экстракцию сока из ингредиентов (до определённого предела).
- Сухие пряности (ваниль, корица, гвоздика и т.п.) почти не меняют объём/крепость — в отличие от сочных ягод/фруктов.

Правила ответа:
- Отвечай ТОЛЬКО валидным JSON, без markdown вокруг, строго такой структуры:
  {"estimatedAbv": "38-40%", "explanation": "..."}
- "estimatedAbv": короткая строка с оценкой, диапазон предпочтительнее точного числа (например "36-39%"), либо
  одно число, если уверенность высокая. Обязательно с символом %.
- "explanation": 3-5 предложений разговорным языком — какие факторы из описания сыграли в какую сторону и почему.
  Обязательно явно скажи, что это оценка, а не точное измерение. НЕ советуй спиртометр/ареометр как способ проверить
  готовый напиток — эти приборы измеряют плотность и требуют прозрачной жидкости без примесей, а сахар и экстрактивные
  вещества из ягод/фруктов искажают их показания на готовом настое (в отличие от чистой базы, которая уже точно
  посчитана по формуле выше). Именно поэтому и нужна такая оценка, а не физический прибор.
- Не давай советов о безопасных дозах употребления алкоголя — только про сам напиток.
- Не выходи за рамки правдоподобного диапазона (итоговая крепость не может быть выше крепости базы,
  и обычно не ниже её процентов на 25-30 при разумных пропорциях ингредиентов).`;

export const abvEstimatorRouter = createRouter({
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  estimate: authedQuery
    .input(
      z.object({
        baseAbv: z.number(),
        baseVolumeMl: z.number(),
        ingredients: z.string().min(3).max(1000),
        infusionDays: z.number(),
        straining: z.enum(["none", "light", "full"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      const charge = await chargeAiRequest(ctx.user.id);

      const userMessage = `База: ${input.baseVolumeMl} мл, крепость базы ${input.baseAbv}% (уже посчитана точно по формуле).
Ингредиенты для настаивания: ${input.ingredients}
Срок настаивания: ${input.infusionDays} дней
Способ отжима/процеживания: ${strainingLabels[input.straining]}

Оцени итоговую крепость готового напитка.`;

      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        { role: "user" as const, content: userMessage },
      ];

      let estimatedAbv: string;
      let explanation: string;
      let tokensUsed = 0;
      let modelUsed = "";
      let usedFallback = false;
      try {
        const res = await callChatCompletion(messages, { temperature: 0.5, maxTokens: 2500, jsonMode: true });
        tokensUsed = res.tokensUsed;
        modelUsed = res.modelUsed;
        usedFallback = res.usedFallback;

        let parsed: { estimatedAbv?: string; explanation?: string };
        try {
          parsed = JSON.parse(res.answer);
        } catch {
          throw new Error("ИИ вернул ответ в неожиданном формате, попробуйте ещё раз");
        }
        if (!parsed.estimatedAbv || !parsed.explanation) {
          throw new Error("ИИ вернул неполный ответ, попробуйте ещё раз");
        }
        estimatedAbv = parsed.estimatedAbv;
        explanation = parsed.explanation;
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed, charge, modelUsed, usedFallback });

      // Сохраняем и в историю диалогов — как один обмен репликами, для вкладки
      // "История диалогов с ИИ" в личном кабинете.
      await saveConversationTurn({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        contextLabel: `База ${input.baseAbv}%, ${input.ingredients.slice(0, 60)}`,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: `${estimatedAbv}\n\n${explanation}` },
        ],
      });

      const access = await getAiAccessState(ctx.user.id);
      return { estimatedAbv, explanation, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access };
    }),
});
