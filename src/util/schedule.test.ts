import { parseISO } from 'date-fns';

import {
    scheduleTemplateSchema,
    type ScheduleTemplate,
} from '~schemas/schedule-template';
import { type WeeklyMealZone } from '~types/meal-zone';

import {
    findScheduleZone,
    getNextScheduleStart,
    resolveWeekSchedule,
} from './schedule';

const template: ScheduleTemplate = {
    kind: 'daily',
    slots: [{ key: 'morning', label: 'Breakfast', time: '08:00' }],
};
const override: WeeklyMealZone = {
    day: '2026-01-14',
    label: 'Late breakfast',
    position: 0,
    time: '10:00',
    weekStart: '2026-01-12',
    zoneKey: 'custom-wednesday',
};

describe('schedule inheritance', () => {
    it('matches explicit custom slot links instead of the first slot without a translation key', () => {
        const second = {
            ...override,
            label: 'Dinner',
            zoneKey: 'custom-dinner',
        };
        expect(
            findScheduleZone([override, second], {
                day: override.day,
                slotKey: 'custom-dinner',
            }),
        ).toBe(second);
        expect(
            findScheduleZone([override], { day: override.day }),
        ).toBeUndefined();
    });

    it('keeps legacy links working after a slot is renamed', () => {
        const renamed = { ...override, zoneKey: 'morning_Wed 14/01/2026' };
        expect(
            findScheduleZone([renamed], {
                day: override.day,
                mealZone: 'morning',
            }),
        ).toBe(renamed);
    });

    it.each([
        ['2026-01-12', '2026-01-19'],
        ['2026-01-18', '2026-01-19'],
        ['2026-01-19', '2026-01-26'],
        ['2026-12-31', '2027-01-04'],
    ])('starts changes made on %s on %s', (today, expected) => {
        expect(getNextScheduleStart(parseISO(today))).toBe(expected);
    });

    it('overrides only the selected day and preserves legacy meal attachment keys', () => {
        const resolved = resolveWeekSchedule(parseISO('2026-01-12'), template, [
            override,
        ]);
        expect(resolved).toHaveLength(7);
        expect(resolved[0]).toMatchObject({
            day: '2026-01-12',
            isOverride: false,
            time: '08:00',
            zoneKey: 'morning_Mon 12/01/2026',
        });
        expect(resolved[2]).toStrictEqual({ ...override, isOverride: true });
        expect(resolved[3]).toMatchObject({ isOverride: false, time: '08:00' });
    });

    it('updates inherited days without changing a custom day or slot identities', () => {
        const before = resolveWeekSchedule(parseISO('2026-01-12'), template, [
            override,
        ]);
        const after = resolveWeekSchedule(
            parseISO('2026-01-12'),
            {
                kind: 'daily',
                slots: [
                    { key: 'morning', label: 'Early breakfast', time: '07:00' },
                ],
            },
            [override],
        );
        expect(after.map(({ zoneKey }) => zoneKey)).toStrictEqual(
            before.map(({ zoneKey }) => zoneKey),
        );
        expect(after[2]).toStrictEqual(before[2]);
        expect(after[0]).toMatchObject({
            label: 'Early breakfast',
            time: '07:00',
        });
    });

    it('resetting removes the override and restores inheritance', () => {
        expect(
            resolveWeekSchedule(parseISO('2026-01-12'), template, [])[2],
        ).toMatchObject({
            day: '2026-01-14',
            isOverride: false,
            label: 'Breakfast',
            time: '08:00',
        });
    });

    it.each([
        { kind: 'daily', slots: [] },
        { kind: 'weekly', slots: template.slots },
        {
            kind: 'daily',
            slots: [{ key: 'invalid_key', label: 'Meal', time: '08:00' }],
        },
        { kind: 'daily', slots: [{ key: 'one', label: ' ', time: '08:00' }] },
        {
            kind: 'daily',
            slots: [{ key: 'one', label: 'Meal', time: '24:00' }],
        },
        {
            kind: 'daily',
            slots: [
                { key: 'one', label: 'Meal', time: '08:00' },
                { key: 'two', label: 'Meal', time: '08:00' },
            ],
        },
        {
            kind: 'daily',
            slots: [
                { key: 'one', label: 'Meal', time: '08:00' },
                { key: 'one', label: 'Meal', time: '09:00' },
            ],
        },
    ])('rejects invalid templates (%#)', (input) => {
        expect(scheduleTemplateSchema.safeParse(input).success).toBe(false);
    });
});
