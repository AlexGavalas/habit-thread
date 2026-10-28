import { and, count, eq, ne, or, sql } from 'drizzle-orm';
import 'server-only';

import { MAX_PROFESSIONAL_CLIENTS } from '~constants/professional';
import { getDb } from '~db';
import { professionalClients, userRoles, users } from '~db/schema';

import { ProfessionalError } from './errors';

export const inviteProfessional = async ({
    clientUserId,
    professionalUserId,
}: {
    clientUserId: number;
    professionalUserId: number;
}): Promise<void> => {
    if (clientUserId === professionalUserId) {
        throw new ProfessionalError('invalid_relationship');
    }
    const db = getDb();
    const [professional] = await db
        .select({ id: users.id })
        .from(userRoles)
        .innerJoin(users, eq(users.id, userRoles.user_id))
        .where(
            and(
                eq(userRoles.user_id, professionalUserId),
                eq(userRoles.role, 'professional'),
                eq(users.is_discoverable, true),
            ),
        )
        .limit(1);
    if (!professional) {
        throw new ProfessionalError('not_professional');
    }
    const [activeRelationship] = await db
        .select({ id: professionalClients.id })
        .from(professionalClients)
        .where(
            and(
                eq(professionalClients.client_user_id, clientUserId),
                eq(professionalClients.status, 'active'),
            ),
        )
        .limit(1);
    if (activeRelationship) {
        throw new ProfessionalError('already_managed');
    }
    await db
        .insert(professionalClients)
        .values({
            client_user_id: clientUserId,
            professional_user_id: professionalUserId,
        })
        .onConflictDoNothing();
};

export const acceptProfessionalInvitation = async ({
    professionalUserId,
    relationshipId,
}: {
    professionalUserId: number;
    relationshipId: string;
}): Promise<void> => {
    await getDb().transaction(async (tx) => {
        await tx.execute(
            sql`SELECT pg_advisory_xact_lock(${professionalUserId})`,
        );
        const [role] = await tx
            .select({ userId: userRoles.user_id })
            .from(userRoles)
            .where(
                and(
                    eq(userRoles.user_id, professionalUserId),
                    eq(userRoles.role, 'professional'),
                ),
            )
            .limit(1);
        if (!role) {
            throw new ProfessionalError('not_professional');
        }
        const [invitation] = await tx
            .select({ clientUserId: professionalClients.client_user_id })
            .from(professionalClients)
            .where(
                and(
                    eq(professionalClients.id, relationshipId),
                    eq(
                        professionalClients.professional_user_id,
                        professionalUserId,
                    ),
                    eq(professionalClients.status, 'pending'),
                ),
            )
            .limit(1);
        if (!invitation) {
            throw new ProfessionalError('invalid_relationship');
        }
        const [{ value: activeClientCount } = { value: 0 }] = await tx
            .select({ value: count() })
            .from(professionalClients)
            .where(
                and(
                    eq(
                        professionalClients.professional_user_id,
                        professionalUserId,
                    ),
                    eq(professionalClients.status, 'active'),
                ),
            );
        if (activeClientCount >= MAX_PROFESSIONAL_CLIENTS) {
            throw new ProfessionalError('capacity_reached');
        }
        const [clientRelationship] = await tx
            .select({ id: professionalClients.id })
            .from(professionalClients)
            .where(
                and(
                    eq(
                        professionalClients.client_user_id,
                        invitation.clientUserId,
                    ),
                    eq(professionalClients.status, 'active'),
                ),
            )
            .limit(1);
        if (clientRelationship) {
            throw new ProfessionalError('already_managed');
        }
        await tx
            .update(professionalClients)
            .set({ accepted_at: new Date().toISOString(), status: 'active' })
            .where(eq(professionalClients.id, relationshipId));
        await tx
            .delete(professionalClients)
            .where(
                and(
                    eq(
                        professionalClients.client_user_id,
                        invitation.clientUserId,
                    ),
                    eq(professionalClients.status, 'pending'),
                    ne(professionalClients.id, relationshipId),
                ),
            );
    });
};

export const removeProfessionalRelationship = async ({
    relationshipId,
    userId,
}: {
    relationshipId: string;
    userId: number;
}): Promise<void> => {
    const [removed] = await getDb()
        .delete(professionalClients)
        .where(
            and(
                eq(professionalClients.id, relationshipId),
                or(
                    eq(professionalClients.client_user_id, userId),
                    eq(professionalClients.professional_user_id, userId),
                ),
            ),
        )
        .returning({ id: professionalClients.id });
    if (!removed) {
        throw new ProfessionalError('invalid_relationship');
    }
};
