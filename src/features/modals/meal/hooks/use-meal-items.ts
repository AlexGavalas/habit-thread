import { useState } from 'react';

import { type FoodSearchResult } from '~types/food-search';
import { type EditedMealItem } from '~types/meal';
import { foodToMealItem } from '~util/nutrition';

import { isFoodSelected } from '../food-selection';

type MealItemsState = {
    items: EditedMealItem[];
    recentlyAddedIndex: number | null;
};

type UseMealItemsResult = MealItemsState & {
    addFood: (food: FoodSearchResult) => void;
    setItems: (items: EditedMealItem[]) => void;
};

export const useMealItems = (
    initialItems: EditedMealItem[] = [],
): UseMealItemsResult => {
    const [state, setState] = useState<MealItemsState>({
        items: initialItems,
        recentlyAddedIndex: null,
    });

    const addFood = (food: FoodSearchResult): void => {
        setState((current) => {
            if (isFoodSelected(food, current.items)) {
                return current;
            }
            return {
                items: [
                    ...current.items,
                    foodToMealItem(food, current.items.length),
                ],
                recentlyAddedIndex: current.items.length,
            };
        });
    };
    const setItems = (items: EditedMealItem[]): void => {
        setState({ items, recentlyAddedIndex: null });
    };

    return { ...state, addFood, setItems };
};
