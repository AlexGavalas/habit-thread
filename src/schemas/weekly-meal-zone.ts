import { eachDayOfInterval, endOfWeek, format, parseISO } from 'date-fns';
import { z } from 'zod';

import { MEAL_ZONE_KEYS } from '~constants/meal-zones';

import { weekStartSchema } from './meal-plan';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/u;

export const weeklyMealZoneSchema = z.object({
    day: z.iso.date(),
    label: z.string().trim().min(1).max(40),
    legacyKey: z.enum(MEAL_ZONE_KEYS).optional(),
    position: z.number().int().min(0).max(9),
    time: z.string().regex(timePattern),
    weekStart: z.iso.date(),
    zoneKey: z.string().min(1).max(100),
});

export const weeklyMealScheduleSchema = z
    .object({
        weekStart: weekStartSchema,
        zones: z.array(weeklyMealZoneSchema).min(7).max(70),
    })
    .superRefine(({ weekStart, zones }, context) => {
        const expectedDays = eachDayOfInterval({
            end: endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
            start: parseISO(weekStart),
        }).map((day) => format(day, 'yyyy-MM-dd'));

        for (const day of expectedDays) {
            const dayZones = zones.filter((zone) => zone.day === day);
            if (dayZones.length < 1 || dayZones.length > 10) {
                context.addIssue({
                    code: 'custom',
                    message:
                        'Each day must contain between 1 and 10 meal slots',
                    path: ['zones'],
                });
            }

            const times = dayZones.map(({ time }) => time);
            if (new Set(times).size !== times.length) {
                context.addIssue({
                    code: 'custom',
                    message: 'Meal slot times must be unique within a day',
                    path: ['zones'],
                });
            }
        }

        if (
            zones.some(
                (zone) =>
                    zone.weekStart !== weekStart ||
                    !expectedDays.includes(zone.day),
            )
        ) {
            context.addIssue({
                code: 'custom',
                message: 'Meal slots must belong to the selected week',
                path: ['zones'],
            });
        }

        const keys = zones.map(({ zoneKey }) => zoneKey);
        if (new Set(keys).size !== keys.length) {
            context.addIssue({
                code: 'custom',
                message: 'Meal slot keys must be unique',
                path: ['zones'],
            });
        }
    });
