import { expect, test } from '@playwright/test';

test('keeps saved meal nutrition immutable when its template changes', async ({
    page,
    request,
}) => {
    const profile = (await (await request.get('/api/v1/user')).json()) as {
        data: { id: number };
    };
    const item = {
        alternative_name: 'Oat flakes',
        basis_grams: 100,
        brand: null,
        calories: 348,
        carbohydrates: 53.3,
        fat: 6.65,
        fiber: 10.983,
        name: 'Hafer Flocken',
        position: 0,
        protein: 13.22,
        provider_food_id: 'C133000',
        quantity_grams: 80,
        salt: 0.00495,
        source: 'bls',
        sugar: 0.74,
    };
    const meal = {
        day: '2031-01-06',
        items: [item],
        meal: 'Immutable porridge template',
        section_key: 'morning_Mon 06/01/2031',
        user_id: profile.data.id,
    };

    expect(
        (
            await request.patch('/api/v1/meal', {
                data: { deletedIds: [], editedMeals: [], newMeals: [meal] },
            })
        ).ok(),
    ).toBe(true);
    expect(
        (
            await request.post('/api/v1/pool/meal', {
                data: {
                    templates: [{ content: meal.meal, items: [item] }],
                },
            })
        ).ok(),
    ).toBe(true);

    const templates = (await (
        await request.get('/api/v1/pool/meal?q=Immutable%20porridge')
    ).json()) as {
        data: { content: string; id: number; items: (typeof item)[] }[];
    };
    const template = templates.data[0];
    expect(template?.items[0]?.quantity_grams).toBe(80);

    expect(
        (
            await request.post('/api/v1/pool/meal', {
                data: {
                    templates: [
                        {
                            content: meal.meal,
                            id: template?.id,
                            items: [{ ...item, quantity_grams: 120 }],
                        },
                    ],
                },
            })
        ).ok(),
    ).toBe(true);

    const savedMeals = (await (
        await request.get(
            '/api/v1/meal?startDate=2031-01-06&endDate=2031-01-06',
        )
    ).json()) as { data: { items: (typeof item)[]; meal: string }[] };
    expect(
        savedMeals.data.find((saved) => saved.meal === meal.meal)?.items[0]
            ?.quantity_grams,
    ).toBe(80);

    await page.goto('/meal-plan?date=2031-01-06');
    await expect(
        page
            .locator('p:visible')
            .filter({ hasText: new RegExp(`^${meal.meal}$`) }),
    ).toBeVisible();
    await expect(
        page.getByText('278.4 kcal', { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: /^278\.4 kcal/ }).click();
    await expect(
        page
            .getByRole('dialog', { name: /^278\.4 kcal/ })
            .getByText('Calories by meal', { exact: true }),
    ).toBeVisible();
});
