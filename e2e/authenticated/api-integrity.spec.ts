import { expect, test } from '@playwright/test';

import en from '../../public/locales/en/common.json';
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

test('rolls back the whole meal save when an insert fails', async ({
    request,
}) => {
    const profile = (await (await request.get('/api/v1/user')).json()) as {
        data: { id: number };
    };
    const meal = {
        day: '2030-01-01 00:00',
        meal: 'Transaction original',
        section_key: 'morning_01/01/2030',
        user_id: profile.data.id,
    };
    const created = await request.patch('/api/v1/meal', {
        data: { deletedIds: [], editedMeals: [], newMeals: [meal] },
    });
    expect(created.ok()).toBe(true);
    const url = '/api/v1/meal?startDate=2030-01-01&endDate=2030-01-02';
    const before = (await (await request.get(url)).json()) as {
        data: { id: string; meal: string }[];
    };
    const original = before.data.find((item) => item.meal === meal.meal);
    expect(original).toBeDefined();

    const failed = await request.patch('/api/v1/meal', {
        data: {
            deletedIds: [original?.id],
            editedMeals: [],
            newMeals: [{ ...meal, day: 'invalid-date' }],
        },
    });
    expect(failed.status()).toBe(500);
    const after = (await (await request.get(url)).json()) as {
        data: { id: string }[];
    };
    expect(after.data.map((item) => item.id)).toContain(original?.id);
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

test('enforces upload size and missing-file responses', async ({ request }) => {
    const missing = await request.post('/api/v1/pool/upload', {
        multipart: { description: 'No file' },
    });
    test.skip(missing.status() === 404, 'Meal import is disabled');
    expect(missing.status()).toBe(400);
    const oversized = await request.post('/api/v1/pool/upload', {
        multipart: {
            file: {
                buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
                mimeType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                name: 'large.docx',
            },
        },
    });
    expect(oversized.status()).toBe(413);
});
