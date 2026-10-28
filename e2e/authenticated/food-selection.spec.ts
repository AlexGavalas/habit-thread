import { expect, test } from '@playwright/test';

import { type FoodSearchResult } from '../../src/types/food-search';
import { expectAccessible } from '../support/accessibility';

const food = (
    name: string,
    id: string,
    source: FoodSearchResult['source'],
): FoodSearchResult => ({
    alternativeName: null,
    brand: null,
    id,
    name,
    nutrition: {
        calories: 100,
        carbohydrates: 10,
        fat: 2,
        fiber: 1,
        protein: 5,
        salt: 0,
        sugar: 1,
    },
    quantity: null,
    source,
});

for (const viewport of [
    { height: 800, width: 1280 },
    { height: 844, width: 390 },
]) {
    test(
        `selected foods disappear from search and return on removal at ${viewport.width}px`,
        { tag: '@a11y' },
        async ({ page }) => {
            let searchRequests = 0;
            await page.setViewportSize(viewport);
            await page.route('**/api/v1/food/search?*', async (route) => {
                searchRequests += 1;
                await route.fulfill({
                    json: {
                        data: {
                            bls: [
                                food('Oats', 'shared-id', 'bls'),
                                food('Blueberries', 'berries', 'bls'),
                            ],
                            openFoodFacts: [
                                food(
                                    'Branded oats',
                                    'shared-id',
                                    'open-food-facts',
                                ),
                            ],
                        },
                        warnings: [],
                    },
                });
            });
            await page.goto('/meal-plan');
            await page
                .getByRole('button', { name: /^(Meal library|Create a meal)$/ })
                .click();
            const dialog = page.getByRole('dialog', { name: 'Create a meal' });
            await dialog.getByRole('tab', { name: 'Food database' }).click();
            const search = dialog.getByRole('region', {
                exact: true,
                name: 'Search',
            });
            await search.getByLabel('Food or brand').fill('oats');
            await search
                .getByRole('button', { exact: true, name: 'Search' })
                .click();
            const results = search.getByRole('region', {
                name: 'Food search results',
            });
            const oats = results.getByRole('button', { name: /^Oats / });
            const branded = results.getByRole('button', {
                name: /^Branded oats /,
            });
            await oats.click();
            await expect(oats).toHaveCount(0);
            await expect(branded).toBeVisible();
            await branded.click();
            await results
                .getByRole('button', { name: /^Blueberries / })
                .click();
            await expect(
                results.getByText('All matching foods are already selected.'),
            ).toBeVisible();
            const basket = dialog.getByRole('region', {
                exact: true,
                name: 'Selected foods',
            });
            if (viewport.width < 768) {
                await dialog
                    .getByRole('button', { name: 'Selected (3)' })
                    .click();
            }
            await expect(basket.locator('[data-recently-added]')).toHaveCSS(
                'background-color',
                'rgba(0, 0, 0, 0)',
            );
            await expectAccessible(
                page,
                `food-basket-selected-${viewport.width}`,
            );
            await basket
                .getByRole('button', { exact: true, name: 'Remove Oats' })
                .click();
            if (viewport.width < 768) {
                await dialog
                    .getByRole('button', { exact: true, name: 'Search' })
                    .click();
            }
            await expect(oats).toBeVisible();
            await expect(branded).toHaveCount(0);
            await expect(results.getByRole('button')).toHaveCount(1);
            await oats.click();
            await expect(
                results.getByText('All matching foods are already selected.'),
            ).toBeVisible();
            expect(searchRequests).toBe(1);
        },
    );
}
