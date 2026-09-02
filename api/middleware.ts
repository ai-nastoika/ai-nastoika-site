import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
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
