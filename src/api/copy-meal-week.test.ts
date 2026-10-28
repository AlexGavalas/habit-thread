import { createMeals, fetchMeals } from '~api/meal';
import {
    fetchWeeklyMealZones,
    saveWeeklyMealZones,
} from '~api/weekly-meal-zone';

import { copyMealWeek } from './copy-meal-week';

const mockWhere = jest.fn().mockResolvedValue(undefined);
const mockTransaction = {
    delete: jest.fn(() => ({ where: mockWhere })),
    execute: jest.fn().mockResolvedValue(undefined),
};
const mockRunTransaction = jest.fn(
    async (operation: (db: typeof mockTransaction) => Promise<void>) => {
        await operation(mockTransaction);
    },
);

jest.mock('~db', () => ({
    getDb: (): { transaction: typeof mockRunTransaction } => ({
        transaction: mockRunTransaction,
    }),
}));
jest.mock('~api/meal');
jest.mock('~api/weekly-meal-zone');

describe('atomic week copy', () => {
    beforeEach(() => {
        jest.mocked(fetchWeeklyMealZones).mockResolvedValue([
            {
                day: '2026-01-12',
                label: 'Custom breakfast',
                position: 0,
                time: '08:00',
                weekStart: '2026-01-12',
                zoneKey: 'custom-uuid',
            },
        ]);
        jest.mocked(fetchMeals).mockResolvedValue({
            data: [
                {
                    day: '2026-01-12',
                    id: 'meal-id',
                    meal: 'Porridge',
                    note: 'Oat milk',
                    rating: 5,
                    section_key: 'custom-uuid',
                    user_id: 7,
                },
            ],
        });
    });

    it('maps custom slot keys and saves the schedule and meals in one transaction', async () => {
        expect.hasAssertions();
        await copyMealWeek({
            allowAnnotations: true,
            sourceWeek: '2026-01-12',
            userId: 7,
        });
        const savedZones =
            jest.mocked(saveWeeklyMealZones).mock.calls[0]?.[0].zones;
        const savedMeals = jest.mocked(createMeals).mock.calls[0]?.[0].newMeals;
        expect(savedZones).toStrictEqual([
            expect.objectContaining({
                day: '2026-01-19',
                weekStart: '2026-01-19',
                zoneKey: expect.any(String),
            }),
        ]);
        expect(savedMeals).toStrictEqual([
            expect.objectContaining({
                day: '2026-01-19',
                note: 'Oat milk',
                section_key: savedZones?.[0]?.zoneKey,
            }),
        ]);
        expect(createMeals).toHaveBeenCalledWith(
            expect.objectContaining({ db: mockTransaction }),
        );
    });

    it('propagates insert failures so the enclosing transaction rolls back', async () => {
        expect.hasAssertions();
        jest.mocked(createMeals).mockRejectedValueOnce(
            new Error('Insert failed'),
        );
        await expect(
            copyMealWeek({
                allowAnnotations: false,
                sourceWeek: '2026-01-12',
                userId: 7,
            }),
        ).rejects.toThrow('Insert failed');
        expect(createMeals).toHaveBeenCalledWith(
            expect.objectContaining({
                allowAnnotations: false,
                db: mockTransaction,
            }),
        );
    });
});
