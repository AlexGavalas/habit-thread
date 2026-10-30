import { z } from 'zod';

import { MEAL_ZONE_KEYS } from '~constants/meal-zones';

export const scheduleSlotSchema = z.object({
    key: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-zA-Z0-9-]+$/u),
    label: z.string().trim().min(1).max(40),
    legacyKey: z.enum(MEAL_ZONE_KEYS).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/u),
});

export const scheduleSlotsSchema = z
    .array(scheduleSlotSchema)
    .min(1)
    .max(10)
    .superRefine((slots, context) => {
        if (new Set(slots.map(({ key }) => key)).size !== slots.length) {
            context.addIssue({
                code: 'custom',
                message: 'Duplicate slot keys',
            });
        }
        if (new Set(slots.map(({ time }) => time)).size !== slots.length) {
            context.addIssue({
                code: 'custom',
                message: 'Duplicate slot times',
            });
        }
    })
    .transform((slots) =>
        slots.toSorted((a, b) => a.time.localeCompare(b.time)),
    );

// New recurring patterns can extend this discriminated union without changing
// the effective-date or date-override contracts.
export const scheduleTemplateSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('daily'), slots: scheduleSlotsSchema }),
]);

export const scheduleTemplateResponseSchema = z.object({
    effectiveFrom: z.iso.date(),
    template: scheduleTemplateSchema,
});

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;
export type ScheduleTemplate = z.infer<typeof scheduleTemplateSchema>;
