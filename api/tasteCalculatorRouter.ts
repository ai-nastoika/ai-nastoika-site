import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";

/* Тарификация общая с recipeConsult/infusionConsult (см. api/lib/aiAccess.ts):
   5 бесплатных запросов на аккаунт (разово, при регистрации), дальше — 2 ₽ за
   запрос с баланса. Неавторизованным недоступно вообще — проверяется на уровне
   authedQuery. requestType отдельный, чтобы в истории было видно источник запроса.
   ai_usage.request_type — varchar(20), значение ниже (16 симв.) укладывается. */
const REQUEST_TYPE = "taste_calculator";

const SYSTEM_PROMPT = `Ты — опытный бармен-настойщик сайта «Ай, настойка!». Пользователь описывает идею
напитка (ингредиенты или просто желаемый вкус) — предложи ему ориентировочный рецепт домашней настойки.

Правила:
- Отвечай ТОЛЬКО валидным JSON, без markdown и пояснений вокруг, строго такой структуры:
  {"recipe": "...", "taste": "...", "color": "..."}
- "recipe": один компактный абзац — база (водка/самогон/спирт), количество основного ингредиента,
  сахар/мёд при необходимости, ориентировочный срок настаивания. Указывай конкретные пропорции на 1 литр.
- "taste": описание вкусового профиля — сладость/кислинка/горчинка, аромат, послевкусие. 1-2 предложения.
- "color": ожидаемый цвет и прозрачность напитка. Одно предложение.
- Это ориентировочная идея, а не проверенный рецепт — не выдумывай неправдоподобные пропорции
  (крепость итогового напитка должна получаться реалистичной, обычно 18-40%).
- Не давай советов о дозировках употребления алкоголя или влиянии на здоровье — только про сам напиток.
- Если сообщение пользователя не про еду/напитки/ингредиенты — всё равно верни JSON той же структуры,
  мягко предложив в поле "recipe" начать с описания ингредиентов или вкуса, который хочется получить.`;

type TasteResult = { recipe: string; taste: string; color: string };

async function callDeepSeek(userText: string): Promise<{ result: TasteResult; tokensUsed: number }> {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("Калькулятор вкуса временно недоступен: не задан AI_API_KEY на сервере");
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ошибка ИИ-сервиса (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";

  let parsed: Partial<TasteResult>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ИИ вернул ответ в неожиданном формате, попробуйте переформулировать запрос");
  }

  if (!parsed.recipe || !parsed.taste || !parsed.color) {
    throw new Error("ИИ вернул неполный ответ, попробуйте ещё раз");
  }

  return {
    result: { recipe: parsed.recipe, taste: parsed.taste, color: parsed.color },
    tokensUsed: json.usage?.total_tokens ?? 0,
  };
}

export const tasteCalculatorRouter = createRouter({
  /* ── Текущий доступ: сколько бесплатных осталось и хватает ли баланса ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  /* ── Сгенерировать идею рецепта по описанию/ингредиентам ── */
  generate: authedQuery
    .input(z.object({ description: z.string().min(3).max(500) }))
    .mutation(async ({ input, ctx }) => {
      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      // Бросает TRPCError('FORBIDDEN'), если ни бесплатных, ни денег не осталось.
      const charge = await chargeAiRequest(ctx.user.id);

      let result: TasteResult;
      let tokensUsed = 0;
      try {
        const res = await callDeepSeek(input.description);
        result = res.result;
        tokensUsed = res.tokensUsed;
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed, charge });

      const access = await getAiAccessState(ctx.user.id);
      return { answer: result, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access };
    }),
});
