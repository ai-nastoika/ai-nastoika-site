import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { aiConversations, recipes } from "@db/schema";

export type ConversationMessage = { role: "user" | "assistant"; content: string };

/* Сохраняет очередной обмен репликами. Если conversationId передан и диалог
   принадлежит этому пользователю — дописывает в него. Иначе создаёт новый
   диалог (например, первое сообщение в сессии). Возвращает id диалога —
   фронтенд должен передавать его в следующих сообщениях той же сессии. */
export async function saveConversationTurn(params: {
  userId: number;
  requestType: string;
  contextId?: number | null;
  contextLabel?: string | null;
  conversationId?: number | null;
  messages: ConversationMessage[]; // полный массив реплик диалога после этого обмена
}): Promise<number> {
  const db = getDb();

  if (params.conversationId) {
    const [existing] = await db
      .select({ id: aiConversations.id, userId: aiConversations.userId })
      .from(aiConversations)
      .where(eq(aiConversations.id, params.conversationId));

    if (existing && existing.userId === params.userId) {
      await db
        .update(aiConversations)
        // status: "active" на всякий случай — если фронтенд каким-то образом
        // продолжит писать в уже архивированный диалог (не должно происходить
        // при обычном сценарии, т.к. после завершения conversationId сбрасывается).
        .set({ messages: params.messages, status: "active", updatedAt: new Date() })
        .where(eq(aiConversations.id, params.conversationId));
      return params.conversationId;
    }
    // Диалог не найден или принадлежит другому пользователю — создаём новый,
    // не бросаем ошибку (не критично для UX, просто не потеряем сообщение).
  }

  const result = await db.insert(aiConversations).values({
    userId: params.userId,
    requestType: params.requestType,
    contextId: params.contextId ?? null,
    contextLabel: params.contextLabel ?? null,
    messages: params.messages,
  });

  return Number(result[0].insertId);
}

/* Последний АКТИВНЫЙ диалог пользователя по конкретному контексту (рецепту/трекеру) —
   чтобы при повторном открытии страницы можно было продолжить с того же места.
   Завершённые (архивные) диалоги сюда не попадают — иначе именно они и
   переоткрывались бы при каждом заходе на страницу (см. finishConversation). */
export async function getLatestConversation(
  userId: number,
  requestType: string,
  contextId?: number | null
) {
  const db = getDb();

  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(
      contextId != null
        ? and(
            eq(aiConversations.userId, userId),
            eq(aiConversations.requestType, requestType),
            eq(aiConversations.contextId, contextId),
            eq(aiConversations.status, "active")
          )
        : and(
            eq(aiConversations.userId, userId),
            eq(aiConversations.requestType, requestType),
            eq(aiConversations.status, "active")
          )
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(1);

  return conv ?? null;
}

/* Завершить диалог (кнопка "Завершить диалог" или уход со страницы) — помечает
   архивным, чтобы getLatestConversation больше его не подхватывал. Ничего не
   удаляет — сообщения остаются доступны в ЛК, диалог можно возобновить. */
export async function finishConversation(userId: number, conversationId: number) {
  const db = getDb();

  const [existing] = await db
    .select({ id: aiConversations.id, userId: aiConversations.userId })
    .from(aiConversations)
    .where(eq(aiConversations.id, conversationId));

  if (!existing || existing.userId !== userId) {
    throw new Error("Диалог не найден");
  }

  await db.update(aiConversations).set({ status: "archived" }).where(eq(aiConversations.id, conversationId));
}

/* Возобновить архивный диалог (кнопка "Возобновить" в ЛК) — снимает архивный
   статус и обновляет updatedAt, поэтому он снова становится "последним
   активным" для своего контекста и автоматически подхватится на нужной
   странице через обычный getLatestConversation — без отдельной ручной
   передачи id на фронтенде. Возвращает ссылку, куда открыть диалог. */
export async function resumeConversation(userId: number, conversationId: number) {
  const db = getDb();

  const [existing] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId));

  if (!existing || existing.userId !== userId) {
    throw new Error("Диалог не найден");
  }

  await db
    .update(aiConversations)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(aiConversations.id, conversationId));

  let resumeUrl = "/tools?tool=taste";
  if (existing.requestType === "infusion_consult" && existing.contextId != null) {
    resumeUrl = `/profile?tab=tracker&infusionId=${existing.contextId}`;
  } else if (existing.requestType === "recipe_consultation" && existing.contextId != null) {
    const [recipe] = await db.select({ slug: recipes.slug }).from(recipes).where(eq(recipes.id, existing.contextId));
    resumeUrl = recipe ? `/recipe/${recipe.slug}` : "/recipes";
  }

  return { resumeUrl };
}

/* Последние N диалогов пользователя по всем фичам — для личного кабинета. */
export async function listRecentConversations(userId: number, limit = 10) {
  const db = getDb();
  return db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.updatedAt))
    .limit(limit);
}
