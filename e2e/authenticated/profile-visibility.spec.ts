import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { expectAccessible } from '../support/accessibility';
import {
    AUTH_STATE_PATH,
    E2E_RUN_ID,
    authenticateE2eUser,
} from '../support/auth';
import { expectNoHorizontalOverflow } from '../support/layout';
import { readFixtureProfile } from '../support/provision';

test.use({ storageState: { cookies: [], origins: [] } });

test(
    'keeps professionals visible in both searches and restores personal visibility control',
    { tag: '@a11y' },
    async ({ baseURL, browser, page }, testInfo) => {
        const account = {
            email: `visibility-${testInfo.retry}-${E2E_RUN_ID}@example.test`,
            fullName: `Visibility ${E2E_RUN_ID}`,
            password: 'visibility-e2e-password',
            professional: false,
        };
        await authenticateE2eUser(page, account);
        await page.request.patch('/api/v1/user', {
            data: { hasCompletedOnboarding: true },
        });
        await page.goto('/settings');
        await page.getByRole('tab', { name: 'Advanced Settings' }).click();

        const visibility = page.getByRole('switch', {
            name: /^Is my profile visible to other users\?/,
        });
        const professional = page.getByRole('switch', {
            name: /^Use HabitThread as a professional/,
        });
        await expect(visibility).not.toBeChecked();
        await professional.click();
        await expect(professional).toBeChecked();
        await expect(visibility).toBeChecked();
        await expect(visibility).toBeDisabled();
        await expect(
            page.getByRole('switch', { name: 'Allow clients to find me' }),
        ).toHaveCount(0);

        // A direct API write must not bypass the professional visibility rule.
        const hidden = await page.request.patch('/api/v1/user', {
            data: { isDiscoverable: false },
        });
        await expect(hidden).toBeOK();
        expect((await readFixtureProfile(page.request)).is_discoverable).toBe(
            true,
        );
        await page.reload();
        await page.getByRole('tab', { name: 'Advanced Settings' }).click();
        await expect(visibility).toBeChecked();
        await expect(visibility).toBeDisabled();

        const observer = await browser.newContext({
            baseURL,
            extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
            storageState: AUTH_STATE_PATH,
        });
        try {
            const personalSearchUrl = `/api/v1/user?type=search&fullName=${encodeURIComponent(account.fullName)}`;
            const personal = await observer.request.get(personalSearchUrl);
            await expect(personal).toBeOK();
            expect(
                z
                    .object({ data: z.array(z.object({ label: z.string() })) })
                    .parse(await personal.json()).data,
            ).toContainEqual(
                expect.objectContaining({ label: account.fullName }),
            );

            const professionalSearch = await observer.request.get(
                `/api/v1/professional?type=search&q=${encodeURIComponent(account.email)}`,
            );
            await expect(professionalSearch).toBeOK();
            expect(
                z
                    .object({ data: z.array(z.object({ email: z.string() })) })
                    .parse(await professionalSearch.json()).data,
            ).toContainEqual(expect.objectContaining({ email: account.email }));

            await expect(page).toHaveTitle(/HabitThread/);
            await expectAccessible(page, 'professional-visibility');
            for (const width of [1280, 390]) {
                await page.setViewportSize({ height: 844, width });
                await expectNoHorizontalOverflow(page);
                await expect(page.getByRole('tabpanel')).toHaveScreenshot(
                    `professional-visibility-${width}.png`,
                );
            }

            await professional.click();
            await expect(professional).not.toBeChecked();
            await expect(visibility).toBeEnabled();
            await expect(visibility).toBeChecked();
            await visibility.click();
            await expect(visibility).not.toBeChecked();
            await page.reload();
            await page.getByRole('tab', { name: 'Advanced Settings' }).click();
            await expect(visibility).not.toBeChecked();
            await expect(visibility).toBeEnabled();

            const hiddenPersonal =
                await observer.request.get(personalSearchUrl);
            await expect(hiddenPersonal).toBeOK();
            expect(
                z
                    .object({ data: z.array(z.object({ label: z.string() })) })
                    .parse(await hiddenPersonal.json()).data,
            ).not.toContainEqual(
                expect.objectContaining({ label: account.fullName }),
            );
        } finally {
            await observer.close();
        }
    },
);
