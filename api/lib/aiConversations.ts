import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { aiConversations } from "@db/schema";

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
        .set({ messages: params.messages, updatedAt: new Date() })
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

/* Последний диалог пользователя по конкретному контексту (рецепту/трекеру) —
   чтобы при повторном открытии страницы можно было продолжить с того же места. */
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
            eq(aiConversations.contextId, contextId)
          )
        : and(eq(aiConversations.userId, userId), eq(aiConversations.requestType, requestType))
    )
    .orderBy(desc(aiConversations.updatedAt))
    .limit(1);

  return conv ?? null;
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
