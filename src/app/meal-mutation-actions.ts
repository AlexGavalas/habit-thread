'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { copyMealWeek } from '~api/copy-meal-week';
import { saveMealPlanChanges } from '~api/meal-plan';
import { canAccessMealPlan } from '~api/professional';
import { getCurrentUser } from '~api/session';
import { weekStartSchema } from '~schemas/meal-plan';
import { type ActionResult } from '~types/action-result';
import { type Meal } from '~types/meal';

export const saveMealOperation = async (
    input: unknown,
): Promise<ActionResult<{ meals: Meal[] }>> => {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    const result = await saveMealPlanChanges(user.id, input);
    if (result.ok) {
        revalidatePath('/home');
        revalidatePath('/meal-plan');
    }
    return result;
};

const copySchema = z.object({
    ownerUserId: z.number().int().positive(),
    sourceWeek: weekStartSchema,
});

export const copyMealPlanWeek = async (
    input: unknown,
): Promise<ActionResult> => {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    const parsed = copySchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }
    const { ownerUserId, sourceWeek } = parsed.data;
    if (!(await canAccessMealPlan({ actorUserId: user.id, ownerUserId }))) {
        return { ok: false, reason: 'forbidden' };
    }
    await copyMealWeek({
        allowAnnotations: ownerUserId === user.id,
        sourceWeek,
        userId: ownerUserId,
    });
    revalidatePath('/home');
    revalidatePath('/meal-plan');
    return { ok: true };
};
