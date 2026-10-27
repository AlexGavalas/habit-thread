import { expect, test } from '@playwright/test';

import { getResponseSchema } from '../../src/schemas/meal';
import { expectAccessible } from '../support/accessibility';
import {
    AUTH_STATE_PATH,
    E2E_USER,
    PROFESSIONAL_E2E_USER,
} from '../support/auth';
import { readFixtureProfile } from '../support/provision';

test(
    'accepts an invitation and opens the assigned client meal plan',
    { tag: '@a11y' },
    async ({ baseURL, browser, page }, testInfo) => {
        const clientContext = await browser.newContext({
            baseURL,
            extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
            storageState: AUTH_STATE_PATH,
        });
        const clientPage = await clientContext.newPage();

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

        const profile = await readFixtureProfile(clientPage.request);
        const originalMeal = {
            day: '2026-01-12',
            meal: 'Client meal',
            note: 'Client note',
            rating: 4,
            section_key: 'morning_Mon 12/01/2026',
            user_id: profile.id,
        };
        const createResponse = await clientPage.request.patch('/api/v1/meal', {
            data: { deletedIds: [], editedMeals: [], newMeals: [originalMeal] },
        });
        expect(createResponse.ok()).toBe(true);

        const mealsUrl = '/api/v1/meal?startDate=2026-01-12&endDate=2026-01-18';
        const mealsResponse = await clientPage.request.get(mealsUrl);
        await expect(mealsResponse).toBeOK();
        const meals = getResponseSchema.parse(await mealsResponse.json());
        const clientMeal = meals.data?.find(
            ({ section_key }) => section_key === originalMeal.section_key,
        );
        expect(clientMeal).toBeDefined();

        const delegatedResponse = await page.request.patch('/api/v1/meal', {
            data: {
                deletedIds: [],
                editedMeals: [
                    {
                        ...clientMeal,
                        meal: 'Professional edit',
                        note: 'Professional note',
                        rating: 1,
                    },
                ],
                newMeals: [],
                ownerUserId: profile.id,
            },
        });
        expect(delegatedResponse.ok()).toBe(true);

        const updatedMealsResponse = await clientPage.request.get(mealsUrl);
        await expect(updatedMealsResponse).toBeOK();
        const updatedMeals = getResponseSchema.parse(
            await updatedMealsResponse.json(),
        );
        expect(
            updatedMeals.data?.find(
                ({ section_key }) => section_key === originalMeal.section_key,
            ),
        ).toMatchObject({
            meal: 'Professional edit',
            note: 'Client note',
            rating: 4,
        });

        await page.goto('/professional');

        await expect(page.getByText('1 of 10 clients')).toBeVisible();
        await expect(page.getByText(E2E_USER.email)).toBeVisible();
        await expectAccessible(page, 'professional-dashboard');

        await page.getByLabel('Search clients').fill(E2E_USER.email);
        await page.getByRole('button', { name: 'Search' }).click();
        await expect
            .poll(() => new URL(page.url()).searchParams.get('q'))
            .toBe(E2E_USER.email);

        await page
            .getByRole('button', {
                exact: true,
                name: `${E2E_USER.fullName} ${E2E_USER.email}`,
            })
            .click();

        const drawer = page.getByRole('dialog');

        await expect(drawer).toBeVisible();
        await expect(
            drawer.getByRole('heading', {
                exact: true,
                name: E2E_USER.fullName,
            }),
        ).toBeVisible();
        await expect(
            drawer.getByRole('button', { name: 'Previous week' }),
        ).toBeVisible();
        await expect(
            drawer.getByRole('heading', { name: 'Meal schedule' }),
        ).toBeVisible();
        await expectAccessible(page, 'professional-client-drawer');

        await page.keyboard.press('Escape');
        await expect(drawer).toBeHidden();
        await expect(page).not.toHaveURL(/client=/);

        await clientContext.close();
    },
);
