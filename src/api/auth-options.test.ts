import type { AuthOptions } from 'next-auth';

const mockCreateGoogleUser = jest.fn().mockResolvedValue(undefined);
jest.mock('~api/user-signup', () => ({
    createGoogleUser: (...args: unknown[]): unknown =>
        mockCreateGoogleUser(...args),
}));

let authOptions: AuthOptions;

describe('sign-in provenance dispatch', () => {
    const originalGoogleId = process.env.GOOGLE_ID;
    const originalGoogleSecret = process.env.GOOGLE_SECRET;

    beforeAll(async () => {
        process.env.GOOGLE_ID = 'test-client';
        process.env.GOOGLE_SECRET = 'test-secret';
        ({ authOptions } = await import('./auth-options'));
    });

    afterAll(() => {
        if (originalGoogleId === undefined) {
            delete process.env.GOOGLE_ID;
        } else {
            process.env.GOOGLE_ID = originalGoogleId;
        }
        if (originalGoogleSecret === undefined) {
            delete process.env.GOOGLE_SECRET;
        } else {
            process.env.GOOGLE_SECRET = originalGoogleSecret;
        }
    });

    it.each(['credentials', 'other'])(
        'does not create users or provenance for %s sign-ins',
        async (provider) => {
            expect.hasAssertions();
            await authOptions.events?.signIn?.({
                account: {
                    provider,
                    providerAccountId: '7',
                    type: 'credentials',
                },
                user: { email: 'user@example.com', id: '7', name: 'User' },
            });
            expect(mockCreateGoogleUser).not.toHaveBeenCalled();
        },
    );

    it('dispatches Google sign-ins to the insertion-aware writer', async () => {
        expect.hasAssertions();
        await authOptions.events?.signIn?.({
            account: {
                provider: 'google',
                providerAccountId: 'google-subject',
                type: 'oauth',
            },
            user: {
                email: 'user@example.com',
                id: 'google-subject',
                locale: 'de',
                name: 'User',
            },
        });
        expect(mockCreateGoogleUser).toHaveBeenCalledWith({
            email: 'user@example.com',
            fullName: 'User',
            language: 'de',
        });
    });
});
