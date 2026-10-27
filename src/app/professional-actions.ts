'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
    ProfessionalError,
    acceptProfessionalInvitation as acceptProfessional,
    inviteProfessional as createProfessionalInvitation,
    removeProfessionalRelationship as removeProfessional,
    setProfessionalDiscoverable as updateProfessionalDiscoverability,
    setProfessionalRole as updateProfessionalRole,
} from '~api/professional';
import { type ProfessionalErrorCode } from '~api/professional/errors';
import { getCurrentUser } from '~api/session';

export type ProfessionalActionResult =
    | { ok: true }
    | { error: ProfessionalErrorCode | 'unauthorized' | 'invalid'; ok: false };

const actionError = (error: unknown): ProfessionalActionResult => {
    if (error instanceof ProfessionalError) {
        return { error: error.code, ok: false };
    }
    throw error;
};

export const setProfessionalRole = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    const user = await getCurrentUser();
    const parsed = z.object({ enabled: z.boolean() }).safeParse(input);
    if (!user) {
        return { error: 'unauthorized', ok: false };
    }
    if (!parsed.success) {
        return { error: 'invalid', ok: false };
    }

    try {
        await updateProfessionalRole({
            enabled: parsed.data.enabled,
            userId: user.id,
        });
        revalidatePath('/', 'layout');
        revalidatePath('/connections');
        revalidatePath('/professional');
        return { ok: true };
    } catch (error) {
        return actionError(error);
    }
};

export const setProfessionalDiscoverable = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    const user = await getCurrentUser();
    const parsed = z.object({ discoverable: z.boolean() }).safeParse(input);
    if (!user) {
        return { error: 'unauthorized', ok: false };
    }
    if (!parsed.success) {
        return { error: 'invalid', ok: false };
    }

    try {
        await updateProfessionalDiscoverability({
            discoverable: parsed.data.discoverable,
            userId: user.id,
        });
        revalidatePath('/', 'layout');
        revalidatePath('/connections');
        return { ok: true };
    } catch (error) {
        return actionError(error);
    }
};

export const inviteProfessional = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    const user = await getCurrentUser();
    const parsed = z
        .object({ professionalUserId: z.number().int().positive() })
        .safeParse(input);
    if (!user) {
        return { error: 'unauthorized', ok: false };
    }
    if (!parsed.success) {
        return { error: 'invalid', ok: false };
    }

    try {
        await createProfessionalInvitation({
            clientUserId: user.id,
            professionalUserId: parsed.data.professionalUserId,
        });
        revalidatePath('/connections');
        return { ok: true };
    } catch (error) {
        return actionError(error);
    }
};

export const acceptProfessionalInvitation = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    const user = await getCurrentUser();
    const parsed = z
        .object({ relationshipId: z.string().uuid() })
        .safeParse(input);
    if (!user) {
        return { error: 'unauthorized', ok: false };
    }
    if (!parsed.success) {
        return { error: 'invalid', ok: false };
    }

    try {
        await acceptProfessional({
            professionalUserId: user.id,
            relationshipId: parsed.data.relationshipId,
        });
        revalidatePath('/connections');
        revalidatePath('/professional');
        return { ok: true };
    } catch (error) {
        return actionError(error);
    }
};

export const removeProfessionalRelationship = async (
    input: unknown,
): Promise<ProfessionalActionResult> => {
    const user = await getCurrentUser();
    const parsed = z
        .object({ relationshipId: z.string().uuid() })
        .safeParse(input);
    if (!user) {
        return { error: 'unauthorized', ok: false };
    }
    if (!parsed.success) {
        return { error: 'invalid', ok: false };
    }

    try {
        await removeProfessional({
            relationshipId: parsed.data.relationshipId,
            userId: user.id,
        });
        revalidatePath('/connections');
        revalidatePath('/professional');
        return { ok: true };
    } catch (error) {
        return actionError(error);
    }
};
