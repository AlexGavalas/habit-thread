import { revalidatePath } from 'next/cache';

import { acceptConnectionRequest as acceptRequest } from '~api/connection';
import { saveMeals } from '~api/meal';
import { saveMealPlanChanges } from '~api/meal-plan';
import { getCurrentUser } from '~api/session';
import { updateProfile } from '~api/user';
import { testUser } from '~test/user';

import { acceptConnectionRequest, saveMealPlan, saveProfile } from './actions';

jest.unmock('./actions');
jest.mock('next/cache');
jest.mock('~api/connection');
jest.mock('~api/meal');
jest.mock('~api/meal-plan');
jest.mock('~api/professional');
jest.mock('~api/session', () => ({
    getCurrentUser: jest.fn(),
}));
jest.mock('~api/user');

describe('server actions', () => {
    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
        jest.mocked(saveMealPlanChanges).mockResolvedValue({
            ok: false,
            reason: 'invalid',
        });
    });

    it.each([
        (): Promise<{ ok: boolean }> =>
            saveMealPlan({ deletedIds: [], editedMeals: [], newMeals: [] }),
        (): Promise<{ ok: boolean }> => saveProfile({ height: 180 }),
        (): Promise<{ ok: boolean }> =>
            acceptConnectionRequest('aa6787bf-7452-4b54-b3c5-0d5588e7a558'),
    ])('rejects unauthenticated mutations (%#)', async (action) => {
        expect.hasAssertions();

        jest.mocked(getCurrentUser).mockResolvedValue(null);

        await expect(action()).resolves.toStrictEqual({
            ok: false,
            reason: 'unauthorized',
        });

        expect([
            jest.mocked(saveMeals).mock.calls,
            jest.mocked(updateProfile).mock.calls,
            jest.mocked(acceptRequest).mock.calls,
        ]).toStrictEqual([[], [], []]);
    });

    it('rejects malformed input before writing', async () => {
        expect.hasAssertions();

        const results = await Promise.all([
            saveMealPlan({ newMeals: 'invalid' }),
            saveProfile({ height: 'invalid' }),
        ]);

        expect(results).toStrictEqual([
            { ok: false, reason: 'invalid' },
            { ok: false, reason: 'invalid' },
        ]);

        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('passes the request id and authenticated recipient to acceptance', async () => {
        expect.hasAssertions();

        const requestId = 'aa6787bf-7452-4b54-b3c5-0d5588e7a558';

        await expect(acceptConnectionRequest(requestId)).resolves.toStrictEqual(
            { ok: true },
        );

        expect(acceptRequest).toHaveBeenCalledWith({ requestId, userId: 7 });
    });
});
