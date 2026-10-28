import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { DEFAULT_E2E_REQUEST_DATE } from '../../src/constants/e2e';

const FIXED_E2E_DAY = DEFAULT_E2E_REQUEST_DATE.slice(0, 10);

test('loads protected routes for a registered user', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/home');

    await expect(
        page.getByRole('heading', { name: 'Health trend' }),
    ).toBeVisible();

    await page.getByRole('link', { exact: true, name: 'Meal plan' }).click();

    await expect(page).toHaveURL('/meal-plan');

    await expect(
        page.getByRole('button', { name: 'Previous week' }),
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Meal library' }),
    ).toBeVisible();
});

test('homepage actions open their advertised destinations', async ({
    page,
    request,
}) => {
    // Other journeys can plan lunch for this run-owned account. Establish the
    // empty slot this journey needs rather than depending on their order.
    const mealsResponse = await request.get(
        `/api/v1/meal?startDate=${FIXED_E2E_DAY}&endDate=${FIXED_E2E_DAY}`,
    );
    await expect(mealsResponse).toBeOK();
    const { data: meals } = z
        .object({
            data: z.array(
                z.object({ id: z.string(), section_key: z.string() }),
            ),
        })
        .parse(await mealsResponse.json());
    const lunchIds = meals
        .filter((meal) => meal.section_key === 'lunch_Mon 12/01/2026')
        .map((meal) => meal.id);
    if (lunchIds.length) {
        await expect(
            await request.patch('/api/v1/meal', {
                data: { deletedIds: lunchIds, editedMeals: [], newMeals: [] },
            }),
        ).toBeOK();
    }
    await page.goto('/home');

    await page.getByRole('link', { name: 'Plan Lunch' }).click();
    await expect(page).toHaveURL((url) => {
        return (
            url.pathname === '/meal-plan' &&
            url.searchParams.get('date') === FIXED_E2E_DAY &&
            url.searchParams.get('slot') === 'lunch_Mon 12/01/2026'
        );
    });
    const mealDialog = page.getByRole('dialog', { name: 'Edit meal' });
    await expect(mealDialog).toBeVisible();
    await expect(mealDialog.getByLabel('Meal name')).toBeVisible();
    await mealDialog.getByRole('button', { name: 'Cancel' }).click();

    await page.goto('/home');
    await page.getByRole('link', { name: 'View meal plan' }).click();
    await expect(page).toHaveURL(`/meal-plan?date=${FIXED_E2E_DAY}`);

    await page.goto('/home');
    await page.getByRole('link', { name: 'Details' }).click();
    await expect(page).toHaveURL('/settings');

    await page.goto('/settings?tab=personal');
    await expect(
        page.getByRole('tab', { name: 'Personal Information' }),
    ).toHaveAttribute('aria-selected', 'true');
});
