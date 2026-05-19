import { relations } from "drizzle-orm";
import {
  recipes,
  recipeIngredients,
  recipeSteps,
  places,
  placeInfusions,
  comments,
} from "./schema";

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
  comments: many(comments),
}));

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
  })
);

export const recipeStepsRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeSteps.recipeId],
    references: [recipes.id],
  }),
}));

export const placesRelations = relations(places, ({ many }) => ({
  infusions: many(placeInfusions),
  comments: many(comments),
}));

export const placeInfusionsRelations = relations(
  placeInfusions,
  ({ one }) => ({
    place: one(places, {
      fields: [placeInfusions.placeId],
      references: [places.id],
    }),
  })
);

export const commentsRelations = relations(comments, ({ one }) => ({
  recipe: one(recipes, {
    fields: [comments.recipeId],
    references: [recipes.id],
  }),
  place: one(places, {
    fields: [comments.placeId],
    references: [places.id],
  }),
}));
