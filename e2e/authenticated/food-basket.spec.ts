import { expect, test } from '@playwright/test';
import { z } from 'zod';

import {
    type FoodSearchResponse,
    type FoodSearchResult,
} from '../../src/types/food-search';
import {
    expectModalScreenshot,
    expectNoHorizontalOverflow,
} from '../support/layout';

const food = (
    name: string,
    source: FoodSearchResult['source'] = 'bls',
): FoodSearchResult => ({
    alternativeName: null,
    brand: null,
    id: name,
    name,
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
    source,
});

const response: FoodSearchResponse = {
    data: {
        bls: [
            food('Oats'),
            food('Blueberries'),
            ...Array.from({ length: 20 }, (_, index) => food(`Food ${index}`)),
        ],
        openFoodFacts: [food('Branded oats', 'open-food-facts')],
    },
    warnings: [],
};
const templatesSchema = z.object({
    data: z.array(
        z.object({
            content: z.string(),
            items: z.array(
                z.object({ name: z.string(), quantity_grams: z.number() }),
            ),
        }),
    ),
});

for (const viewport of [
    { height: 800, name: 'desktop', width: 1280 },
    { height: 720, name: 'small-desktop', width: 1024 },
    { height: 844, name: 'mobile', width: 390 },
    { height: 568, name: 'small-mobile', width: 320 },
]) {
    test(`configure and save foods in the library basket on ${viewport.name}`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await page.route('**/api/v1/food/search?*', async (route) => {
            await route.fulfill({ json: response });
        });
        await page.goto('/meal-plan');
        await page
            .getByRole('button', { name: /^(Meal library|Create a meal)$/ })
            .click();
        const dialog = page.getByRole('dialog', { name: 'Create a meal' });
        await dialog.getByRole('tab', { name: 'Food database' }).click();
        await dialog.getByLabel('Food or brand').fill('oats');
        await dialog
            .getByRole('region', { exact: true, name: 'Search' })
            .getByRole('button', { exact: true, name: 'Search' })
            .click();
        const results = dialog.getByRole('region', {
            name: 'Food search results',
        });
        await results.getByRole('button', { name: /^Oats / }).click();
        await expect(dialog.getByRole('status')).toHaveText(
            'Added Oats to Selected foods (1).',
        );
        await results.getByRole('button', { name: /^Blueberries / }).click();
        if (viewport.width <= 768) {
            await dialog.getByRole('button', { name: 'Selected (2)' }).click();
        }
        const basket = dialog.getByRole('region', {
            exact: true,
            name: 'Selected foods',
        });
        const oatsQuantity = basket.getByRole('textbox', {
            exact: true,
            name: 'Quantity for Oats',
        });
        await oatsQuantity.fill('150');
        await expect(oatsQuantity).toHaveValue('150 g');
        await expect(
            basket.getByText('875 kcal', { exact: false }),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectModalScreenshot(dialog, `food-basket-${viewport.name}.png`);
        if (viewport.width <= 768) {
            await dialog
                .getByRole('button', { exact: true, name: 'Search' })
                .click();
        }
        // Bring a later result into view, then ensure adding it does not move the search pane.
        const laterFood = results.getByRole('button', { name: /^Food 5 / });
        await laterFood.scrollIntoViewIfNeeded();
        const searchScroll = await results.evaluate(
            (element) => element.scrollTop,
        );
        await laterFood.click();
        await expect
            .poll(async () => results.evaluate((element) => element.scrollTop))
            .toBe(searchScroll);
        if (viewport.width <= 768) {
            await dialog.getByRole('button', { name: 'Selected (3)' }).click();
        }
        await expect(oatsQuantity).toHaveValue('150 g');
        await basket
            .getByRole('button', { exact: true, name: 'Remove Food 5' })
            .click();
        await basket
            .getByRole('textbox', { exact: true, name: 'The meal' })
            .fill(`Basket ${viewport.name}`);
        // Keep layout at every breakpoint, but one real library save/read-back.
        if (viewport.name !== 'desktop') {
            await dialog
                .getByRole('button', { exact: true, name: 'Cancel' })
                .click();
            return;
        }
        await dialog.getByRole('button', { exact: true, name: 'Save' }).click();
        await expect(dialog).toBeHidden();
        const savedResponse = await page.request.get(
            `/api/v1/pool/meal?q=Basket%20${viewport.name}`,
        );
        expect(savedResponse.ok()).toBe(true);
        const saved = templatesSchema.parse(await savedResponse.json());
        expect(
            saved.data.find(
                (template) => template.content === `Basket ${viewport.name}`,
            )?.items,
        ).toEqual([
            { name: 'Oats', quantity_grams: 150 },
            { name: 'Blueberries', quantity_grams: 100 },
        ]);
    });
}
test('meal editor keeps the basket available across searches and source tabs', async ({
    page,
}) => {
    await page.setViewportSize({ height: 800, width: 1280 });
    await page.route('**/api/v1/food/search?*', async (route) => {
        await route.fulfill({ json: response });
    });
    await page.goto(
        '/meal-plan?date=2026-01-12&slot=lunch_Mon%2012%2F01%2F2026',
    );
    const dialog = page.getByRole('dialog', { name: 'Edit meal' });
    await dialog.getByRole('tab', { name: 'Food database' }).click();
    await dialog.getByLabel('Food or brand').fill('oats');
    await dialog.getByRole('button', { exact: true, name: 'Search' }).click();
    const results = dialog.getByRole('region', { name: 'Food search results' });
    await results.getByRole('button', { name: /^Oats / }).click();
    const basket = dialog.getByRole('region', {
        exact: true,
        name: 'Selected foods',
    });
    const oatsQuantity = basket.getByRole('textbox', {
        exact: true,
        name: 'Quantity for Oats',
    });
    await oatsQuantity.fill('80');
    await dialog.getByRole('tab', { name: 'My meals' }).click();
    await expect(oatsQuantity).toHaveValue('80 g');
    await dialog.getByRole('tab', { name: 'Food database' }).click();
    await expect(dialog.getByLabel('Food or brand')).toHaveValue('oats');
    await dialog.getByLabel('Food or brand').fill('berries');
    await dialog.getByRole('button', { exact: true, name: 'Search' }).click();
    await results.getByRole('button', { name: /^Blueberries / }).click();
    await expect(oatsQuantity).toHaveValue('80 g');
    await expectModalScreenshot(dialog, 'food-basket-meal-editor.png');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();
    // Reopen the locally saved meal to verify the existing save contract is intact.
    await page.setViewportSize({ height: 844, width: 390 });
    await page.getByRole('button', { exact: true, name: 'Edit Lunch' }).click();
    await expect(
        dialog.getByRole('button', { name: 'Selected (2)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByLabel('Food or brand')).toBeHidden();
    await expect(oatsQuantity).toHaveValue('80 g');
    await expectModalScreenshot(dialog, 'food-basket-edit-mobile.png');
});
