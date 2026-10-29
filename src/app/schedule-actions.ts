'use server';

import { format, parseISO, startOfWeek } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { ProfessionalError, requireMealPlanAccess } from '~api/professional';
import { saveScheduleTemplate } from '~api/save-schedule-template';
import { getCurrentUser, getRequestDate } from '~api/session';
import { saveDayMealZones } from '~api/weekly-meal-zone';
import { scheduleTemplateSchema } from '~schemas/schedule-template';
import { weeklyMealZoneSchema } from '~schemas/weekly-meal-zone';
import { getNextScheduleStart } from '~util/schedule';
import {
    ScheduleConflictError,
    type ScheduleActionResult,
} from '~util/schedule-result';

const ownerSchema = z.number().int().positive().optional();
const defaultInputSchema = z.object({
    effectiveFrom: z.iso.date(),
    ownerUserId: ownerSchema,
    template: scheduleTemplateSchema,
});
const dayInputSchema = z
    .object({
        day: z.iso.date(),
        ownerUserId: ownerSchema,
        zones: z.array(weeklyMealZoneSchema).min(1).max(10).nullable(),
    })
    .superRefine(({ day, zones }, context) => {
        if (!zones) {
            return;
        }
        const weekStart = format(
            startOfWeek(parseISO(day), { weekStartsOn: 1 }),
            'yyyy-MM-dd',
        );
        if (
            zones.some(
                (zone) => zone.day !== day || zone.weekStart !== weekStart,
            ) ||
            new Set(zones.map(({ zoneKey }) => zoneKey)).size !==
                zones.length ||
            new Set(zones.map(({ time }) => time)).size !== zones.length ||
            zones.some((zone, position) => zone.position !== position)
        ) {
            context.addIssue({
                code: 'custom',
                message: 'Invalid day schedule',
            });
        }
    });

const refreshSchedules = (): void => {
    revalidatePath('/home');
    revalidatePath('/meal-plan');
    revalidatePath('/settings');
    revalidatePath('/professional');
};

const scheduleFailure = (error: unknown): ScheduleActionResult => {
    if (error instanceof ProfessionalError) {
        return { ok: false, reason: 'forbidden' };
    }
    if (error instanceof ScheduleConflictError) {
        return { days: error.days, ok: false, reason: 'schedule_conflict' };
    }
    throw error;
};

export const saveDefaultSchedule = async (
    input: unknown,
): Promise<ScheduleActionResult> => {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    const parsed = defaultInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }
    try {
        const ownerUserId = parsed.data.ownerUserId ?? user.id;
        const effectiveFrom = getNextScheduleStart(await getRequestDate());
        if (parsed.data.effectiveFrom !== effectiveFrom) {
            return { ok: false, reason: 'invalid' };
        }
        await requireMealPlanAccess({ actorUserId: user.id, ownerUserId });
        await saveScheduleTemplate({
            effectiveFrom,
            template: parsed.data.template,
            userId: ownerUserId,
        });
    } catch (error) {
        return scheduleFailure(error);
    }
    refreshSchedules();
    return { ok: true };
};

export const saveDaySchedule = async (
    input: unknown,
): Promise<ScheduleActionResult> => {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    const parsed = dayInputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }
    try {
        const { day, zones, ownerUserId = user.id } = parsed.data;
        await requireMealPlanAccess({ actorUserId: user.id, ownerUserId });
        await saveDayMealZones({
            day,
            userId: ownerUserId,
            weekStart: format(
                startOfWeek(parseISO(day), { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            ),
            zones,
        });
    } catch (error) {
        return scheduleFailure(error);
    }
    refreshSchedules();
    return { ok: true };
};
