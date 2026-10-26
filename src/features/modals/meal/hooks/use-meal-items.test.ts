import { act, renderHook } from '~test/utils';
import { type FoodSearchResult } from '~types/food-search';

import { useMealItems } from './use-meal-items';

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

describe('useMealItems', () => {
    it('adds a food only once even when selection events are repeated', () => {
        const { result } = renderHook(() => useMealItems());
        act(() => {
            result.current.addFood(food);
            result.current.addFood(food);
        });
        expect(result.current.items.map((item) => item.position)).toStrictEqual(
            [0],
        );
        expect(
            result.current.items.map((item) => item.quantity_grams),
        ).toStrictEqual([100]);
        expect(result.current.recentlyAddedIndex).toBe(0);
    });

    it('keeps edited quantities when another food is added', () => {
        const { result } = renderHook(() => useMealItems());
        act(() => {
            result.current.addFood(food);
        });
        act(() => {
            result.current.setItems(
                result.current.items.map((item) => ({
                    ...item,
                    quantity_grams: 150,
                })),
            );
        });
        act(() => {
            result.current.addFood({ ...food, id: 'milk', name: 'Milk' });
        });
        expect(
            result.current.items.map((item) => item.quantity_grams),
        ).toStrictEqual([150, 100]);
    });

    it('allows a removed food to be added again', () => {
        const { result } = renderHook(() => useMealItems());
        act(() => {
            result.current.addFood(food);
        });
        act(() => {
            result.current.setItems([]);
        });
        act(() => {
            result.current.addFood(food);
        });
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0]?.position).toBe(0);
    });

    it('distinguishes the same provider ID in different databases', () => {
        const { result } = renderHook(() => useMealItems());
        act(() => {
            result.current.addFood(food);
            result.current.addFood({ ...food, source: 'open-food-facts' });
        });
        expect(result.current.items.map((item) => item.source)).toStrictEqual([
            'bls',
            'open-food-facts',
        ]);
    });
});
