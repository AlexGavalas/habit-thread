import { z } from 'zod';

export const MAX_IMPORT_FILE_SIZE = 4 * 1024 * 1024;
export const MAX_IMPORT_CHARACTERS = 40_000;
export const MAX_IMPORT_PAGES = 20;
export const DAILY_IMPORT_LIMIT = 10;

export const extractedMealsSchema = z.object({
    meals: z.array(z.string().trim().min(1).max(4000)).max(100),
});

export const mealImportResponseSchema = z.object({
    data: extractedMealsSchema.shape.meals.min(1),
});

export const mealImportErrorCodeSchema = z.enum([
    'invalid_file',
    'unsupported_type',
    'file_too_large',
    'document_too_large',
    'unreadable_document',
    'no_meals',
    'rate_limited',
    'unavailable',
    'extraction_failed',
]);

export const mealImportErrorSchema = z.object({
    code: mealImportErrorCodeSchema,
});

export type MealImportErrorCode = z.infer<typeof mealImportErrorCodeSchema>;
