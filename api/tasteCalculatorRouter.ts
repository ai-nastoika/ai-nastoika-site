import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";
import { callChatCompletion, type ChatMessage } from "./lib/aiClient";
import { saveConversationTurn, getLatestConversation } from "./lib/aiConversations";
import { findSimilarRecipesByText, formatRecipesForPrompt } from "./lib/recipeRetrieval";

/* Свободнотекстовый калькулятор вкуса — на сайте называется «Прогноз настойки»
   (вкладка /tools?tool=forecast). requestType в БД оставили старым,
   "taste_calculator", чтобы не терять историю ЛК уже существующих
   пользователей — хотя на сайте сервис теперь называется иначе. Основной
   кнопочный калькулятор ("Калькулятор вкуса") — отдельный сервис,
   см. api/tasteBuilderRouter.ts.

   Тарификация общая с recipeConsult/infusionConsult (см. api/lib/aiAccess.ts):
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

function buildSystemPrompt(similarRecipesBlock: string): string {
  const base = `${SYSTEM_PROMPT}
- ГЛАВНОЕ: отвечай ВСЕГДА, используя свои общие знания бармена-настойщика. Рецепты сайта ниже (если есть) —
  это дополнение, а не единственный источник. Если среди них нет ничего подходящего — это нормально, просто
  дай полноценный совет по своим знаниям. Никогда не отказывайся отвечать и не пиши, что "нечем заменить" или
  "в базе нет похожего", только потому что не нашлось точного совпадения среди рецептов сайта.`;
  if (!similarRecipesBlock) return base;
  return `${base}
- Ниже есть реальные рецепты САЙТА, похожие на то, что описывает пользователь. Если они реально в тему — упомяни
  коротко В НАЧАЛЕ ответа (1-2 предложения: "на сайте есть рецепт «Х», в нём для похожего вкуса..."), а СРАЗУ
  ПОСЛЕ дай свой полноценный совет по общим знаниям, не ограничиваясь только этими примерами. Если ни один
  реально не подходит — не упоминай их вообще.

ПОХОЖИЕ РЕЦЕПТЫ САЙТА:
${similarRecipesBlock}`;
}

export const tasteCalculatorRouter = createRouter({
  /* ── Текущий доступ: сколько бесплатных осталось и хватает ли баланса ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  /* ── Последний незавершённый диалог — чтобы продолжить при повторном открытии ── */
  getLastConversation: authedQuery.query(async ({ ctx }) => {
    return getLatestConversation(ctx.user.id, REQUEST_TYPE);
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
        conversationId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      // Бросает TRPCError('FORBIDDEN'), если ни бесплатных, ни денег не осталось.
      const charge = await chargeAiRequest(ctx.user.id);

      // Ищем похожие рецепты САЙТА по тексту сообщения — чтобы прогноз вкуса
      // опирался на реальные примеры, а не был абстрактной догадкой "в вакууме".
      // Не блокируем ответ, если поиск почему-то упал — просто отвечаем без него.
      let similarRecipesBlock = "";
      let similarForLinks: { id: number; slug: string; title: string }[] = [];
      try {
        const similar = await findSimilarRecipesByText(input.message);
        similarRecipesBlock = formatRecipesForPrompt(similar);
        similarForLinks = similar.map((r) => ({ id: r.id, slug: r.slug, title: r.title }));
      } catch (err) {
        console.error("[tasteCalculator] similar recipes lookup failed:", err);
      }

      const messages: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt(similarRecipesBlock) },
        ...(input.history ?? []),
        { role: "user", content: input.message },
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

      // Сохраняем диалог целиком (без системного промпта) — на 10 последних диалогов
      // в личном кабинете и на восстановление при повторном открытии страницы.
      const conversationId = await saveConversationTurn({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        conversationId: input.conversationId,
        messages: [...(input.history ?? []), { role: "user", content: input.message }, { role: "assistant", content: answer }],
      });

      const access = await getAiAccessState(ctx.user.id);
      return { answer, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access, conversationId, similarRecipes: similarForLinks };
    }),
});
