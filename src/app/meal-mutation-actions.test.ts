import { revalidatePath } from 'next/cache';

import { fetchMeals, saveMeals } from '~api/meal';
import { canAccessMealPlan } from '~api/professional';
import { getCurrentUser } from '~api/session';
import { fetchWeeklyMealZones } from '~api/weekly-meal-zone';
import { porridge } from '~test/meal-plan';
import { testUser } from '~test/user';
import { type Meal } from '~types/meal';

import { copyMealPlanWeek, saveMealOperation } from './meal-mutation-actions';

jest.unmock('./meal-mutation-actions');
jest.mock('next/cache');
jest.mock('~api/meal');
jest.mock('~api/copy-meal-week');
jest.mock('~api/professional');
jest.mock('~api/weekly-meal-zone');
jest.mock('~api/session', () => ({ getCurrentUser: jest.fn() }));

const mockWhere = jest.fn<Promise<Meal[]>, []>();
const mockDb = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => ({ from: jest.fn(() => ({ where: mockWhere })) })),
};
const mockTransaction = jest.fn(
    async (operation: (db: typeof mockDb) => Promise<unknown>) =>
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
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
        jest.mocked(canAccessMealPlan).mockResolvedValue(true);
        jest.mocked(fetchMeals).mockResolvedValue({ data: [porridge] });
        mockWhere.mockResolvedValue([porridge]);
        jest.mocked(fetchWeeklyMealZones).mockResolvedValue([
            {
                day: porridge.day,
                label: 'Morning',
                position: 0,
                time: '08:00',
                weekStart: '2026-01-12',
                zoneKey: porridge.section_key,
            },
        ]);
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
            reason: 'forbidden',
        });
        await expect(
            copyMealPlanWeek({ ownerUserId: 42, sourceWeek: '2026-01-12' }),
        ).resolves.toStrictEqual({ ok: false, reason: 'forbidden' });
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

    it.each([
        { ...input, newMeals: [{ ...porridge, day: 'invalid' }] },
        { ...input, newMeals: [{ ...porridge, day: '2026-01-19' }] },
        { ...input, newMeals: [porridge, porridge] },
        { ...input, deletedIds: ['not-a-uuid'] },
    ])(
        'rejects malformed or conflicting payloads before writing (%#)',
        async (payload) => {
            expect.hasAssertions();
            await expect(saveMealOperation(payload)).resolves.toStrictEqual({
                ok: false,
                reason: 'invalid',
            });
            expect(saveMeals).not.toHaveBeenCalled();
            expect(revalidatePath).not.toHaveBeenCalled();
        },
    );

    it('rejects an edit to a missing or foreign record', async () => {
        expect.hasAssertions();
        mockWhere.mockResolvedValueOnce([]);
        await expect(
            saveMealOperation({
                ...input,
                editedMeals: [porridge],
                newMeals: [],
            }),
        ).resolves.toStrictEqual({ ok: false, reason: 'invalid' });
        expect(saveMeals).not.toHaveBeenCalled();
    });

    it('rejects a stale slot after its schedule has been replaced', async () => {
        expect.hasAssertions();
        jest.mocked(fetchWeeklyMealZones).mockResolvedValueOnce([]);
        await expect(saveMealOperation(input)).resolves.toStrictEqual({
            ok: false,
            reason: 'invalid',
        });
        expect(saveMeals).not.toHaveBeenCalled();
    });

    it('does not allow a week-scoped delete to reach another week', async () => {
        expect.hasAssertions();
        mockWhere.mockResolvedValueOnce([{ ...porridge, day: '2026-01-19' }]);
        await expect(
            saveMealOperation({
                ...input,
                deletedIds: [porridge.id],
                newMeals: [],
            }),
        ).resolves.toStrictEqual({ ok: false, reason: 'invalid' });
        expect(saveMeals).not.toHaveBeenCalled();
    });
});
