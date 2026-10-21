import { type EditedMeal, type MealsMap } from '~types/meal';

import { getMealPlanChanges, swapMealSlots } from './meal-operations';

const source = { day: '2026-01-12', sectionKey: 'monday-lunch' };
const destination = { day: '2026-01-13', sectionKey: 'tuesday-dinner' };
const third = { day: '2026-01-14', sectionKey: 'wednesday-breakfast' };
const porridge: EditedMeal = {
    day: source.day,
    id: 'porridge-id',
    items: [
        {
            basis_grams: 100,
            name: 'Oats',
            position: 0,
            provider_food_id: 'oats',
            quantity_grams: 80,
            source: 'bls',
        },
    ],
    meal: 'Porridge',
    note: 'Oat milk',
    rating: 5,
    section_key: source.sectionKey,
    user_id: 7,
};
const soup: EditedMeal = {
    ...porridge,
    day: destination.day,
    id: 'soup-id',
    items: [],
    meal: 'Soup',
    note: 'No salt',
    rating: 4,
    section_key: destination.sectionKey,
};
const meals: MealsMap = {
    [source.sectionKey]: porridge,
    [destination.sectionKey]: soup,
};

describe('meal swaps', () => {
    it('exchanges complete records and assigns destination dates and slot keys', () => {
        const changes = swapMealSlots({
            changes: {},
            destination,
            meals,
            source,
            userId: 7,
        });
        expect(changes).toStrictEqual({
            [source.sectionKey]: {
                ...soup,
                day: source.day,
                section_key: source.sectionKey,
            },
            [destination.sectionKey]: {
                ...porridge,
                day: destination.day,
                section_key: destination.sectionKey,
            },
        });
        expect(getMealPlanChanges(changes, 7)).toStrictEqual({
            deletedIds: [],
            editedMeals: Object.values(changes),
            newMeals: [],
            ownerUserId: 7,
        });
    });

    it('moves to an empty slot without deleting or recreating the saved meal', () => {
        const changes = swapMealSlots({
            changes: {},
            destination: third,
            meals,
            source,
            userId: 7,
        });
        expect(changes[source.sectionKey]?.meal).toBe('');
        expect(getMealPlanChanges(changes, 7)).toStrictEqual({
            deletedIds: [],
            editedMeals: [
                { ...porridge, day: third.day, section_key: third.sectionKey },
            ],
            newMeals: [],
            ownerUserId: 7,
        });
    });

    it('uses unsaved edits and the results of earlier swaps', () => {
        const edited = { ...porridge, meal: 'Banana porridge' };
        const first = swapMealSlots({
            changes: { [source.sectionKey]: edited },
            destination,
            meals,
            source,
            userId: 7,
        });
        const second = swapMealSlots({
            changes: first,
            destination: third,
            meals,
            source: destination,
            userId: 7,
        });
        expect(second[third.sectionKey]).toMatchObject({
            id: porridge.id,
            items: porridge.items,
            meal: 'Banana porridge',
        });
        expect(second[source.sectionKey]?.id).toBe(soup.id);
        expect(getMealPlanChanges(second, 7).deletedIds).toStrictEqual([]);
    });

    it('preserves a pending deletion when moving into its empty slot', () => {
        const changes = swapMealSlots({
            changes: { [destination.sectionKey]: { ...soup, meal: '' } },
            destination,
            meals,
            source,
            userId: 7,
        });
        expect(getMealPlanChanges(changes, 7)).toStrictEqual({
            deletedIds: [soup.id],
            editedMeals: [
                {
                    ...porridge,
                    day: destination.day,
                    section_key: destination.sectionKey,
                },
            ],
            newMeals: [],
            ownerUserId: 7,
        });
    });

    it('moves a new draft and deletes it without inserting empty records', () => {
        const { id: _id, ...draft } = porridge;
        const changes = swapMealSlots({
            changes: { [source.sectionKey]: draft },
            destination: third,
            meals: {},
            source,
            userId: 7,
        });
        const moved = changes[third.sectionKey];
        expect(getMealPlanChanges(changes, 7).newMeals).toStrictEqual([moved]);
        expect(
            getMealPlanChanges(
                {
                    ...changes,
                    [third.sectionKey]: {
                        ...draft,
                        day: third.day,
                        meal: '',
                        section_key: third.sectionKey,
                    },
                },
                7,
            ),
        ).toStrictEqual({
            deletedIds: [],
            editedMeals: [],
            newMeals: [],
            ownerUserId: 7,
        });
    });

    it('does nothing for the same slot or an empty or deleted source', () => {
        const changes = { [source.sectionKey]: { ...porridge, meal: '' } };
        expect(
            swapMealSlots({
                changes,
                destination,
                meals,
                source,
                userId: 7,
            }),
        ).toBe(changes);
        expect(
            swapMealSlots({
                changes: {},
                destination: source,
                meals,
                source,
                userId: 7,
            }),
        ).toStrictEqual({});
        expect(
            swapMealSlots({
                changes: {},
                destination,
                meals: {},
                source,
                userId: 7,
            }),
        ).toStrictEqual({});
    });
});
