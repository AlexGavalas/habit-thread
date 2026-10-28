import { expect, test } from '@playwright/test';

import {
    expectAccessible,
    expectDialogFocusContained,
} from '../support/accessibility';

for (const viewport of [
    { height: 900, name: 'desktop', width: 1280 },
    { height: 844, name: 'mobile', width: 390 },
]) {
    test.describe(`public accessibility on ${viewport.name}`, () => {
        test.use({ viewport });
        test(
            'landing and authentication dialogs',
            { tag: '@a11y' },
            async ({ page }) => {
                await page.goto('/');
                await expect(page).toHaveTitle('HabitThread');
                await expect(
                    page.getByRole('heading', {
                        name: 'Plan your meals. See your progress.',
                    }),
                ).toBeVisible();
                await expectAccessible(page, 'landing');

                const register = page.getByRole('button', {
                    name: 'Create an account',
                });
                await register.focus();
                await page.keyboard.press('Enter');
                const dialog = page.getByRole('dialog');
                await expect(
                    dialog.getByRole('heading', {
                        name: 'Create your HabitThread account',
                    }),
                ).toBeVisible();
                await expect(dialog.getByLabel('Full name')).toBeVisible();
                await expectDialogFocusContained(
                    page,
                    dialog.getByRole('button', { exact: true, name: 'Log in' }),
                );
                await expectAccessible(page, 'registration');
                // Exercise the real form's expected server-error state without
                // creating accounts or depending on existing registration data.
                await page.route('**/api/auth/register', (route) =>
                    route.fulfill({ json: {}, status: 409 }),
                );
                await dialog.getByLabel('Full name').fill('Accessibility User');
                await dialog
                    .getByLabel('Email')
                    .fill('accessibility@example.test');
                await dialog
                    .getByLabel('Password', { exact: true })
                    .fill('a11y-password');
                await dialog
                    .getByRole('button', {
                        exact: true,
                        name: 'Create account',
                    })
                    .focus();
                await page.keyboard.press('Enter');
                await expect(dialog.getByRole('alert')).toContainText(
                    'An account already exists for this email.',
                );
                await expectAccessible(page, 'registration-error');
                await page.keyboard.press('Escape');
                await expect(dialog).toBeHidden();
                await expect(register).toBeFocused();

                const login = page.getByRole('button', {
                    exact: true,
                    name: 'Log in',
                });
                await login.focus();
                await page.keyboard.press('Enter');
                await expect(dialog.getByLabel('Email')).toBeVisible();
                await expect(
                    dialog.getByLabel('Password', { exact: true }),
                ).toBeVisible();
                await expectDialogFocusContained(
                    page,
                    dialog.getByRole('button', { name: 'Sign up' }),
                );
                await expectAccessible(page, 'login');
                await page.keyboard.press('Escape');
                await expect(dialog).toBeHidden();
                await expect(login).toBeFocused();
            },
        );
    });
}
