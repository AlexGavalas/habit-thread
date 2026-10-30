import type { Session } from 'next-auth';
import { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import 'server-only';
import invariant from 'tiny-invariant';

import { fetchUserCredentials } from '~api/user';
import { createGoogleUser } from '~api/user-signup';
import { loginSchema } from '~schemas/auth';
import { makeSessionSerializable } from '~util/auth';
import { verifyPassword } from '~util/password';

invariant(process.env.GOOGLE_ID, 'Missing GOOGLE_ID env var');
invariant(process.env.GOOGLE_SECRET, 'Missing GOOGLE_SECRET env var');

type GoogleProfile = {
    sub: string;
    name: string;
    email: string;
    picture: string;
    locale: string;
};

const isGoogleProfile = (profile: unknown): profile is GoogleProfile => {
    if (typeof profile !== 'object' || profile === null) {
        return false;
    }

    const keys = ['sub', 'name', 'email', 'picture'];

    return keys.every((key) => key in profile);
};

export const authOptions: AuthOptions = {
    callbacks: {
        session: ({ session }): Session => makeSessionSerializable(session),
    },
    events: {
        signIn: async ({ account, user }): Promise<void> => {
            if (account?.provider !== 'google' || !user.email || !user.name) {
                return;
            }

            await createGoogleUser({
                email: user.email,
                fullName: user.name,
                language: user.locale ?? 'en',
            });
        },
    },
    providers: [
        CredentialsProvider({
            authorize: async (credentials) => {
                const parsed = loginSchema.safeParse(credentials);

                if (!parsed.success) {
                    return null;
                }

                const user = await fetchUserCredentials({
                    email: parsed.data.email,
                });

                if (
                    !user ||
                    !(await verifyPassword(
                        parsed.data.password,
                        user.passwordHash,
                    ))
                ) {
                    return null;
                }

                return {
                    email: user.email,
                    id: String(user.id),
                    locale: user.language,
                    name: user.fullName,
                };
            },
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            name: 'Email and password',
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
            profile: (
                profile,
            ): {
                email: string;
                id: string;
                image: string;
                locale: string;
                name: string;
            } => {
                if (isGoogleProfile(profile)) {
                    return {
                        email: profile.email,
                        id: profile.sub,
                        image: profile.picture,
                        locale: profile.locale,
                        name: profile.name,
                    };
                }

                throw new Error('Could not parse Google profile');
            },
        }),
    ],
};
