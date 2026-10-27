import { expect, test } from '@playwright/test';

import { expectNoHorizontalOverflow } from '../support/layout';

test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await expect(
        page.getByRole('heading', { name: 'Today’s meals' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Health trend' }),
    ).toBeVisible();
});

test('homepage stacks its content on mobile Chrome', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
    await expect(
        page.getByRole('link', { exact: true, name: 'Home' }),
    ).toBeHidden();

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
        fullPage: true,
    });
});

test('compact menu contains all navigation links', async ({ page }) => {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();

    const menu = page.getByRole('menu');

    await expect(menu.getByRole('menuitem', { name: 'Home' })).toBeVisible();
    await expect(
        menu.getByRole('menuitem', { name: 'Meal plan' }),
    ).toBeVisible();
    await expect(
        menu.getByRole('menuitem', { name: 'Connections' }),
    ).toBeVisible();
    await expect(
        menu.getByRole('menuitem', { name: 'Settings' }),
    ).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Logout' })).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-menu-mobile.png');

    await menu.getByRole('menuitem', { name: 'Meal plan' }).click();
    await expect(page).toHaveURL('/meal-plan');
    await expect(menu).toBeHidden();
});

test('homepage remains usable at 320px', async ({ page }) => {
    await page.setViewportSize({ height: 568, width: 320 });
    await expectNoHorizontalOverflow(page);

    await expect(page).toHaveScreenshot('homepage-mobile-320.png', {
        fullPage: true,
    });
});

test('dashboard creation actions open the existing forms', async ({ page }) => {
    await page.getByRole('button', { name: 'Add measurement' }).click();

    const dialog = page.getByRole('dialog', {
        name: 'Add a new measurement',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Weight')).toBeVisible();
    await expect(dialog.getByLabel('Fat percentage')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Add an activity' }).click();

    const activityDialog = page.getByRole('dialog', {
        name: 'Add a new activity',
    });
    await expect(activityDialog).toBeVisible();
    await expect(activityDialog.getByLabel('Activity')).toBeVisible();

    await activityDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(activityDialog).toBeHidden();
});

test('meal plan is touch-friendly on mobile Chrome', async ({ page }) => {
    await page.goto('/meal-plan');
    await expect(
        page.getByRole('heading', { name: 'Meal plan' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const dayPicker = page.getByRole('group', { name: 'Select a day' });
    await expect(dayPicker.getByRole('button')).toHaveCount(7);
    const secondDay = dayPicker.getByRole('button').nth(1);
    await secondDay.click();
    await expect(secondDay).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Edit Lunch' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit meal' });
    await expect(
        dialog.getByRole('tab', { exact: true, name: 'Meal' }),
    ).toHaveCount(0);
    await expect(
        dialog.getByRole('heading', { name: 'Add to this meal' }),
    ).toBeVisible();
    const selectedView = dialog.getByRole('button', {
        name: /^Selected \(\d+\)$/,
    });
    if (await selectedView.isVisible()) {
        await selectedView.click();
        await expect(selectedView).toHaveAttribute('aria-pressed', 'true');
        await expect(
            dialog.getByRole('heading', { name: 'Selected foods' }),
        ).toBeVisible();
    } else {
        await expect(
            dialog.getByRole('heading', { name: 'Ingredients & nutrition' }),
        ).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
    await dialog
        .getByRole('textbox', { name: 'Meal name' })
        .fill('Mobile lunch saved');
    await dialog
        .getByRole('button', { exact: true, name: 'Save changes' })
        .click();

    await expect(dialog).toBeHidden();
    const savedMeal = page
        .locator('p:visible')
        .filter({ hasText: /^Mobile lunch saved$/ });
    await expect(savedMeal).toBeVisible();
    await page.reload();
    await dayPicker.getByRole('button').nth(1).click();
    await expect(savedMeal).toBeVisible();

    await expect(page).toHaveScreenshot('meal-plan-mobile.png', {
        fullPage: true,
    });
});

test('meal plan remains usable at 320px', async ({ page }) => {
    await page.setViewportSize({ height: 568, width: 320 });
    await page.goto('/meal-plan');
    await expect(
        page.getByRole('heading', { name: 'Meal plan' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(
        page.getByRole('button', { name: 'Edit Lunch' }),
    ).toBeVisible();

    await expect(page).toHaveScreenshot('meal-plan-mobile-320.png', {
        fullPage: true,
    });
});

test('settings use mobile cards and stacked forms', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('tab', { name: 'Measurements' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole('listitem').first()).toBeVisible();
    await expect(
        page.getByRole('button', { exact: true, name: 'Edit' }).first(),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { exact: true, name: 'Delete' }).first(),
    ).toBeVisible();

    await expect(page).toHaveScreenshot('settings-measurements-mobile.png', {
        fullPage: true,
    });

    await page.getByRole('tab', { name: 'Personal Information' }).click();
    await expect(page.getByLabel('Your height (in cm)')).toBeVisible();
    await expect(page.getByLabel('Your target weight (in kg)')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(page).toHaveScreenshot('settings-personal-mobile.png', {
        fullPage: true,
    });
});

test('advanced settings remain usable at 320px', async ({ page }) => {
    await page.setViewportSize({ height: 568, width: 320 });
    await page.goto('/settings');
    await page.getByRole('tab', { name: 'Advanced Settings' }).click();
    await expect(
        page.getByRole('switch', {
            name: 'Is my profile visible to other users?',
        }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Delete account' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(page).toHaveScreenshot('settings-advanced-mobile-320.png', {
        fullPage: true,
    });
});
