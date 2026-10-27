import { NextRequest } from 'next/server';

import { fetchMeals } from '~api/meal';
import { saveMealPlanChanges } from '~api/meal-plan';
import { getCurrentUser } from '~api/session';
import { testUser } from '~test/user';

import { GET, PATCH } from './route';

jest.mock('next/cache');
jest.mock('~api/meal-plan');
jest.mock('~api/meal');
jest.mock('~api/professional');
jest.mock('~api/session', () => ({ getCurrentUser: jest.fn() }));

describe('meal HTTP boundary', () => {
    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
    });

    it.each([
        'startDate=invalid&endDate=2026-01-18',
        'startDate=2026-01-19&endDate=2026-01-12',
        'endDate=2026-01-18',
    ])('rejects invalid date ranges before reading (%s)', async (query) => {
        expect.hasAssertions();
        const response = await GET(
            new NextRequest(`http://localhost/api/v1/meal?${query}`),
        );
        expect(response.status).toBe(400);
        expect(fetchMeals).not.toHaveBeenCalled();
    });

    it('uses the shared write operation with server identity and maps expected failures', async () => {
        expect.hasAssertions();
        const input = {
            deletedIds: [],
            editedMeals: [],
            newMeals: [],
            ownerUserId: 42,
        };
        jest.mocked(saveMealPlanChanges).mockResolvedValueOnce({
            ok: false,
            reason: 'forbidden',
        });
        const response = await PATCH(
            new NextRequest('http://localhost/api/v1/meal', {
                body: JSON.stringify(input),
                headers: { 'Content-Type': 'application/json' },
                method: 'PATCH',
            }),
        );
        expect(response.status).toBe(404);
        expect(saveMealPlanChanges).toHaveBeenCalledWith(testUser.id, input);
    });
});
