import { expect, test } from '@playwright/test';

import { expectModalScreenshot } from '../support/layout';

test('shows in-flight feedback, retains a failed edit, and persists a retry', async ({
    page,
}) => {
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page.goto('/meal-plan?date=2032-01-05');
    const first = page
        .getByRole('region', { name: 'Weekly meal plan' })
        .locator('article')
        .first();
    await first.locator('[tabindex="0"]').focus();
    await first.getByRole('button', { exact: true, name: 'Plan meal' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit meal' });
    const text = dialog.locator('textarea[name="meal"]');
    await text.fill('Immediately saved porridge');
    const gate = Promise.withResolvers<undefined>();
    await page.route('**/meal-plan?date=2032-01-05', async (route) => {
        if (route.request().method() !== 'POST') {
            await route.continue();
            return;
        }
        await gate.promise;
        await route.abort('failed');
    });
    await dialog
        .getByRole('button', { exact: true, name: 'Save changes' })
        .click();
    await expect(
        dialog.getByRole('button', { exact: true, name: 'Save changes' }),
    ).toBeDisabled();
    await expect(
        page.getByRole('status').filter({ hasText: /^Saving…$/ }),
    ).toHaveCount(2);
    await expect(
        page.getByRole('button', { exact: true, name: 'Next week' }),
    ).toBeEnabled();
    await expectModalScreenshot(dialog, 'meal-saving-desktop.png');
    gate.resolve(undefined);
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(text).toHaveValue('Immediately saved porridge');
    await page.unroute('**/meal-plan?date=2032-01-05');
    await dialog
        .getByRole('button', { exact: true, name: 'Save changes' })
        .click();
    await expect(dialog).toBeHidden();
    await expect(
        first.getByText('Immediately saved porridge', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await first.locator('[tabindex="0"]').focus();
    await expect(
        first.getByRole('button', { name: 'Edit note' }),
    ).toBeVisible();
    await first.getByRole('button', { name: 'Edit note' }).click();
    const noteDialog = page.getByRole('dialog').filter({
        has: page.getByRole('textbox', { name: 'Meal note' }),
    });
    await noteDialog
        .getByLabel('Meal note')
        .fill('Saved without saving the whole plan');
    await noteDialog.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect(noteDialog).toBeHidden();
    await page.reload();
    await first.locator('[tabindex="0"]').focus();
    await first.getByRole('button', { name: 'Edit note' }).click();
    await expect(noteDialog.getByLabel('Meal note')).toHaveValue(
        'Saved without saving the whole plan',
    );
    await noteDialog
        .getByRole('button', { exact: true, name: 'Delete' })
        .click();
    await expect(noteDialog).toBeHidden();
    await expect(
        page.getByRole('button', { exact: true, name: 'Save' }),
    ).toHaveCount(0);
});

test('saves and deletes a meal on mobile without a plan-wide save', async ({
    page,
}) => {
    await page.setViewportSize({ height: 850, width: 390 });
    await page.goto('/meal-plan?date=2032-01-12');
    await page
        .getByRole('button', { exact: true, name: 'Edit Morning' })
        .click();
    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByRole('button', { exact: true, name: 'Save changes' }),
    ).toBeVisible();
    const selectedView = dialog.getByRole('button', {
        name: /^Selected \(\d+\)$/,
    });
    if (await selectedView.isVisible()) {
        await selectedView.click();
    }
    await dialog.locator('textarea[name="meal"]').fill('Mobile autosaved meal');
    await dialog
        .getByRole('button', { exact: true, name: 'Save changes' })
        .click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(
        page
            .locator('p:visible')
            .filter({ hasText: /^Mobile autosaved meal$/ }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('meal-saved-mobile.png', {
        fullPage: true,
    });
    await page
        .getByRole('button', { exact: true, name: 'Edit Morning' })
        .click();
    await dialog
        .getByRole('button', { exact: true, name: 'Delete meal' })
        .click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(
        page.getByText('Mobile autosaved meal', { exact: true }),
    ).toHaveCount(0);
});
