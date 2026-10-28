import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

import { getCurrentUser } from '~api/session';
import { type UserProfile } from '~types/user';

import { withUser } from './session';

jest.mock('next/cache');
jest.mock('~api/session', () => ({
    getCurrentUser: jest.fn(),
}));

const user: UserProfile = {
    created_at: '2024-01-01T00:00:00Z',
    email: 'alex@example.com',
    food_preferences_negative: null,
    food_preferences_positive: null,
    full_name: 'Alex Example',
    has_completed_onboarding: true,
    height: 180,
    id: 7,
    is_discoverable: true,
    language: 'en',
    roles: [],
    target_weight: 75,
};

describe('withUser', () => {
    it('rejects requests without an authenticated user', async () => {
        expect.hasAssertions();

        jest.mocked(getCurrentUser).mockResolvedValue(null);
        const handler = jest.fn(() =>
            Promise.resolve(Response.json({ data: 'ok' })),
        );

        const response = await withUser(handler)(
            new NextRequest('http://localhost/api/v1/meal'),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toStrictEqual({
            message: 'Unauthorized',
        });
        expect(handler).not.toHaveBeenCalled();
    });

    it('passes the user to mutations and invalidates their affected pages', async () => {
        expect.hasAssertions();

        jest.mocked(getCurrentUser).mockResolvedValue(user);
        const handler = jest.fn(() =>
            Promise.resolve(Response.json({ data: 'saved' })),
        );
        const request = new NextRequest('http://localhost/api/v1/measurement', {
            method: 'POST',
        });

        const response = await withUser(handler)(request);

        expect({
            cacheControl: response.headers.get('Cache-Control'),
            handlerCalls: handler.mock.calls,
            revalidationCalls: jest.mocked(revalidatePath).mock.calls,
            status: response.status,
        }).toStrictEqual({
            cacheControl: 'private, no-store',
            handlerCalls: [[{ request, user }]],
            revalidationCalls: [['/home'], ['/meal-plan'], ['/settings']],
            status: 200,
        });
    });
});
