import { parseISO } from 'date-fns';
import { z } from 'zod';

import { mealSchema } from './meal';

export const weekStartSchema = z.iso
    .date()
    .refine((day) => parseISO(day).getDay() === 1);

export const ownerWeekQuerySchema = z.object({
    ownerUserId: z.coerce.number().int().positive().optional(),
    weekStart: weekStartSchema,
});

const writableMealSchema = mealSchema.and(
    z.object({
        day: z.iso.date(),
        section_key: z.string().min(1),
    }),
);

export const mealPlanChangesSchema = z
    .object({
        deletedIds: z.array(z.uuid()),
        editedMeals: z.array(
            writableMealSchema.and(z.object({ id: z.uuid() })),
        ),
        newMeals: z.array(writableMealSchema),
        ownerUserId: z.number().int().positive().optional(),
        weekStart: weekStartSchema.optional(),
    })
    .refine(({ deletedIds, editedMeals, newMeals }) => {
        const slots = [...editedMeals, ...newMeals].map(
            (meal) => `${meal.day}:${meal.section_key}`,
        );
        const ids = editedMeals.map(({ id }) => id);
        return (
            new Set(slots).size === slots.length &&
            new Set(ids).size === ids.length &&
            !ids.some((id) => deletedIds.includes(id))
        );
    });

export const mealRangeQuerySchema = z
    .object({
        endDate: z.iso.date(),
        ownerUserId: z.coerce.number().int().positive().optional(),
        startDate: z.iso.date(),
    })
    .refine(({ endDate, startDate }) => startDate <= endDate);
