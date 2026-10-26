import { type FoodSearchResult } from '~types/food-search';
import { type EditedMealItem } from '~types/meal';

export const isFoodSelected = (
    food: FoodSearchResult,
    items: readonly EditedMealItem[],
): boolean =>
    items.some(
        (item) =>
            item.source === food.source && item.provider_food_id === food.id,
    );
