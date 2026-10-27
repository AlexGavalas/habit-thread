import { z } from 'zod';

import { MEAL_ZONE_KEYS } from '~constants/meal-zones';
import { type MealZoneTimes } from '~types/meal-zone';

const timeSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time');

const baseMealZoneTimesSchema = z.object({
    dinner: timeSchema,
    lunch: timeSchema,
    morning: timeSchema,
    snack1: timeSchema,
    snack2: timeSchema,
});

const toMinutes = (time: string): number => {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

export const mealZoneTimesSchema: z.ZodType<MealZoneTimes> =
    baseMealZoneTimesSchema.superRefine((times, context) => {
        for (let index = 1; index < MEAL_ZONE_KEYS.length; index += 1) {
            const previous = MEAL_ZONE_KEYS[index - 1];
            const current = MEAL_ZONE_KEYS[index];

            if (
                previous &&
                current &&
                toMinutes(times[current]) <= toMinutes(times[previous])
            ) {
                context.addIssue({
                    code: 'custom',
                    message: 'Meal zone times must be in chronological order',
                    path: [current],
                });
            }
        }
    });

export const mealZoneTimesRequestSchema = z.object({
    times: mealZoneTimesSchema,
});

export const mealZoneTimesResponseSchema = z.object({
    data: mealZoneTimesSchema,
    effectiveFrom: z.iso.date().optional(),
});
