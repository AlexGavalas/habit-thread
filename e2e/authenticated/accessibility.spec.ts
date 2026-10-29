import { expect, test } from '@playwright/test';

import {
    expectAccessible,
    expectDialogFocusContained,
} from '../support/accessibility';

for (const viewport of [
    { height: 900, name: 'desktop', width: 1280 },
    { height: 844, name: 'mobile', width: 390 },
]) {
    test.describe(`authenticated accessibility on ${viewport.name}`, () => {
        test.use({ viewport });
        test(
            'onboarding dialogs',
            { tag: '@a11y' },
            async ({ page, request }) => {
                const reset = await request.patch('/api/v1/user', {
                    data: { hasCompletedOnboarding: false },
                });
                await expect(reset).toBeOK();
                try {
                    await page.goto('/home');
                    const welcome = page.getByRole('dialog', {
                        name: 'Small habits. A healthier rhythm.',
                    });
                    await expect(welcome).toBeVisible();
                    await expectAccessible(page, 'onboarding-welcome');
                    await welcome
                        .getByRole('button', { name: 'Continue' })
                        .click();
                    const choice = page.getByRole('dialog', {
                        name: 'Make yourself at home',
                    });
                    await expect(choice).toBeVisible();
                    await expectAccessible(page, 'onboarding-choice');
                } finally {
                    const restored = await request.patch('/api/v1/user', {
                        data: { hasCompletedOnboarding: true },
                    });
                    await expect(restored).toBeOK();
                }
            },
        );

        test(
            'home and meal schedule drawer',
            { tag: '@a11y' },
            async ({ page }) => {
                await page.goto('/home');
                await expect(
                    page.getByRole('heading', { name: 'Today’s meals' }),
                ).toBeVisible();
                await expectAccessible(page, 'home');

                await page.goto('/meal-plan');
                const edit = page.getByRole('button', {
                    exact: true,
                    name:
                        viewport.name === 'mobile'
                            ? 'Edit schedule for Mon'
                            : 'Edit schedule for Mon 12/01',
                });
                await expect(edit).toBeVisible();
                await expectAccessible(page, 'meal-plan');
                await edit.focus();
                await page.keyboard.press('Enter');
                const dialog = page.getByRole('dialog', {
                    name: 'Schedule for 12/01/2026',
                });
                await expect(dialog).toBeVisible();
                await expectDialogFocusContained(
                    page,
                    dialog.getByRole('button', { name: 'Save this day' }),
                );
                await expectAccessible(page, 'schedule-drawer');
                await page.keyboard.press('Escape');
                await expect(dialog).toBeHidden();
                await expect(edit).toBeFocused();
            },
        );
    });
}
