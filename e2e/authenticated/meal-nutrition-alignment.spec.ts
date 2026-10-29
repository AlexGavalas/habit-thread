import { expect, test } from '@playwright/test';
import { z } from 'zod';

for (const width of [1440, 1100]) {
    test(`aligns meal slots with and without day nutrition at ${width}px`, async ({
        page,
        request,
    }) => {
        const week = width === 1440 ? '2032-02-02' : '2032-02-09';
        const label = width === 1440 ? '02/02/2032' : '09/02/2032';
        const profile = z
            .object({ data: z.object({ id: z.number() }) })
            .parse(await (await request.get('/api/v1/user')).json());
        await expect(
            await request.patch('/api/v1/meal', {
                data: {
                    deletedIds: [],
                    editedMeals: [],
                    newMeals: [
                        {
                            day: week,
                            items: [
                                {
                                    basis_grams: 100,
                                    calories: 204,
                                    carbohydrates: 8.7,
                                    fat: 11.5,
                                    name: 'Breakfast ingredients',
                                    position: 0,
                                    protein: 15.9,
                                    provider_food_id: 'alignment-food',
                                    quantity_grams: 100,
                                    source: 'bls',
                                },
                            ],
                            meal: 'Breakfast with nutrition',
                            section_key: `morning_Mon ${label}`,
                            user_id: profile.data.id,
                        },
                    ],
                },
            }),
        ).toBeOK();
        await page.setViewportSize({ height: 1000, width });
        await page.clock.setFixedTime(new Date(`${week}T12:00:00`));
        await page.goto(`/meal-plan?date=${week}`);
        const board = page.getByRole('region', { name: 'Weekly meal plan' });
        const days = board.getByRole('group', { name: 'Carousel slide' });
        await expect(
            days.first().getByRole('heading', { name: /^Mon / }),
        ).toHaveAttribute('aria-current', 'date');
        await expect(board.getByText('Today', { exact: true })).toHaveCount(0);
        await expect(
            days.first().getByRole('button', { name: /^204 kcal/ }),
        ).toBeVisible();
        await expect(
            days.nth(1).getByRole('button', { name: /kcal/ }),
        ).toHaveCount(0);
        const firstMeal = await days
            .first()
            .locator('article')
            .first()
            .boundingBox();
        const nextMeal = await days
            .nth(1)
            .locator('article')
            .first()
            .boundingBox();
        if (!firstMeal || !nextMeal) {
            throw new Error('Expected visible meal slots in both days');
        }
        expect(firstMeal.y).toBeCloseTo(nextMeal.y, 0);
        await expect(board).toHaveScreenshot(
            `meal-nutrition-header-${width}.png`,
        );
    });
}
