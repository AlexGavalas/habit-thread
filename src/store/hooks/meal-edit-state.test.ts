import { type EditedMeal } from '~types/meal';

import {
    getMealPlanChanges,
    isMealSlotEdited,
    swapMealSlots,
} from './meal-operations';

const source = { day: '2026-01-12', sectionKey: 'monday' };
const destination = { day: '2026-01-13', sectionKey: 'tuesday' };
const meal: EditedMeal = {
    day: source.day,
    meal: 'Porridge',
    section_key: source.sectionKey,
    user_id: 7,
};

describe('meal slot edited indicators', () => {
    it('moves the indicator to an empty destination while retaining the source mask', () => {
        const changes = swapMealSlots({
            changes: { [source.sectionKey]: meal },
            destination,
            meals: {},
            source,
            userId: 7,
        });
        expect({
            destination: isMealSlotEdited(changes, destination.sectionKey),
            source: isMealSlotEdited(changes, source.sectionKey),
        }).toStrictEqual({ destination: true, source: false });
        expect(changes[source.sectionKey]?.meal).toBe('');
        expect(getMealPlanChanges(changes, 7).newMeals).toStrictEqual([
            {
                ...meal,
                day: destination.day,
                section_key: destination.sectionKey,
            },
        ]);
    });

    it('does not mark an emptied source even when it retains a deletion marker', () => {
        const changes = swapMealSlots({
            changes: {
                [destination.sectionKey]: {
                    ...meal,
                    id: 'deleted-id',
                    meal: '',
                },
            },
            destination,
            meals: { [source.sectionKey]: { ...meal, id: 'saved-id' } },
            source,
            userId: 7,
        });
        expect(isMealSlotEdited(changes, source.sectionKey)).toBe(false);
        expect(isMealSlotEdited(changes, destination.sectionKey)).toBe(true);
        expect(getMealPlanChanges(changes, 7).deletedIds).toStrictEqual([
            'deleted-id',
        ]);
    });

    it('shows the indicator on both filled destinations and neither after revert', () => {
        const changes = swapMealSlots({
            changes: {},
            destination,
            meals: {
                [source.sectionKey]: meal,
                [destination.sectionKey]: { ...meal, meal: 'Soup' },
            },
            source,
            userId: 7,
        });
        expect({
            destination: isMealSlotEdited(changes, destination.sectionKey),
            source: isMealSlotEdited(changes, source.sectionKey),
        }).toStrictEqual({ destination: true, source: true });
        expect(isMealSlotEdited({}, source.sectionKey)).toBe(false);
        expect(isMealSlotEdited({}, destination.sectionKey)).toBe(false);
    });
});
