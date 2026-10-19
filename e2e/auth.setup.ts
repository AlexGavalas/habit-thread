import { expect, test as setup } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

import { AUTH_STATE_PATH, E2E_USER, authenticateE2eUser } from './support/auth';
import { loadE2eEnvironment } from './support/environment';

setup('authenticate the test user', async ({ page }) => {
    const { mode } = loadE2eEnvironment();

    setup.slow(
        mode === 'preview',
        'Hosted preview authentication can cold start',
    );

    await authenticateE2eUser(page, E2E_USER, mode);

    if (mode === 'preview') {
        const response = await page.request.patch('/api/v1/user', {
            data: {
                hasCompletedOnboarding: true,
                height: 180,
                isDiscoverable: true,
                language: 'en',
                targetWeight: 75,
            },
        });

        expect(response.ok()).toBe(true);
    }

    await expect(
        page.getByRole('link', { exact: true, name: 'Meal plan' }),
    ).toBeVisible();

    await mkdir(dirname(AUTH_STATE_PATH), { recursive: true });
    await page.context().storageState({ path: AUTH_STATE_PATH });
});
