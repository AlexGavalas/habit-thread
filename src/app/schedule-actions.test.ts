import { revalidatePath } from 'next/cache';

import { ProfessionalError, requireMealPlanAccess } from '~api/professional';
import { saveScheduleTemplate } from '~api/save-schedule-template';
import { getCurrentUser, getRequestDate } from '~api/session';
import { saveDayMealZones } from '~api/weekly-meal-zone';
import { testUser } from '~test/user';
import { ScheduleConflictError } from '~util/schedule-result';

import { saveDaySchedule, saveDefaultSchedule } from './schedule-actions';

jest.unmock('./schedule-actions');
jest.mock('next/cache');
jest.mock('~api/professional', () => ({
    ...jest.requireActual<typeof import('~api/professional')>(
        '~api/professional',
    ),
    requireMealPlanAccess: jest.fn(),
}));
jest.mock('~api/save-schedule-template');
jest.mock('~api/weekly-meal-zone');
jest.mock('~api/session', () => ({
    getCurrentUser: jest.fn(),
    getRequestDate: jest.fn(),
}));

const defaultInput = {
    effectiveFrom: '2026-01-19',
    ownerUserId: 42,
    template: {
        kind: 'daily',
        slots: [{ key: 'morning', label: 'Breakfast', time: '08:00' }],
    },
};
const dayInput = {
    day: '2026-01-14',
    ownerUserId: 42,
    zones: [
        {
            day: '2026-01-14',
            label: 'Breakfast',
            position: 0,
            time: '10:00',
            weekStart: '2026-01-12',
            zoneKey: 'morning_Wed 14/01/2026',
        },
    ],
};

describe('schedule actions', () => {
    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
        jest.mocked(getRequestDate).mockResolvedValue(
            new Date('2026-01-12T12:00:00Z'),
        );
        jest.mocked(requireMealPlanAccess).mockResolvedValue(undefined);
        jest.mocked(saveScheduleTemplate).mockResolvedValue(undefined);
        jest.mocked(saveDayMealZones).mockResolvedValue(undefined);
    });

    it.each([saveDefaultSchedule, saveDaySchedule])(
        'rejects unauthenticated writes (%#)',
        async (save) => {
            expect.hasAssertions();
            jest.mocked(getCurrentUser).mockResolvedValue(null);
            await expect(save(defaultInput)).resolves.toStrictEqual({
                ok: false,
                reason: 'unauthorized',
            });
            expect(saveScheduleTemplate).not.toHaveBeenCalled();
            expect(saveDayMealZones).not.toHaveBeenCalled();
            expect(revalidatePath).not.toHaveBeenCalled();
        },
    );

    it.each([
        [saveDefaultSchedule, { ...defaultInput, effectiveFrom: '2026-01-12' }],
        [
            saveDefaultSchedule,
            { ...defaultInput, template: { kind: 'daily', slots: [] } },
        ],
        [saveDaySchedule, { ...dayInput, day: '2026-01-15' }],
        [
            saveDaySchedule,
            {
                ...dayInput,
                zones: [{ ...dayInput.zones[0], weekStart: '2026-01-19' }],
            },
        ],
        [
            saveDaySchedule,
            { ...dayInput, zones: [{ ...dayInput.zones[0], position: 1 }] },
        ],
    ])(
        'rejects malformed or incorrectly scoped input (%#)',
        async (save, input) => {
            expect.hasAssertions();
            await expect(save(input)).resolves.toStrictEqual({
                ok: false,
                reason: 'invalid',
            });
            expect(saveScheduleTemplate).not.toHaveBeenCalled();
            expect(saveDayMealZones).not.toHaveBeenCalled();
            expect(revalidatePath).not.toHaveBeenCalled();
        },
    );

    it('authorizes the actor separately from the target owner before saving a default', async () => {
        expect.hasAssertions();
        await expect(saveDefaultSchedule(defaultInput)).resolves.toStrictEqual({
            ok: true,
        });
        expect(requireMealPlanAccess).toHaveBeenCalledWith({
            actorUserId: testUser.id,
            ownerUserId: 42,
        });
        expect(saveScheduleTemplate).toHaveBeenCalledWith({
            effectiveFrom: '2026-01-19',
            template: defaultInput.template,
            userId: 42,
        });
        expect(revalidatePath).toHaveBeenCalledWith('/home');
        expect(revalidatePath).toHaveBeenCalledWith('/meal-plan');
    });

    it('saves and resets only the authorized date', async () => {
        expect.hasAssertions();
        await expect(saveDaySchedule(dayInput)).resolves.toStrictEqual({
            ok: true,
        });
        expect(saveDayMealZones).toHaveBeenCalledWith({
            day: '2026-01-14',
            userId: 42,
            weekStart: '2026-01-12',
            zones: dayInput.zones,
        });
        await expect(
            saveDaySchedule({ ...dayInput, zones: null }),
        ).resolves.toStrictEqual({ ok: true });
        expect(saveDayMealZones).toHaveBeenLastCalledWith({
            day: '2026-01-14',
            userId: 42,
            weekStart: '2026-01-12',
            zones: null,
        });
    });

    it('rejects unauthorized owners without writes or invalidation', async () => {
        expect.hasAssertions();
        jest.mocked(requireMealPlanAccess).mockRejectedValue(
            new ProfessionalError('forbidden'),
        );
        await expect(saveDefaultSchedule(defaultInput)).resolves.toStrictEqual({
            ok: false,
            reason: 'forbidden',
        });
        await expect(saveDaySchedule(dayInput)).resolves.toStrictEqual({
            ok: false,
            reason: 'forbidden',
        });
        expect(saveScheduleTemplate).not.toHaveBeenCalled();
        expect(saveDayMealZones).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('returns occupied-slot conflicts without invalidation', async () => {
        expect.hasAssertions();
        jest.mocked(saveScheduleTemplate).mockRejectedValue(
            new ScheduleConflictError(['2026-01-20']),
        );
        await expect(saveDefaultSchedule(defaultInput)).resolves.toStrictEqual({
            days: ['2026-01-20'],
            ok: false,
            reason: 'schedule_conflict',
        });
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('propagates unexpected failures without invalidation', async () => {
        expect.hasAssertions();
        jest.mocked(saveDayMealZones).mockRejectedValue(
            new Error('Database unavailable'),
        );
        await expect(saveDaySchedule(dayInput)).rejects.toThrow(
            'Database unavailable',
        );
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
