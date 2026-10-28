import { expect, test } from '@playwright/test';

import en from '../../public/locales/en/common.json';
import { createMealPdf } from '../../src/test/meal-import-fixtures';

test('keeps imported meals open after a failed save and closes after a successful retry', async ({
    page,
}) => {
    await page.route('**/api/v1/pool/upload', (route) =>
        route.fulfill({ json: { data: ['Eggs'] } }),
    );
    let saveAttempts = 0;
    await page.route('**/api/v1/pool/meal', (route) => {
        if (route.request().method() !== 'POST') {
            return route.continue();
        }
        saveAttempts += 1;
        return route.fulfill({
            json: {},
            status: saveAttempts === 1 ? 500 : 200,
        });
    });
    await page.goto('/meal-plan');
    await page
        .getByRole('button', { exact: true, name: en.meal_plan.meal_library })
        .click();
    const dialog = page.getByRole('dialog', {
        name: en.modals.meal_pool.title,
    });
    await dialog
        .getByRole('tab', { name: en.modals.meal_pool.tabs.import })
        .click();
    await dialog.locator('input[type="file"]').setInputFiles({
        buffer: createMealPdf(),
        mimeType: 'application/pdf',
        name: 'plan.pdf',
    });
    await dialog
        .getByRole('button', { exact: true, name: en.confirmation.yes })
        .click();
    await expect(
        dialog.getByRole('textbox', { exact: true, name: 'Meal 1' }),
    ).toHaveValue('Eggs');
    const create = dialog.getByRole('button', { exact: true, name: en.create });
    await create.click();
    await expect(page.getByText(en.notification.error.message)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(
        dialog.getByRole('textbox', { exact: true, name: 'Meal 1' }),
    ).toHaveValue('Eggs');
    await expect(create).toBeEnabled();
    await create.click();
    await expect(dialog).toBeHidden();
});
