import { revalidatePath } from 'next/cache';

import { saveMealPlanChanges } from '~api/meal-plan';
import { getCurrentUser } from '~api/session';
import { testUser } from '~test/user';

import { saveMealPlan } from './actions';

jest.unmock('./actions');
jest.mock('next/cache');
jest.mock('~api/meal-plan');
jest.mock('~api/session', () => ({
    getCurrentUser: jest.fn(),
    getRequestDate: jest.fn(),
}));

describe('legacy meal plan action', () => {
    const input = {
        deletedIds: [],
        editedMeals: [],
        newMeals: [],
        ownerUserId: 42,
    };

    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
        jest.mocked(saveMealPlanChanges).mockResolvedValue({
            meals: [],
            ok: true,
        });
    });

    it('uses the same operation as immediate edits with the authenticated actor', async () => {
        expect.hasAssertions();
        await expect(saveMealPlan(input)).resolves.toStrictEqual({ ok: true });
        expect(saveMealPlanChanges).toHaveBeenCalledWith(testUser.id, input);
        expect(revalidatePath).toHaveBeenCalledWith('/meal-plan');
    });

    it('preserves expected failure reasons without invalidating pages', async () => {
        expect.hasAssertions();
        jest.mocked(saveMealPlanChanges).mockResolvedValueOnce({
            ok: false,
            reason: 'forbidden',
        });
        await expect(saveMealPlan(input)).resolves.toStrictEqual({
            ok: false,
            reason: 'forbidden',
        });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('propagates unexpected failures without invalidating pages', async () => {
        expect.hasAssertions();
        jest.mocked(saveMealPlanChanges).mockRejectedValueOnce(
            new Error('Database unavailable'),
        );
        await expect(saveMealPlan(input)).rejects.toThrow(
            'Database unavailable',
        );
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
