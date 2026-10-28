import { type Page, expect, test } from '@playwright/test';

import { E2E_USER } from '../support/auth';

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
};

test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await expect(
        page.getByRole('heading', { name: 'Today’s meals' }),
    ).toBeVisible();
});

test('connections search result stacks on mobile Chrome', async ({ page }) => {
    await page.goto('/connections');
    await expect(
        page.getByRole('heading', { exact: true, name: 'Connections' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Add person' }).click();
    await expect(
        page.getByRole('heading', { name: 'Find people' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const search = page.getByRole('combobox', { name: 'Search' });
    await search.fill(E2E_USER.fullName);
    await expect(
        page.getByRole('option', { exact: true, name: E2E_USER.fullName }),
    ).toBeVisible();
    await search.press('ArrowDown');
    await search.press('Enter');
    await expect(
        page.getByRole('button', { name: 'Send connection request' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // Assert the real run-scoped selection, then normalize only run metadata
    // for the visual baseline. Discovery is not mocked or first-match based.
    const selectedName = page.getByRole('dialog').getByText(E2E_USER.fullName, {
        exact: true,
    });
    await expect(selectedName).toBeVisible();
    await search.evaluate((input) => {
        if (input instanceof HTMLInputElement) {
            input.value = 'E2E User';
        }
    });
    await selectedName.evaluate((element) => {
        element.textContent = 'E2E User';
    });
    await expect(page).toHaveScreenshot('connections-search-mobile.png');

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(search).toHaveValue('');
});

test('connections remains usable at 320px', async ({ page }) => {
    await page.setViewportSize({ height: 568, width: 320 });
    await page.goto('/connections');
    await expect(
        page.getByRole('button', { name: 'Add person' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'People' })).toBeVisible();
    // Each card streams in a separate Suspense boundary. People being ready
    // does not mean the full-page height is final yet.
    await expect(
        page.getByText('You are not currently managed by a professional.', {
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        page.getByText("You don't have any connection requests", {
            exact: true,
        }),
    ).toBeVisible();
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('connections-mobile-320.png', {
        fullPage: true,
    });
});
