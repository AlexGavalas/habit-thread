import { eq } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { userCredentials, users, userSignupOrigins } from '~db/schema';

type SignupMethod = typeof userSignupOrigins.$inferSelect.method;

export type UserSignupInfo = {
    hasPasswordCredentials: boolean;
    signupMethod: SignupMethod | 'unknown';
};

// Internal lookup only. This is not a Server Action or an authorization rule.
export const fetchUserSignupInfo = async ({
    userId,
}: {
    userId: number;
}): Promise<UserSignupInfo | null> => {
    const [row] = await getDb()
        .select({
            credentialsUserId: userCredentials.user_id,
            signupMethod: userSignupOrigins.method,
        })
        .from(users)
        .leftJoin(userSignupOrigins, eq(userSignupOrigins.user_id, users.id))
        .leftJoin(userCredentials, eq(userCredentials.user_id, users.id))
        .where(eq(users.id, userId))
        .limit(1);

    return row
        ? {
              hasPasswordCredentials: row.credentialsUserId !== null,
              signupMethod: row.signupMethod ?? 'unknown',
          }
        : null;
};

export const createGoogleUser = async ({
    email,
    fullName,
    language,
}: {
    email: string;
    fullName: string;
    language: string;
}): Promise<void> => {
    await getDb().transaction(async (tx) => {
        const [created] = await tx
            .insert(users)
            .values({ email, full_name: fullName, language })
            .onConflictDoNothing({ target: users.email })
            .returning({ id: users.id });

        if (created) {
            await tx
                .insert(userSignupOrigins)
                .values({ method: 'google', user_id: created.id });
            return;
        }

        // Preserve existing profile-refresh behavior, but never assign provenance
        // to an existing email. This does not establish a linked Google identity.
        await tx
            .update(users)
            .set({ full_name: fullName, language })
            .where(eq(users.email, email));
    });
};
