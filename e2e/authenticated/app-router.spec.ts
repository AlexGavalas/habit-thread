import { expect, test } from '@playwright/test';

import en from '../../public/locales/en/common.json';
import gr from '../../public/locales/gr/common.json';

test('creates a measurement and refreshes the dashboard summary', async ({
    page,
}) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: en.add_measurement }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(en.weight, { exact: true }).fill('81');
    await dialog.getByLabel(en.fat_label, { exact: true }).fill('19');
    await dialog.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(
        page.getByRole('cell', { exact: true, name: '81' }),
    ).toBeVisible();
    await page.getByRole('link', { exact: true, name: 'Home' }).click();
    await expect(
        page
            .getByRole('region', { name: en.home_dashboard.health_trend })
            .getByText('19%', { exact: true }),
    ).toBeVisible();

    const response = await page.request.get('/api/v1/measurement?type=summary');
    const summary = (await response.json()) as {
        data: { currentWeight: number; currentFat: number };
    };
    expect(summary.data).toMatchObject({ currentFat: 19, currentWeight: 81 });
});

test('saves meal edits immediately and copies the week atomically', async ({
    page,
}) => {
    const mealText = page
        .locator('p:visible')
        .filter({ hasText: /^App Router migration meal$/ });
    await page.goto('/meal-plan');
    const firstMealSlot = page
        .getByRole('group', { name: 'Carousel slide' })
        .first()
        .getByRole('article')
        .first();
    await firstMealSlot.locator('[tabindex="0"]').focus();
    await firstMealSlot
        .getByRole('button', { exact: true, name: 'Plan meal' })
        .click();
    const dialog = page.getByRole('dialog');
    await dialog
        .locator('textarea[name="meal"]')
        .fill('App Router migration meal');
    await dialog
        .getByRole('button', { exact: true, name: 'Save changes' })
        .click();
    await expect(dialog).toBeHidden();
    await expect(mealText).toBeVisible();

    await page.getByRole('link', { exact: true, name: 'Home' }).click();
    await page.getByRole('link', { exact: true, name: 'Meal plan' }).click();
    await expect(mealText).toBeVisible();
    await expect(
        page.getByRole('button', { exact: true, name: 'Save' }),
    ).toBeHidden();
    await page.reload();
    await expect(mealText).toBeVisible();
    await page.getByRole('button', { name: 'More actions' }).click();
    page.once('dialog', async (confirmation) => {
        await confirmation.accept();
    });
    await page.getByRole('menuitem', { name: 'Copy to next week' }).click();
    await expect(page.getByText('19 Jan–25 Jan 2026')).toBeVisible();
    await page.goto('/meal-plan?date=2026-01-19');
    await page.reload();
    await expect(mealText).toBeVisible();
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(mealText).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Next week' }).click();
    await expect(mealText).toBeVisible();
});

test('persists profile language through a server action and reload', async ({
    page,
}) => {
    await page.goto('/settings');
    await page.getByRole('tab', { name: en.personal_info }).click();
    await page
        .getByRole('combobox', { exact: true, name: en.languages.label })
        .click();
    await page.getByRole('option', { name: en.languages.options.el }).click();
    await page
        .getByRole('button', { exact: true, name: en.generic.actions.save })
        .first()
        .click();
    await expect(
        page.getByRole('tab', { name: gr.personal_info }),
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole('tab', { name: gr.personal_info }),
    ).toBeVisible();
    await page.getByRole('tab', { name: gr.personal_info }).click();
    await page
        .getByRole('combobox', { exact: true, name: gr.languages.label })
        .click();
    await page.getByRole('option', { name: gr.languages.options.en }).click();
    await page
        .getByRole('button', { exact: true, name: gr.generic.actions.save })
        .first()
        .click();
    await expect(
        page.getByRole('tab', { name: en.personal_info }),
    ).toBeVisible();
});
