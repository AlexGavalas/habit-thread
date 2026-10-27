import { revalidatePath } from 'next/cache';

import { fetchMeals, saveMeals } from '~api/meal';
import { canAccessMealPlan } from '~api/professional';
import { porridge } from '~test/meal-plan';
import { type Meal } from '~types/meal';

import { copyMealPlanWeek, saveMealOperation } from './meal-mutation-actions';

jest.unmock('./meal-mutation-actions');
jest.mock('next/cache');
jest.mock('~api/meal');
jest.mock('~api/copy-meal-week');
jest.mock('~api/professional');
jest.mock('~api/session', () => ({
    getCurrentUser: jest.fn().mockResolvedValue({ id: 7 }),
}));

const mockDb = { execute: jest.fn().mockResolvedValue(undefined) };
const mockTransaction = jest.fn(
    async (operation: (db: typeof mockDb) => Promise<{ data: Meal[] }>) =>
        operation(mockDb),
);
jest.mock('~db', () => ({
    getDb: (): { transaction: typeof mockTransaction } => ({
        transaction: mockTransaction,
    }),
}));

const input = {
    deletedIds: [],
    editedMeals: [],
    newMeals: [{ ...porridge, id: undefined }],
    ownerUserId: 7,
    weekStart: '2026-01-12',
};

describe('immediate meal server actions', () => {
    beforeEach(() => {
        jest.mocked(canAccessMealPlan).mockResolvedValue(true);
        jest.mocked(fetchMeals).mockResolvedValue({ data: [porridge] });
    });

    it('makes a repeated create update the existing slot and returns canonical meals', async () => {
        expect.hasAssertions();
        await expect(saveMealOperation(input)).resolves.toStrictEqual({
            meals: [porridge],
            ok: true,
        });
        expect(saveMeals).toHaveBeenCalledWith(
            expect.objectContaining({
                allowAnnotations: true,
                editedMeals: [porridge],
                newMeals: [],
                userId: 7,
            }),
        );
    });

    it('rejects unauthorized personal and delegated writes before accessing meals', async () => {
        expect.hasAssertions();
        jest.mocked(canAccessMealPlan).mockResolvedValue(false);
        await expect(
            saveMealOperation({ ...input, ownerUserId: 42 }),
        ).resolves.toStrictEqual({
            ok: false,
            reason: 'unauthorized',
        });
        await expect(
            copyMealPlanWeek({ ownerUserId: 42, sourceWeek: '2026-01-12' }),
        ).resolves.toStrictEqual({ ok: false });
        expect(saveMeals).not.toHaveBeenCalled();
    });

    it('never persists client annotations on delegated writes', async () => {
        expect.hasAssertions();
        await saveMealOperation({ ...input, ownerUserId: 42 });
        expect(saveMeals).toHaveBeenCalledWith(
            expect.objectContaining({
                allowAnnotations: false,
                userId: 42,
            }),
        );
    });

    it('propagates unexpected failures without reporting a successful save', async () => {
        expect.hasAssertions();
        jest.mocked(saveMeals).mockRejectedValueOnce(
            new Error('Database unavailable'),
        );
        await expect(saveMealOperation(input)).rejects.toThrow(
            'Database unavailable',
        );
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
