import { type Page, expect, test as base } from '@playwright/test';

import { AUTH_STATE_PATH, E2E_USER, PROFESSIONAL_E2E_USER } from './auth';
import { readFixtureProfile } from './provision';

export const acceptClientInvitation = async (
    clientPage: Page,
    page: Page,
): Promise<void> => {
    await clientPage.goto('/connections');
    await clientPage
        .getByRole('button', { name: 'Find a professional' })
        .click();
    await clientPage
        .getByLabel('Search professionals')
        .fill(PROFESSIONAL_E2E_USER.email);
    await expect(
        clientPage.getByText(PROFESSIONAL_E2E_USER.email),
    ).toBeVisible();
    await clientPage
        .getByRole('button', { exact: true, name: 'Invite' })
        .click();
    await expect(
        clientPage.getByRole('button', {
            exact: true,
            name: 'Invitation pending',
        }),
    ).toBeDisabled();
    await page.goto('/connections');
    await expect(page.getByText(E2E_USER.email)).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Accept' }).click();
    await expect(page.getByText(E2E_USER.email)).not.toBeVisible();
};

export const test = base.extend<{
    clientPage: Page;
    connectedClient: Awaited<ReturnType<typeof readFixtureProfile>>;
}>({
    clientPage: async ({ baseURL, browser }, provide, testInfo) => {
        const context = await browser.newContext({
            baseURL,
            extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
            storageState: AUTH_STATE_PATH,
        });
        try {
            await provide(await context.newPage());
        } finally {
            try {
                const clientPage = await context.newPage();
                await clientPage.goto('/connections');
                const stop = clientPage.getByRole('button', {
                    exact: true,
                    name: 'Stop relationship',
                });
                await expect(
                    stop.or(
                        clientPage.getByRole('button', {
                            name: 'Find a professional',
                        }),
                    ),
                ).toBeVisible();
                if (await stop.isVisible()) {
                    await stop.click();
                    await expect(stop).toBeHidden();
                }
            } finally {
                await context.close();
            }
        }
    },
    connectedClient: async ({ clientPage, page }, provide) => {
        const profile = await readFixtureProfile(clientPage.request);
        await acceptClientInvitation(clientPage, page);
        const meal = await clientPage.request.patch('/api/v1/meal', {
            data: {
                deletedIds: [],
                editedMeals: [],
                newMeals: [
                    {
                        day: '2026-01-12',
                        meal: 'Professional edit',
                        note: 'Client note',
                        rating: 4,
                        section_key: 'morning_Mon 12/01/2026',
                        user_id: profile.id,
                    },
                ],
            },
        });
        await expect(meal).toBeOK();
        await provide(profile);
    },
});
