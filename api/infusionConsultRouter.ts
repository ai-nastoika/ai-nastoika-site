import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { infusions, infusionStages } from "@db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { chargeAiRequest, getAiAccessState, logAiUsage, refundAiRequest } from "./lib/aiAccess";

/* Тарификация общая с recipeConsult (см. api/lib/aiAccess.ts): 5 бесплатных
   запросов на аккаунт, дальше — 2 ₽ за запрос с баланса. requestType отдельный,
   чтобы в истории/статистике было видно, откуда пришёл запрос. */
const REQUEST_TYPE = "infusion_consultation";

const stageLabels: Record<string, string> = {
  pour: "Поставить",
  shake: "Взболтать",
  strain: "Слить/процедить",
  rest: "Дать отстояться",
  taste: "Дегустация",
  custom: "Действие",
};

function buildSystemPrompt(
  infusion: { name: string; description: string | null; vesselDescription: string | null; startDate: Date; notes: string | null },
  stages: { type: string; title: string; plannedDate: Date; status: string; note: string | null }[]
): string {
  const now = new Date();
  const dayNow = Math.max(1, Math.round((now.getTime() - infusion.startDate.getTime()) / 86400000) + 1);

  const stagesText = stages
    .map((s) => {
      const dateStr = s.plannedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      const statusLabel = s.status === "done" ? "выполнено" : s.status === "skipped" ? "пропущено" : "ещё не выполнено";
      return `- ${dateStr}: ${stageLabels[s.type] ?? s.type} — ${s.title} (${statusLabel})${s.note ? `, заметка пользователя: «${s.note}»` : ""}`;
    })
    .join("\n");

  return `Ты — опытный бармен-настойщик, эксперт по домашним настойкам и наливкам.
Ты консультируешь пользователя сайта «Ай, настойка!» по КОНКРЕТНОЙ настойке, которую он сейчас готовит —
отвечай, опираясь на данные её трекера ниже: на каком она дне, какие этапы уже пройдены, что написано в заметках.

Правила (обязательны, без исключений):
- Отвечай конкретно и по делу, 3-6 предложений, без длинных вступлений.
- Если предлагаешь замену ингредиента или корректировку — объясни, как это повлияет на вкус/крепость/срок выдержки.
- Не выдумывай детали об этой настойке, которых нет в данных ниже.
- НИКОГДА не ставь диагноз "испортилось / не испортилось", "можно пить / нельзя пить" по описанию пользователя
  (запах, цвет, пена, плесень и т.п.). Ты не можешь этого видеть и не должен создавать ложную уверенность.
  Вместо этого опиши на что обычно стоит обратить внимание и порекомендуй не рисковать при сомнениях —
  окончательное решение пользователь должен принять сам, вживую оценив запах/вкус/вид.
- Не давай советов о дозировках употребления алкоголя или его влиянии на здоровье — только про процесс приготовления.
- Если вопрос не связан с этой настойкой или домашним виноделием вообще — вежливо верни разговор к теме.

НАСТОЙКА: ${infusion.name}
${infusion.description ? `Рецепт: ${infusion.description}` : ""}
Тара: ${infusion.vesselDescription ?? "не указана"}
Сейчас день ${dayNow} с начала настаивания (поставлена ${infusion.startDate.toLocaleDateString("ru-RU")})
${infusion.notes ? `Заметки пользователя: ${infusion.notes}` : ""}

Этапы:
${stagesText || "(этапы ещё не заданы)"}`;
}

export const infusionConsultRouter = createRouter({
  /* ── Текущий доступ: сколько бесплатных осталось и хватает ли баланса ── */
  checkLimit: authedQuery.query(async ({ ctx }) => {
    return getAiAccessState(ctx.user.id);
  }),

  /* ── Задать вопрос по конкретному трекеру ── */
  ask: authedQuery
    .input(
      z.object({
        infusionId: z.number(),
        question: z.string().min(1).max(1000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(20)
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Списываем бесплатный запрос или 2 ₽ с баланса ДО обращения к ИИ.
      // Бросает TRPCError('FORBIDDEN'), если ни бесплатных, ни денег не осталось.
      const charge = await chargeAiRequest(ctx.user.id);

      const infusion = await db.query.infusions.findFirst({ where: eq(infusions.id, input.infusionId) });
      if (!infusion || infusion.userId !== ctx.user.id) {
        await refundAiRequest(ctx.user.id, charge);
        throw new TRPCError({ code: "NOT_FOUND", message: "Трекер не найден" });
      }

      const stages = await db.select().from(infusionStages).where(eq(infusionStages.infusionId, input.infusionId));

      const apiKey = process.env.AI_API_KEY;
      const apiUrl = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
      const model = process.env.AI_MODEL || "gpt-4o-mini";

      if (!apiKey) {
        await refundAiRequest(ctx.user.id, charge);
        throw new Error("ИИ-консультация временно недоступна: не задан AI_API_KEY на сервере");
      }

      const messages = [
        { role: "system", content: buildSystemPrompt(infusion, stages) },
        ...(input.history ?? []),
        { role: "user", content: input.question },
      ];

      let answer: string;
      let tokensUsed = 0;
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 500 }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Ошибка ИИ-сервиса (${res.status}): ${errText.slice(0, 200)}`);
        }

        const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
        answer = json.choices?.[0]?.message?.content ?? "Не удалось получить ответ от ИИ";
        tokensUsed = json.usage?.total_tokens ?? 0;
      } catch (err) {
        await refundAiRequest(ctx.user.id, charge);
        throw err;
      }

      await logAiUsage({ userId: ctx.user.id, requestType: REQUEST_TYPE, tokensUsed, charge });

      const access = await getAiAccessState(ctx.user.id);
      return { answer, wasFree: charge.wasFree, costKopecks: charge.costKopecks, access };
    }),
});
