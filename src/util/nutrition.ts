import { type FoodNutrition, type FoodSearchResult } from '~types/food-search';
import { type EditedMealItem, type MealItem } from '~types/meal';

export const NUTRIENT_KEYS = [
    'calories',
    'protein',
    'carbohydrates',
    'fat',
    'fiber',
    'sugar',
    'salt',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type NutritionTotals = FoodNutrition & {
    complete: Record<NutrientKey, boolean>;
};

const mapNutrients = <Value>(
    getValue: (key: NutrientKey) => Value,
): Record<NutrientKey, Value> => ({
    calories: getValue('calories'),
    carbohydrates: getValue('carbohydrates'),
    fat: getValue('fat'),
    fiber: getValue('fiber'),
    protein: getValue('protein'),
    salt: getValue('salt'),
    sugar: getValue('sugar'),
});

export const scaleNutrition = (
    item: MealItem | EditedMealItem,
): FoodNutrition => {
    const factor = item.quantity_grams / (item.basis_grams ?? 100);
    return mapNutrients((key) =>
        item[key] === null || item[key] === undefined
            ? null
            : item[key] * factor,
    );
};

export const totalNutrition = (
    items: readonly (MealItem | EditedMealItem)[],
): NutritionTotals => {
    const scaled = items.map(scaleNutrition);
    const totals = mapNutrients((key) => {
        const known = scaled.flatMap((value) =>
            value[key] === null ? [] : [value[key]],
        );
        return known.length
            ? known.reduce((sum, value) => sum + value, 0)
            : null;
    });
    return {
        ...totals,
        complete: mapNutrients(
            (key) =>
                scaled.length > 0 &&
                scaled.every((value) => value[key] !== null),
        ),
    };
};

export const macroEnergyPercentages = (
    nutrition: FoodNutrition,
): { carbohydrates: number; fat: number; protein: number } => {
    const protein = (nutrition.protein ?? 0) * 4;
    const carbohydrates = (nutrition.carbohydrates ?? 0) * 4;
    const fat = (nutrition.fat ?? 0) * 9;
    const total = protein + carbohydrates + fat;
    return total
        ? {
              carbohydrates: (carbohydrates / total) * 100,
              fat: (fat / total) * 100,
              protein: (protein / total) * 100,
          }
        : { carbohydrates: 0, fat: 0, protein: 0 };
};

export const foodToMealItem = (
    food: FoodSearchResult,
    position: number,
): EditedMealItem => ({
    alternative_name: food.alternativeName,
    basis_grams: 100,
    brand: food.brand,
    ...food.nutrition,
    name: food.name,
    position,
    provider_food_id: food.id,
    quantity_grams: 100,
    source: food.source,
});
