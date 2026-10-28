import { expect, test } from '@playwright/test';
import { z } from 'zod';

import en from '../../public/locales/en/common.json';
import { getResponseSchema } from '../../src/schemas/meal';
import { weeklyMealZoneSchema } from '../../src/schemas/weekly-meal-zone';
import { E2E_USER, authenticateE2eUser } from '../support/auth';
import { readFixtureProfile } from '../support/provision';

test('rejects unauthenticated API access and preserves the not-found page', async ({
    browser,
    baseURL,
}, testInfo) => {
    const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
        storageState: { cookies: [], origins: [] },
    });
    const response = await context.request.get(
        '/api/v1/measurement?type=summary',
    );
    expect(response.status()).toBe(401);
    const page = await context.newPage();
    await page.goto('/does-not-exist');
    await expect(
        page.getByRole('heading', { name: '404 - Page Not Found' }),
    ).toBeVisible();
    await context.close();
});

test('rejects invalid bulk edits before deleting existing meals', async ({
    request,
}) => {
    const profile = await readFixtureProfile(request);
    const zones = z
        .object({ data: z.array(weeklyMealZoneSchema) })
        .parse(
            await (
                await request.get(
                    '/api/v1/weekly-meal-zones?weekStart=2029-12-31',
                )
            ).json(),
        );
    const slot = zones.data.find((zone) => zone.day === '2030-01-01');
    if (!slot) {
        throw new Error('Expected a meal slot for the test date');
    }
    const meal = {
        day: slot.day,
        meal: 'Transaction original',
        section_key: slot.zoneKey,
        user_id: profile.id,
    };
    const created = await request.patch('/api/v1/meal', {
        data: { deletedIds: [], editedMeals: [], newMeals: [meal] },
    });
    expect(created.ok()).toBe(true);
    const url = '/api/v1/meal?startDate=2030-01-01&endDate=2030-01-02';
    const before = getResponseSchema.parse(
        await (await request.get(url)).json(),
    );
    const original = before.data?.find((item) => item.meal === meal.meal);
    expect(original).toBeDefined();

    const failed = await request.patch('/api/v1/meal', {
        data: {
            deletedIds: [original?.id],
            editedMeals: [],
            newMeals: [{ ...meal, day: 'invalid-date' }],
        },
    });
    expect(failed.status()).toBe(400);
    const after = getResponseSchema.parse(
        await (await request.get(url)).json(),
    );
    expect(after.data?.map((item) => item.id)).toContain(original?.id);
});

test('serializes repeated creates without duplicating a meal slot', async ({
    request,
}) => {
    const profile = await readFixtureProfile(request);
    const zones = z
        .object({ data: z.array(weeklyMealZoneSchema) })
        .parse(
            await (
                await request.get(
                    '/api/v1/weekly-meal-zones?weekStart=2033-01-03',
                )
            ).json(),
        );
    const slot = zones.data[0];
    if (!slot) {
        throw new Error('Expected a meal slot for the test week');
    }
    const input = {
        deletedIds: [],
        editedMeals: [],
        newMeals: [
            {
                day: slot.day,
                meal: 'Concurrent porridge',
                section_key: slot.zoneKey,
                user_id: profile.id,
            },
        ],
    };
    const results = await Promise.all([
        request.patch('/api/v1/meal', { data: input }),
        request.patch('/api/v1/meal', { data: input }),
    ]);
    expect(results.map((response) => response.status())).toEqual([200, 200]);
    const saved = getResponseSchema.parse(
        await (
            await request.get(
                '/api/v1/meal?startDate=2033-01-03&endDate=2033-01-09',
            )
        ).json(),
    );
    expect(
        saved.data?.filter((meal) => meal.section_key === slot.zoneKey),
    ).toHaveLength(1);
});

test('accepts a connection request atomically and removes the connection', async ({
    page,
    browser,
    baseURL,
}, testInfo) => {
    const other = await browser.newContext({
        baseURL,
        extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
        storageState: { cookies: [], origins: [] },
    });
    await authenticateE2eUser(await other.newPage(), {
        email: `connection-${testInfo.retry}-${E2E_USER.email}`,
        fullName: 'Connection migration test',
        password: 'HabitThreadTestPassword123!',
        professional: false,
    });
    const user = await readFixtureProfile(page.request);
    expect(
        (
            await other.request.post('/api/v1/notification', {
                data: { targetUserId: user.id },
            })
        ).ok(),
    ).toBe(true);

    await page.goto('/connections');
    await page.getByRole('button', { exact: true, name: 'Accept' }).click();
    await expect(
        page.getByRole('button', { exact: true, name: 'Accept' }),
    ).toBeHidden();
    await expect(
        page.getByText('Connection migration test', { exact: true }),
    ).toBeVisible();
    const reciprocal = (await (
        await other.request.get('/api/v1/connection')
    ).json()) as { data: unknown[] };
    expect(reciprocal.data).toHaveLength(1);
    await page
        .getByRole('button', { name: en.generic.actions.more_actions })
        .click();
    await page
        .getByRole('menuitem', {
            name: en.connections.manage_connections.remove_connection,
        })
        .click();
    await page
        .getByRole('dialog')
        .getByRole('button', {
            exact: true,
            name: en.connections.manage_connections.remove_connection,
        })
        .click();
    await expect(
        page.getByText('Connection migration test', { exact: true }),
    ).toBeHidden();
    await other.close();
});
