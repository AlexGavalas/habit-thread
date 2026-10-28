/** @jest-environment node */
import { NextRequest } from 'next/server';

import { searchFoods } from '~api/food-search';
import { getCurrentUser } from '~api/session';
import { testUser } from '~test/user';
import { type FoodSearchResponse } from '~types/food-search';

import { GET } from './route';

jest.mock('next/cache');
jest.mock('~api/food-search');
jest.mock('~api/professional');
jest.mock('~api/session', () => ({ getCurrentUser: jest.fn() }));

const searchResponse: FoodSearchResponse = {
    data: { bls: [], openFoodFacts: [] },
    warnings: [],
};

describe('food search HTTP boundary', () => {
    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
        jest.mocked(searchFoods).mockResolvedValue(searchResponse);
    });

    it('serves authenticated searches without feature configuration', async () => {
        expect.hasAssertions();
        const response = await GET(
            new NextRequest('http://localhost/api/v1/food/search?q=oats'),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual(searchResponse);
        expect(searchFoods).toHaveBeenCalledWith({
            country: 'de',
            query: 'oats',
        });
    });

    it('rejects unauthenticated searches before fetching foods', async () => {
        expect.hasAssertions();
        jest.mocked(getCurrentUser).mockResolvedValueOnce(null);
        const response = await GET(
            new NextRequest('http://localhost/api/v1/food/search?q=oats'),
        );

        expect(response.status).toBe(401);
        expect(searchFoods).not.toHaveBeenCalled();
    });

    it.each(['q=x', 'q=oats&country=invalid', 'country=de'])(
        'rejects invalid queries before fetching foods (%s)',
        async (query) => {
            expect.hasAssertions();
            const response = await GET(
                new NextRequest(`http://localhost/api/v1/food/search?${query}`),
            );

            expect(response.status).toBe(400);
            expect(searchFoods).not.toHaveBeenCalled();
        },
    );
});
