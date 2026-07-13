import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recipes, recipeIngredients, recipeSteps, aiUsage } from "@db/schema";
import { eq, and, gte, count } from "drizzle-orm";

/* Дневной лимит бесплатных консультаций на одного залогиненного пользователя.
   Поменять — просто число ниже. */
const DAILY_LIMIT = 5;

const REQUEST_TYPE = "recipe_consultation";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildSystemPrompt(
  recipe: { title: string; categoryLabel: string | null; category: string; abv: string | null; time: string | null; difficulty: string | null; tastingDescription: string | null },
  ingredients: { name: string; amount: string | null; note: string | null }[],
  steps: { stepNum: number; title: string | null; text: string }[]
): string {
  return `Ты — опытный бармен-настойщик, эксперт по домашним настойкам, наливкам и напиткам на их основе.
Ты консультируешь читателя сайта «Ай, настойка!» по КОНКРЕТНОМУ рецепту ниже — отвечай только на вопросы,
связанные с этим рецептом: замены ингредиентов, изменение крепости/сладости, время выдержки, замена базового
спирта (водка/самогон/спирт), пропорции, хранение и похожие практические вопросы.

Правила:
- Отвечай конкретно и по существу, 3-6 предложений, без длинных вступлений.
- Если предлагаешь замену ингредиента — объясни, как это повлияет на вкус/крепость/срок выдержки.
- Не выдумывай факты об этом конкретном рецепте, которых нет ниже — если не уверен, честно скажи, что это общая рекомендация, а не проверенный вариант именно этого рецепта.
- Если вопрос не имеет отношения к рецептам/настойкам — вежливо верни разговор к теме.

РЕЦЕПТ: ${recipe.title}
Категория: ${recipe.categoryLabel ?? recipe.category}
Крепость: ${recipe.abv ?? "не указана"}
Время приготовления: ${recipe.time ?? "не указано"}
Сложность: ${recipe.difficulty ?? "не указана"}

Ингредиенты:
${ingredients.map((i) => `- ${i.name}${i.amount ? ` — ${i.amount}` : ""}${i.note ? ` (${i.note})` : ""}`).join("\n")}

Способ приготовления:
${steps.map((s) => `${s.stepNum}. ${s.title ? s.title + ": " : ""}${s.text}`).join("\n")}
${recipe.tastingDescription ? `\nОписание вкуса: ${recipe.tastingDescription}` : ""}`;
}

export const recipeConsultRouter = createRouter({
  /* ── Сколько консультаций осталось сегодня ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ value: count() })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, ctx.user.id), eq(aiUsage.requestType, REQUEST_TYPE), gte(aiUsage.createdAt, startOfToday())));
    const used = Number(rows[0]?.value ?? 0);
    return { used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) };
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const usedRows = await db
        .select({ value: count() })
        .from(aiUsage)
        .where(and(eq(aiUsage.userId, ctx.user.id), eq(aiUsage.requestType, REQUEST_TYPE), gte(aiUsage.createdAt, startOfToday())));
      const usedToday = Number(usedRows[0]?.value ?? 0);
      if (usedToday >= DAILY_LIMIT) {
        throw new Error(`Достигнут дневной лимит консультаций (${DAILY_LIMIT}). Попробуйте завтра.`);
      }

      const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, input.recipeId) });
      if (!recipe) throw new Error("Рецепт не найден");

      const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, input.recipeId));
      const steps = await db.select().from(recipeSteps).where(eq(recipeSteps.recipeId, input.recipeId));

      const apiKey = process.env.AI_API_KEY;
      const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
      const model = process.env.AI_MODEL || "gpt-4o-mini";

      if (!apiKey) {
        throw new Error("ИИ-консультация временно недоступна: не задан AI_API_KEY на сервере");
      }

      const messages = [
        { role: "system", content: buildSystemPrompt(recipe, ingredients, steps) },
        ...(input.history ?? []),
        { role: "user", content: input.question },
      ];

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 500 }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Ошибка ИИ-сервиса (${res.status}): ${errText.slice(0, 200)}`);
      }

      const json = await res.json();
      const answer: string = json.choices?.[0]?.message?.content ?? "Не удалось получить ответ от ИИ";
      const tokensUsed: number = json.usage?.total_tokens ?? 0;

      await db.insert(aiUsage).values({
        userId: ctx.user.id,
        requestType: REQUEST_TYPE,
        tokensUsed,
      });

      return { answer, remaining: Math.max(0, DAILY_LIMIT - usedToday - 1) };
    }),
});
