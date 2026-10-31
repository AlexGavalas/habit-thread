import assert from 'node:assert/strict';

import { searchBlsFoods, searchOpenFoodFacts } from './food-search';

describe('food search', () => {
    it('finds BLS foods by German and English names', () => {
        expect.hasAssertions();

        expect(searchBlsFoods('Hafer Flocken')[0]).toMatchObject({
            id: 'C133000',
            name: 'Hafer Flocken',
            nutrition: { calories: 348, protein: 13.22 },
            source: 'bls',
        });

        expect(searchBlsFoods('oat flakes')[0]).toMatchObject({
            id: 'C133000',
            name: 'Hafer Flocken',
        });
    });

    it('requests only the required Open Food Facts fields and maps nutrients', async () => {
        expect.hasAssertions();

        jest.spyOn(global, 'fetch').mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    hits: [
                        {
                            brands: ['Example'],
                            code: '123',
                            nutriments: {
                                carbohydrates_100g: 4,
                                'energy-kcal_100g': 56,
                                fat_100g: 0,
                                proteins_100g: 10,
                                salt_100g: 0.18,
                                sugars_100g: 4,
                            },
                            product_name: 'Greek yogurt',
                            product_name_de: 'Griechischer Joghurt',
                            quantity: '500 g',
                        },
                    ],
                }),
            ),
        );

        await expect(
            searchOpenFoodFacts({ country: 'de', query: 'Greek yogurt' }),
        ).resolves.toStrictEqual([
            expect.objectContaining({
                brand: 'Example',
                id: '123',
                name: 'Griechischer Joghurt',
                nutrition: expect.objectContaining({
                    calories: 56,
                    protein: 10,
                }),
                quantity: '500 g',
                source: 'open-food-facts',
            }),
        ]);

        expect(fetch).toHaveBeenCalledWith(
            'https://search.openfoodfacts.org/search',
            expect.objectContaining({
                headers: expect.objectContaining({
                    'User-Agent': expect.stringContaining('HabitThread/0.0.1'),
                }),
                method: 'POST',
            }),
        );
        const request = jest.mocked(fetch).mock.calls[0]?.[1];
        const requestBody = request?.body;
        assert(typeof requestBody === 'string');
        expect(JSON.parse(requestBody)).toMatchObject({
            page_size: 8,
            q: 'Greek yogurt countries_tags:"en:germany"',
        });
    });
});
