import { z } from 'zod';

import { type EditedMealPool, type MealTemplate } from '~types/meal-pool';

import { mealItemSchema } from './meal';

type MealPoolSchema = z.ZodType<EditedMealPool>;

const mealTemplateSchema: z.ZodType<MealTemplate> = z.object({
    content: z.string(),
    id: z.number(),
    items: z.array(mealItemSchema.required()),
});

export const mealPoolSearchResponseSchema = z.object({
    data: z.union([
        z.array(mealTemplateSchema),
        z.object({
            client: z.array(mealTemplateSchema),
            own: z.array(mealTemplateSchema),
        }),
    ]),
});

export const mealPoolSchema: MealPoolSchema = z.object({
    content: z.string(),
    id: z.number(),
    items: z.array(mealItemSchema).optional(),
    user_id: z.number(),
});

export const postRequestSchema = z.object({
    templates: z.array(
        z.object({
            content: z.string().min(1),
            id: z.number().int().positive().optional(),
            items: z.array(mealItemSchema),
        }),
    ),
});
