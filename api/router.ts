import { createRouter, publicQuery } from "./middleware";
import { recipeRouter } from "./recipeRouter";
import { placeRouter } from "./placeRouter";
import { commentRouter } from "./commentRouter";
import { recipeParserRouter } from "./recipeParser";
import { authRouter } from "./authRouter";
import { labelTemplateRouter } from "./labelTemplateRouter";
import { submissionRouter } from "./submissionRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  recipe: recipeRouter,
  place: placeRouter,
  comment: commentRouter,
  recipeParser: recipeParserRouter,
  auth: authRouter,
  labelTemplate: labelTemplateRouter,
  submission: submissionRouter,
});

export type AppRouter = typeof appRouter;
