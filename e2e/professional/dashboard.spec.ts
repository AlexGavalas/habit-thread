import { expect } from '@playwright/test';

import { getResponseSchema } from '../../src/schemas/meal';
import { expectAccessible } from '../support/accessibility';
import { E2E_USER } from '../support/auth';
import {
    acceptClientInvitation,
    test,
} from '../support/professional-dashboard';
import {
    expectComfortableDayColumns,
    expectReadOnlyFeedback,
} from '../support/professional-meal-plan';
import { readFixtureProfile } from '../support/provision';

test('accepts an invitation and preserves client feedback during professional edits', async ({
    clientPage,
    page,
}) => {
    await acceptClientInvitation(clientPage, page);

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
});

test(
    'searches clients and opens their meal plan with read-only feedback',
    { tag: '@a11y' },
    async ({ connectedClient: profile, page }) => {
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

        const drawer = page.getByRole('dialog').filter({
            has: page.getByRole('heading', {
                exact: true,
                name: E2E_USER.fullName,
            }),
        });

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
            drawer.getByRole('button', { name: 'Default schedule' }),
        ).toBeVisible();
        for (const width of [1280, 1600]) {
            await page.setViewportSize({ height: 720, width });
            await expect
                .poll(async () => (await drawer.boundingBox())?.width ?? 0)
                .toBe(width);
            await expectComfortableDayColumns(drawer);
        }
        await page.setViewportSize({ height: 720, width: 1280 });
        const scheduleRequests: string[] = [];
        page.on('request', (request) => {
            if (
                new URL(request.url()).pathname === '/api/v1/schedule-template'
            ) {
                scheduleRequests.push(request.url());
            }
        });
        await drawer.getByRole('button', { name: 'Default schedule' }).click();
        const scheduleEditor = page.getByRole('dialog', {
            name: 'Default schedule',
        });
        await expect(
            scheduleEditor.getByLabel('Name for meal slot 1'),
        ).toBeVisible();
        expect(scheduleRequests).toHaveLength(1);
        expect(
            new URL(scheduleRequests[0] ?? '').searchParams.get('ownerUserId'),
        ).toBe(String(profile.id));
        await page.keyboard.press('Escape');
        await expect(scheduleEditor).toBeHidden();
        await expect(drawer).toBeVisible();
        await expectReadOnlyFeedback(page, 'professional-meal-feedback.png');
        await page.setViewportSize({ height: 844, width: 390 });
        await expectReadOnlyFeedback(
            page,
            'professional-meal-feedback-mobile.png',
        );
        await expectAccessible(page, 'professional-client-drawer');

        await page.keyboard.press('Escape');
        await expect(drawer).toBeHidden();
        await expect(page).not.toHaveURL(/client=/);
    },
);
