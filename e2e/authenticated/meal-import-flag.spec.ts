import { expect, test } from '@playwright/test';

import en from '../../public/locales/en/common.json';
import { loadE2eEnvironment } from '../support/environment';

test('hides file import and rejects direct uploads when disabled', async ({
    page,
    request,
}) => {
    test.skip(
        loadE2eEnvironment().mode !== 'local' ||
            process.env.E2E_MEAL_IMPORT === 'true',
        'Requires local import flag disabled',
    );
    await page.goto('/meal-plan');
    await page
        .getByRole('button', { exact: true, name: en.meal_plan.meal_library })
        .click();
    const dialog = page.getByRole('dialog', {
        name: en.modals.meal_pool.title,
    });
    await expect(
        dialog.getByRole('tab', { name: en.modals.meal_pool.tabs.manual }),
    ).toBeVisible();
    await expect(
        dialog.getByRole('tab', { name: en.modals.meal_pool.tabs.import }),
    ).toHaveCount(0);
    const response = await request.post('/api/v1/pool/upload', {
        multipart: { description: 'Direct upload while disabled' },
    });
    expect(response.status()).toBe(404);
});
