import { type Page, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'path';

import { loadE2eEnvironment } from './environment';
import { type E2eUser, createE2eFixtures, isRunAccount } from './fixtures';

export const E2E_RUN_ID = loadE2eEnvironment().runId;
export const E2E_FIXTURES = createE2eFixtures(E2E_RUN_ID);
export const E2E_USER = E2E_FIXTURES.client.user;
export const VISUAL_E2E_USER = E2E_FIXTURES.visual.user;
export const PROFESSIONAL_E2E_USER = E2E_FIXTURES.professional.user;
export const AUTH_DIRECTORY = resolve(
    process.cwd(),
    'playwright/.auth',
    E2E_RUN_ID,
);
export const ACCOUNT_STATE_DIRECTORY = resolve(AUTH_DIRECTORY, 'accounts');
export const AUTH_STATE_PATH = resolve(AUTH_DIRECTORY, 'user.json');
export const VISUAL_AUTH_STATE_PATH = resolve(
    AUTH_DIRECTORY,
    'visual-user.json',
);
export const PROFESSIONAL_AUTH_STATE_PATH = resolve(
    AUTH_DIRECTORY,
    'professional-user.json',
);

/** Register a fresh run-owned account and sign in through the real login form. */
export const authenticateE2eUser = async (
    page: Page,
    user: E2eUser,
): Promise<void> => {
    if (!isRunAccount(user.email, E2E_RUN_ID)) {
        throw new Error(
            'Refusing to provision an account outside this e2e run',
        );
    }
    const registration = await page.request.post('/api/auth/register', {
        data: user,
    });
    // Never silently log in to an existing, potentially dirty fixture.
    await expect(registration).toBeOK();
    expect(registration.status()).toBe(201);

    await page.goto('/');
    await page.getByRole('button', { exact: true, name: 'Log in' }).click();
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page
        .getByRole('button', { exact: true, name: 'Log in with email' })
        .click();
    await expect(page).toHaveURL(user.professional ? '/professional' : '/home');

    // Record authenticated ownership before any later provisioning can fail.
    // Teardown also picks up accounts created by onboarding/connection tests.
    await mkdir(ACCOUNT_STATE_DIRECTORY, { recursive: true });
    await page.context().storageState({
        path: resolve(
            ACCOUNT_STATE_DIRECTORY,
            `${encodeURIComponent(user.email)}.json`,
        ),
    });
};
