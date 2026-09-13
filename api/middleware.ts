import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  // Без этого форматтера ошибка валидации Zod долетает до пользователя как
  // сырой JSON-массив issues (err.message у ZodError — это буквально
  // JSON.stringify(issues) по умолчанию) — и всплывает в alert() как
  // нечитаемая простыня фигурных скобок. Достаём человеческий текст.
  //
  // Проверяем СТРУКТУРУ (наличие массива issues), а не `instanceof ZodError` —
  // при бандлинге esbuild сервер может получить свою копию модуля zod,
  // отличную от той, что импортирована в этом файле, и instanceof тогда
  // молча не сработает (проверено на практике — так и было).
  errorFormatter({ shape, error }) {
    const cause = error.cause as { issues?: { message?: string }[] } | undefined;
    if (cause && Array.isArray(cause.issues)) {
      const readable = cause.issues.map((i) => i.message).filter(Boolean).join("; ");
      if (readable) return { ...shape, message: readable };
    }
    return shape;
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

export const authedQuery = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Требуется авторизация" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminQuery = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Требуются права администратора" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Редактор: доступ к CRUD рецептов и мест (вкладки «Рецепты»/«Места» в админке
// + парсеры /tools/parse-recipe, /tools/parse-place). Всё остальное в админке
// (пользователи, модерация заявок, этикетки, обращения, комментарии, статистика)
// по-прежнему только для admin — см. adminQuery выше.
export const editorQuery = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "editor")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Требуются права редактора" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
