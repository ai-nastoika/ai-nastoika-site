import { createRouter, publicQuery } from "./middleware";
import { recipeRouter } from "./recipeRouter";
import { placeRouter } from "./placeRouter";
import { commentRouter } from "./commentRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  recipe: recipeRouter,
  place: placeRouter,
  comment: commentRouter,
});

export type AppRouter = typeof appRouter;
