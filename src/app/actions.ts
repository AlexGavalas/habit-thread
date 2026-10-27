'use server';

import { addWeeks, format, startOfWeek } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { acceptConnectionRequest as acceptRequest } from '~api/connection';
import { saveMealPlanChanges } from '~api/meal-plan';
import { saveMealZoneTimes as saveZoneTimes } from '~api/meal-zone';
import { ProfessionalError, requireMealPlanAccess } from '~api/professional';
import { getCurrentUser, getRequestDate } from '~api/session';
import { updateProfile } from '~api/user';
import { mealZoneTimesRequestSchema } from '~schemas/meal-zone';
import { patchRequestSchema as profileSchema } from '~schemas/user';
import { type ActionResult } from '~types/action-result';

import {
    type ProfessionalActionResult,
    acceptProfessionalInvitation as acceptProfessionalInvitationAction,
    inviteProfessional as inviteProfessionalAction,
    removeProfessionalRelationship as removeProfessionalRelationshipAction,
    setProfessionalDiscoverable as setProfessionalDiscoverableAction,
    setProfessionalRole as setProfessionalRoleAction,
} from './professional-actions';

export const acceptProfessionalInvitation = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    return acceptProfessionalInvitationAction(input);
};

export const inviteProfessional = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    return inviteProfessionalAction(input);
};

export const removeProfessionalRelationship = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    return removeProfessionalRelationshipAction(input);
};

export const setProfessionalDiscoverable = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    return setProfessionalDiscoverableAction(input);
};

export const setProfessionalRole = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    return setProfessionalRoleAction(input);
};

export const saveMealPlan = async (input: unknown): Promise<ActionResult> => {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    const result = await saveMealPlanChanges(user.id, input);
    if (result.ok) {
        revalidatePath('/home');
        revalidatePath('/meal-plan');
    }
    return result.ok ? { ok: true } : result;
};

export const saveMealZoneTimes = async (
    input: unknown,
): Promise<ActionResult<{ effectiveFrom: string }>> => {
    const user = await getCurrentUser();

    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }

    const parsed = mealZoneTimesRequestSchema
        .extend({ ownerUserId: z.number().int().positive().optional() })
        .safeParse(input);

    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }

    const effectiveFrom = format(
        addWeeks(startOfWeek(await getRequestDate(), { weekStartsOn: 1 }), 1),
        'yyyy-MM-dd',
    );

    try {
        const ownerUserId = parsed.data.ownerUserId ?? user.id;
        await requireMealPlanAccess({
            actorUserId: user.id,
            ownerUserId,
        });
        await saveZoneTimes({
            effectiveFrom,
            times: parsed.data.times,
            userId: ownerUserId,
        });
    } catch (error) {
        if (error instanceof ProfessionalError) {
            return { ok: false, reason: 'forbidden' };
        }
        throw error;
    }

    revalidatePath('/home');
    revalidatePath('/meal-plan');
    revalidatePath('/settings');

    return { effectiveFrom, ok: true };
};

export const saveProfile = async (input: unknown): Promise<ActionResult> => {
    const user = await getCurrentUser();

    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }

    const parsed = profileSchema.safeParse(input);

    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }

    await updateProfile({ ...parsed.data, userId: user.id });

    revalidatePath('/', 'layout');

    return { ok: true };
};

export const acceptConnectionRequest = async (
    input: unknown,
): Promise<ActionResult> => {
    const user = await getCurrentUser();

    const requestId = z.string().uuid().safeParse(input);

    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    if (!requestId.success) {
        return { ok: false, reason: 'invalid' };
    }
    await acceptRequest({ requestId: requestId.data, userId: user.id });

    revalidatePath('/connections');

    return { ok: true };
};
