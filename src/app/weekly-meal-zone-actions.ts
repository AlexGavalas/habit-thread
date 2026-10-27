'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { ProfessionalError, requireMealPlanAccess } from '~api/professional';
import { getCurrentUser } from '~api/session';
import { saveWeeklyMealZones } from '~api/weekly-meal-zone';
import { weeklyMealScheduleSchema } from '~schemas/weekly-meal-zone';
import { type ActionResult } from '~types/action-result';

export const saveWeeklyMealSchedule = async (
    input: unknown,
): Promise<ActionResult> => {
    const user = await getCurrentUser();

    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }

    const parsed = weeklyMealScheduleSchema
        .extend({ ownerUserId: z.number().int().positive().optional() })
        .safeParse(input);

    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }

    try {
        const { ownerUserId = user.id, weekStart, zones } = parsed.data;
        await requireMealPlanAccess({
            actorUserId: user.id,
            ownerUserId,
        });
        await saveWeeklyMealZones({
            userId: ownerUserId,
            weekStart,
            zones,
        });
    } catch (error) {
        if (error instanceof ProfessionalError) {
            return { ok: false, reason: 'forbidden' };
        }
        throw error;
    }

    revalidatePath('/home');
    revalidatePath('/meal-plan');

    return { ok: true };
};
