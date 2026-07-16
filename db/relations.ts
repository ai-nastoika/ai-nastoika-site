import { relations } from "drizzle-orm";
import {
  recipes,
  recipeIngredients,
  recipeSteps,
  places,
  placeInfusions,
  placeSubmissions,
  comments,
  labelTemplates,
  userRecipeSubmissions,
  infusions,
  infusionStages,
  recipeTrackerStages,
} from "./schema";

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
  comments: many(comments),
  trackerStages: many(recipeTrackerStages),
}));

export const recipeTrackerStagesRelations = relations(recipeTrackerStages, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeTrackerStages.recipeId], references: [recipes.id] }),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
}));

export const recipeStepsRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeSteps.recipeId], references: [recipes.id] }),
}));

export const placesRelations = relations(places, ({ many }) => ({
  comments: many(comments),
  infusions: many(placeInfusions),
}));

export const placeInfusionsRelations = relations(placeInfusions, ({ one }) => ({
  place: one(places, { fields: [placeInfusions.placeId], references: [places.id] }),
}));

export const placeSubmissionsRelations = relations(placeSubmissions, () => ({}));

export const commentsRelations = relations(comments, ({ one }) => ({
  recipe: one(recipes, { fields: [comments.recipeId], references: [recipes.id] }),
  place: one(places, { fields: [comments.placeId], references: [places.id] }),
}));

export const labelTemplatesRelations = relations(labelTemplates, () => ({}));

export const userRecipeSubmissionsRelations = relations(userRecipeSubmissions, () => ({}));

export const infusionsRelations = relations(infusions, ({ many, one }) => ({
  stages: many(infusionStages),
  recipe: one(recipes, { fields: [infusions.recipeId], references: [recipes.id] }),
}));

export const infusionStagesRelations = relations(infusionStages, ({ one }) => ({
  infusion: one(infusions, { fields: [infusionStages.infusionId], references: [infusions.id] }),
}));
