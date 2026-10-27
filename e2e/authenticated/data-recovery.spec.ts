import { expect, test } from '@playwright/test';

import { measurementSummaryResponseSchema } from '../../src/schemas/measurement';

test('shows a failed meal read and recovers without presenting an empty plan', async ({
    page,
}) => {
    await page.goto('/meal-plan?date=2034-01-02');
    await page.route('**/api/v1/meal?**', async (route) => {
        await route.fulfill({
            body: '{}',
            contentType: 'application/json',
            status: 500,
        });
    });
    await page.getByRole('button', { exact: true, name: 'Next week' }).click();
    const readError = page
        .getByRole('alert')
        .filter({ hasText: 'We could not load your data.' });
    await expect(readError).toBeVisible();
    await page.unroute('**/api/v1/meal?**');
    await page.getByRole('button', { name: 'Please try again' }).click();
    await expect(readError).toBeHidden();
    await expect(
        page.getByRole('button', { exact: true, name: 'Next week' }),
    ).toBeVisible();
});

test('retains an offline measurement draft and persists its retry', async ({
    page,
}) => {
    await page.goto('/home');
    await page
        .getByRole('button', { exact: true, name: 'Add measurement' })
        .first()
        .click();
    const dialog = page.getByRole('dialog');
    const weight = dialog.getByLabel('Weight', { exact: true });
    await weight.fill('79');
    await page.route('**/api/v1/measurement', async (route) => {
        await route.abort('failed');
    });
    await dialog.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect(
        dialog.getByRole('button', { exact: true, name: 'Save' }),
    ).toBeEnabled();
    await expect(weight).toHaveValue('79');
    await page.unroute('**/api/v1/measurement');
    await dialog.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    const summary = measurementSummaryResponseSchema.parse(
        await (
            await page.request.get('/api/v1/measurement?type=summary')
        ).json(),
    );
    expect(summary.data.currentWeight).toBe(79);
});
