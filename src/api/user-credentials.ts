import { eq } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { userCredentials, userRoles, users } from '~db/schema';

type CredentialsUser = {
    email: string;
    fullName: string;
    id: number;
    language: string;
    passwordHash: string;
};

export const fetchUserCredentials = async ({
    email,
}: {
    email: string;
}): Promise<CredentialsUser | null> =>
    (
        await getDb()
            .select({
                email: users.email,
                fullName: users.full_name,
                id: users.id,
                language: users.language,
                passwordHash: userCredentials.password_hash,
            })
            .from(users)
            .innerJoin(userCredentials, eq(userCredentials.user_id, users.id))
            .where(eq(users.email, email))
            .limit(1)
    )[0] ?? null;

export const createCredentialsUser = async ({
    email,
    fullName,
    passwordHash,
    professional = false,
}: {
    email: string;
    fullName: string;
    passwordHash: string;
    professional?: boolean;
}): Promise<{ id: number }> =>
    getDb().transaction(async (transaction) => {
        const [user] = await transaction
            .insert(users)
            .values({
                email,
                full_name: fullName,
                is_discoverable: professional,
                language: 'en',
            })
            .returning({ id: users.id });
        if (!user) {
            throw new Error('Could not create user');
        }

        await transaction
            .insert(userCredentials)
            .values({ password_hash: passwordHash, user_id: user.id });
        if (professional) {
            await transaction
                .insert(userRoles)
                .values({ role: 'professional', user_id: user.id });
        }
        return user;
    });
