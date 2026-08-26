/**
 * Поиск похожих рецептов из собственной базы — используется, чтобы консультации
 * ИИ (recipeConsultRouter, tasteCalculatorRouter) опирались на реальные рецепты
 * сайта, а не выдумывали абстрактные советы "в вакууме".
 *
 * Никаких эмбеддингов/векторных баз — база рецептов небольшая (десятки-сотни
 * штук), поэтому достаточно сравнивать структурированные поля (числовой профиль
 * вкуса sweet/sour/bitter/spicy/fruity/herbal, состав ингредиентов) прямо в JS
 * при каждом запросе. Если база вырастет на порядки — это первое место, куда
 * стоит вернуться и заменить на честный векторный поиск.
 */
import { getDb } from "../queries/connection";
import { recipes, recipeIngredients } from "@db/schema";
import { inArray } from "drizzle-orm";
import { normalizeText, diceCoefficient, fuzzyIngredientOverlap } from "./similarity";

export type RecipeTasteProfile = {
  sweet: number;
  sour: number;
  bitter: number;
  spicy: number;
  fruity: number;
  herbal: number;
};

const TASTE_DIMENSIONS: (keyof RecipeTasteProfile)[] = ["sweet", "sour", "bitter", "spicy", "fruity", "herbal"];

export type RetrievedRecipe = {
  id: number;
  slug: string;
  title: string;
  category: string;
  categoryLabel: string | null;
  abv: string | null;
  ingredients: string[];
  tastingDescription: string | null;
  score: number;
};

/** Загружает все рецепты + их ингредиенты одним заходом — дешевле, чем N+1
 *  запросов, а при небольшой базе (десятки-сотни рецептов) выполняется быстро. */
async function loadAllRecipesWithIngredients(excludeId?: number) {
  const db = getDb();
  const allRecipes = await db.select().from(recipes);
  const filtered = excludeId ? allRecipes.filter((r) => r.id !== excludeId) : allRecipes;
  if (filtered.length === 0) return [];

  const ids = filtered.map((r) => r.id);
  const allIngredients = await db.select().from(recipeIngredients).where(inArray(recipeIngredients.recipeId, ids));
  const byRecipe = new Map<number, string[]>();
  for (const ing of allIngredients) {
    const list = byRecipe.get(ing.recipeId) ?? [];
    list.push(ing.name);
    byRecipe.set(ing.recipeId, list);
  }

  return filtered.map((r) => ({ ...r, ingredientNames: byRecipe.get(r.id) ?? [] }));
}

function toRetrieved(r: (typeof recipes.$inferSelect) & { ingredientNames: string[] }, score: number): RetrievedRecipe {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    categoryLabel: r.categoryLabel,
    abv: r.abv,
    ingredients: r.ingredientNames,
    tastingDescription: r.tastingDescription,
    score: Math.round(score * 100) / 100,
  };
}

/**
 * Похожие рецепты по числовому вкусовому профилю + пересечению ингредиентов.
 * Для recipeConsultRouter: пользователь спрашивает про рецепт X — находим
 * "соседей" по вкусу и составу среди ОСТАЛЬНЫХ рецептов сайта, чтобы модель
 * могла сослаться на конкретный пример, а не абстрактный совет.
 */
export async function findSimilarRecipesByProfile(
  recipeId: number,
  profile: RecipeTasteProfile,
  ownIngredients: string[],
  limit = 3
): Promise<RetrievedRecipe[]> {
  const candidates = await loadAllRecipesWithIngredients(recipeId);
  if (candidates.length === 0) return [];

  // Максимально возможное евклидово расстояние в 6-мерном пространстве вкуса
  // (шкала каждой оси 0-10) — нужно, чтобы нормировать расстояние в похожесть 0..1.
  const maxDist = Math.sqrt(TASTE_DIMENSIONS.length * 10 * 10);

  const scored = candidates.map((r) => {
    let sqSum = 0;
    for (const d of TASTE_DIMENSIONS) {
      const diff = (r[d] ?? 0) - (profile[d] ?? 0);
      sqSum += diff * diff;
    }
    const tasteSim = 1 - Math.sqrt(sqSum) / maxDist;
    const ingredientSim = fuzzyIngredientOverlap(ownIngredients, r.ingredientNames);
    // Вкус важнее буквального состава — два рецепта с разными ингредиентами,
    // но похожим результатом полезнее для совета, чем с теми же ингредиентами
    // но другим вкусом.
    return { r, score: tasteSim * 0.6 + ingredientSim * 0.4 };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ r, score }) => toRetrieved(r, score));
}

/**
 * Похожие рецепты по свободному тексту вопроса — для tasteCalculatorRouter,
 * где нет привязки к конкретному рецепту. Сопоставляем слова из сообщения
 * пользователя с названиями ингредиентов и текстом рецептов (коэффициент Дайса
 * на биграммах — терпим к небольшим опечаткам и формам слова).
 */
export async function findSimilarRecipesByText(query: string, limit = 3): Promise<RetrievedRecipe[]> {
  const candidates = await loadAllRecipesWithIngredients();
  if (candidates.length === 0) return [];

  const normQuery = normalizeText(query);
  const queryWords = normQuery.split(" ").filter((w) => w.length >= 3);
  if (queryWords.length === 0) return [];

  const scored = candidates.map((r) => {
    let ingredientHits = 0;
    for (const ing of r.ingredientNames) {
      const normIng = normalizeText(ing);
      const matched = queryWords.some((w) => normIng.includes(w) || diceCoefficient(w, normIng) > 0.5);
      if (matched) ingredientHits++;
    }
    const ingredientScore = r.ingredientNames.length > 0 ? ingredientHits / r.ingredientNames.length : 0;

    const textBlob = normalizeText(`${r.title} ${r.categoryLabel ?? r.category} ${r.tastingDescription ?? ""}`);
    const textScore = diceCoefficient(normQuery, textBlob);

    return { r, score: ingredientScore * 0.7 + textScore * 0.3 };
  });

  return scored
    .filter(({ score }) => score > 0.05) // отсекаем шум, чтобы не засорять промпт нерелевантными рецептами
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ r, score }) => toRetrieved(r, score));
}

/** Форматирует найденные рецепты в компактный текстовый блок для system-промпта. */
export function formatRecipesForPrompt(found: RetrievedRecipe[]): string {
  if (found.length === 0) return "";
  return found
    .map((r, i) => {
      const meta = [r.categoryLabel ?? r.category, r.abv ? `крепость ${r.abv}` : null].filter(Boolean).join(", ");
      return `${i + 1}. «${r.title}»${meta ? ` (${meta})` : ""}\n   Ингредиенты: ${r.ingredients.join(", ") || "не указаны"}${r.tastingDescription ? `\n   Вкус: ${r.tastingDescription}` : ""}`;
    })
    .join("\n\n");
}
