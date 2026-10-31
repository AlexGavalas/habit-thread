import { z } from 'zod';

export const foodSearchCountrySchema = z.enum(['all', 'de', 'gr']);

export const foodSearchQuerySchema = z.object({
    country: foodSearchCountrySchema.default('de'),
    q: z.string().trim().min(2).max(100),
});

export const foodNutritionSchema = z.object({
    calories: z.number().nullable(),
    carbohydrates: z.number().nullable(),
    fat: z.number().nullable(),
    fiber: z.number().nullable(),
    protein: z.number().nullable(),
    salt: z.number().nullable(),
    sugar: z.number().nullable(),
});

export const foodSearchResultSchema = z.object({
    alternativeName: z.string().nullable(),
    brand: z.string().nullable(),
    id: z.string(),
    name: z.string(),
    nutrition: foodNutritionSchema,
    quantity: z.string().nullable(),
    source: z.enum(['bls', 'open-food-facts']),
});

export const foodSearchResponseSchema = z.object({
    data: z.object({
        bls: z.array(foodSearchResultSchema),
        openFoodFacts: z.array(foodSearchResultSchema),
    }),
    warnings: z.array(z.literal('open-food-facts-unavailable')),
});
