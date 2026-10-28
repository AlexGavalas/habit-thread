import { expect, test } from '@playwright/test';

test.describe('public routes', () => {
    test('redirects an anonymous user away from a protected route', async ({
        page,
    }) => {
        await page.goto('/home');

        await expect(page).toHaveURL('/');

        await expect(
            page.getByRole('heading', {
                name: 'Plan your meals. See your progress.',
            }),
        ).toBeVisible();
    });
});
