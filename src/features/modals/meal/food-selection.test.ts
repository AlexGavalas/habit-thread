import { type FoodSearchResult } from '~types/food-search';
import { foodToMealItem } from '~util/nutrition';

import { isFoodSelected } from './food-selection';

const food: FoodSearchResult = {
    alternativeName: null,
    brand: null,
    id: 'oats',
    name: 'Oats',
    nutrition: {
        calories: 350,
        carbohydrates: 60,
        fat: 7,
        fiber: 10,
        protein: 13,
        salt: 0,
        sugar: 1,
    },
    quantity: null,
    source: 'bls',
};
const selected = foodToMealItem(food, 0);

describe('isFoodSelected', () => {
    it('identifies selected foods by provider and ID rather than display name', () => {
        expect(
            isFoodSelected({ ...food, name: 'Renamed oats' }, [selected]),
        ).toBe(true);
        expect(isFoodSelected({ ...food, id: 'other-oats' }, [selected])).toBe(
            false,
        );
        expect(
            isFoodSelected({ ...food, source: 'open-food-facts' }, [selected]),
        ).toBe(false);
    });

    it('makes foods available again after the last matching selection is removed', () => {
        expect(
            isFoodSelected(food, [selected, { ...selected, position: 1 }]),
        ).toBe(true);
        expect(isFoodSelected(food, [{ ...selected, position: 1 }])).toBe(true);
        expect(isFoodSelected(food, [])).toBe(false);
    });
});
