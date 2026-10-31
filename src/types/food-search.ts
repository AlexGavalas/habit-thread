import type { z } from 'zod';

import type {
    foodNutritionSchema,
    foodSearchCountrySchema,
    foodSearchResponseSchema,
    foodSearchResultSchema,
} from '~schemas/food-search';

export type FoodSearchCountry = z.infer<typeof foodSearchCountrySchema>;
export type FoodNutrition = z.infer<typeof foodNutritionSchema>;
export type FoodSearchResult = z.infer<typeof foodSearchResultSchema>;
export type FoodSearchResponse = z.infer<typeof foodSearchResponseSchema>;
