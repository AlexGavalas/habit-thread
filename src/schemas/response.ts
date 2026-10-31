import { z } from 'zod';

export const countResponseSchema = z.object({
    count: z.number().int().nonnegative(),
});

export const booleanResponseSchema = z.object({
    data: z.boolean(),
});
