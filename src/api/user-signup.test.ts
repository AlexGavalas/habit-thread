import { userCredentials, users, userSignupOrigins } from '~db/schema';

import { createCredentialsUser } from './user-credentials';
import { createGoogleUser, fetchUserSignupInfo } from './user-signup';

const mockReturning = jest.fn<Promise<{ id: number }[]>, []>();
const mockOriginWrite = jest.fn<Promise<void>, []>();
const mockCredentialWrite = jest.fn<Promise<void>, []>();
const mockValues = jest.fn();
const mockSet = jest.fn(() => ({
    where: jest.fn().mockResolvedValue(undefined),
}));
const mockLimit = jest.fn<
    Promise<
        {
            credentialsUserId: number | null;
            signupMethod: 'password' | 'google' | null;
        }[]
    >,
    []
>();
const mockQuery = {
    leftJoin: jest.fn(),
    limit: mockLimit,
    where: jest.fn(),
};
const mockDb = {
    insert: jest.fn((table: unknown) => ({
        values: (values: unknown): unknown => {
            mockValues(table, values);
            if (table === userSignupOrigins) {
                return mockOriginWrite();
            }
            if (table === userCredentials) {
                return mockCredentialWrite();
            }
            return {
                onConflictDoNothing: jest.fn(() => ({
                    returning: mockReturning,
                })),
                returning: mockReturning,
            };
        },
    })),
    select: jest.fn(() => ({ from: jest.fn(() => mockQuery) })),
    update: jest.fn(() => ({ set: mockSet })),
};

type MockDb = typeof mockDb & {
    transaction: (
        operation: (tx: typeof mockDb) => Promise<unknown>,
    ) => Promise<unknown>;
};

jest.mock('~db', () => ({
    getDb: (): MockDb => ({
        ...mockDb,
        transaction: async (
            operation: (tx: typeof mockDb) => Promise<unknown>,
        ): Promise<unknown> => operation(mockDb),
    }),
}));

const googleUser = {
    email: 'new@example.com',
    fullName: 'New user',
    language: 'en',
};

describe('signup tracking', () => {
    beforeEach(() => {
        mockReturning.mockResolvedValue([{ id: 7 }]);
        mockOriginWrite.mockResolvedValue(undefined);
        mockCredentialWrite.mockResolvedValue(undefined);
        mockLimit.mockResolvedValue([]);
        mockQuery.leftJoin.mockReturnValue(mockQuery);
        mockQuery.where.mockReturnValue(mockQuery);
    });

    describe('signup provenance writes', () => {
        it('records Google only when a new user was inserted', async () => {
            expect.hasAssertions();
            await createGoogleUser(googleUser);
            expect(mockValues).toHaveBeenCalledWith(userSignupOrigins, {
                method: 'google',
                user_id: 7,
            });
            expect(mockDb.update).not.toHaveBeenCalled();
        });

        it('never assigns or overwrites provenance on an email conflict', async () => {
            expect.hasAssertions();
            mockReturning.mockResolvedValue([]);
            await createGoogleUser(googleUser);
            expect(mockOriginWrite).not.toHaveBeenCalled();
            expect(mockDb.update).toHaveBeenCalledWith(users);
            expect(mockSet).toHaveBeenCalledWith({
                full_name: googleUser.fullName,
                language: googleUser.language,
            });
        });

        it('creates password provenance together with password credentials', async () => {
            expect.hasAssertions();
            await expect(
                createCredentialsUser({
                    email: googleUser.email,
                    fullName: googleUser.fullName,
                    passwordHash: 'test-hash',
                }),
            ).resolves.toStrictEqual({ id: 7 });
            expect(mockValues).toHaveBeenCalledWith(userSignupOrigins, {
                method: 'password',
                user_id: 7,
            });
            expect(mockValues).toHaveBeenCalledWith(userCredentials, {
                password_hash: 'test-hash',
                user_id: 7,
            });
        });

        it('does not record password provenance if credential creation fails', async () => {
            expect.hasAssertions();
            mockCredentialWrite.mockRejectedValueOnce(
                new Error('Write failed'),
            );
            await expect(
                createCredentialsUser({
                    email: googleUser.email,
                    fullName: googleUser.fullName,
                    passwordHash: 'test-hash',
                }),
            ).rejects.toThrow('Write failed');
            expect(mockOriginWrite).not.toHaveBeenCalled();
        });

        it('propagates provenance write failures to the transaction', async () => {
            expect.hasAssertions();
            mockOriginWrite.mockRejectedValueOnce(new Error('Write failed'));
            await expect(createGoogleUser(googleUser)).rejects.toThrow(
                'Write failed',
            );
        });
    });

    describe('internal signup lookup', () => {
        it.each([
            { credentialsUserId: 7, hasPasswordCredentials: true },
            { credentialsUserId: null, hasPasswordCredentials: false },
        ])(
            'keeps legacy provenance unknown with password credentials = $hasPasswordCredentials',
            async ({ credentialsUserId, hasPasswordCredentials }) => {
                expect.hasAssertions();
                mockLimit.mockResolvedValue([
                    {
                        credentialsUserId,
                        signupMethod: null,
                    },
                ]);
                await expect(
                    fetchUserSignupInfo({ userId: 7 }),
                ).resolves.toStrictEqual({
                    hasPasswordCredentials,
                    signupMethod: 'unknown',
                });
            },
        );

        it.each(['password', 'google'] as const)(
            'returns recorded %s provenance independently of credentials',
            async (signupMethod) => {
                expect.hasAssertions();
                mockLimit.mockResolvedValue([
                    { credentialsUserId: null, signupMethod },
                ]);
                await expect(
                    fetchUserSignupInfo({ userId: 7 }),
                ).resolves.toStrictEqual({
                    hasPasswordCredentials: false,
                    signupMethod,
                });
            },
        );

        it('returns null for a nonexistent user', async () => {
            expect.hasAssertions();
            await expect(
                fetchUserSignupInfo({ userId: 7 }),
            ).resolves.toBeNull();
        });

        it('does not disguise read failures as unknown provenance', async () => {
            expect.hasAssertions();
            mockLimit.mockRejectedValueOnce(new Error('Read failed'));
            await expect(fetchUserSignupInfo({ userId: 7 })).rejects.toThrow(
                'Read failed',
            );
        });
    });
});
