import { expect, test } from '@playwright/test';
import { z } from 'zod';

for (const width of [1440, 1100]) {
    test(`keeps the calendar stationary while a drag saves at ${width}px`, async ({
        page,
        request,
    }) => {
        const week = width === 1440 ? '2032-03-01' : '2032-03-08';
        const dateLabel = width === 1440 ? '01/03/2032' : '08/03/2032';
        const profile = z
            .object({ data: z.object({ id: z.number() }) })
            .parse(await (await request.get('/api/v1/user')).json());
        await expect(
            await request.patch('/api/v1/meal', {
                data: {
                    deletedIds: [],
                    editedMeals: [],
                    newMeals: [
                        {
                            day: week,
                            meal: 'Layout test porridge',
                            section_key: `morning_Mon ${dateLabel}`,
                            user_id: profile.data.id,
                        },
                    ],
                },
            }),
        ).toBeOK();
        await page.setViewportSize({ height: 1000, width });
        await page.goto(`/meal-plan?date=${week}`);
        const board = page.getByRole('region', { name: 'Weekly meal plan' });
        const firstDay = board
            .getByRole('group', { name: 'Carousel slide' })
            .first();
        const source = firstDay.locator('article').first();
        const destination = firstDay.locator('article').nth(1);
        await expect(board).toBeVisible();
        await expect(
            source.getByText('Layout test porridge', { exact: true }),
        ).toBeVisible();
        await source.hover();
        await source.getByRole('button', { name: /^Swap or move/ }).focus();
        const before = await board.boundingBox();
        if (!before) {
            throw new Error('Expected a visible calendar');
        }
        const gate = Promise.withResolvers<undefined>();
        await page.route(`**/meal-plan?date=${week}`, async (route) => {
            if (route.request().method() !== 'POST') {
                await route.continue();
                return;
            }
            await gate.promise;
            await route.abort('failed');
        });
        await source
            .getByRole('button', { name: /^Swap or move/ })
            .dragTo(destination.locator('[data-meal-slot]'));
        const saving = page.locator('[role="status"][data-saving="true"]');
        await expect(saving).toHaveText('Saving…');
        const during = await board.boundingBox();
        expect(during?.y).toBe(before.y);
        await expect(saving).toHaveCSS('position', 'fixed');
        const badge = await saving.boundingBox();
        expect(badge?.y).toBeGreaterThan(900);
        await expect(
            page.getByRole('button', { exact: true, name: 'Next week' }),
        ).toBeEnabled();
        await expect(
            page.getByRole('button', { exact: true, name: 'Meal library' }),
        ).toBeEnabled();
        await expect(
            page.getByRole('button', { exact: true, name: 'See overview' }),
        ).toBeEnabled();
        await expect(
            page.getByRole('button', { exact: true, name: 'Edit schedule' }),
        ).toBeDisabled();
        await expect(page).toHaveScreenshot(`meal-drag-saving-${width}.png`);
        await page
            .getByRole('button', { exact: true, name: 'More actions' })
            .click();
        await expect(
            page.getByRole('menuitem', { name: 'Copy to next week' }),
        ).toBeDisabled();
        await expect(
            page.getByRole('menuitem', { name: 'Print' }),
        ).toBeEnabled();
        await page.keyboard.press('Escape');
        const nextWeek = width === 1440 ? '2032-03-08' : '2032-03-15';
        const nextMeals = page.waitForResponse((response) =>
            response.url().includes(`/api/v1/meal?startDate=${nextWeek}`),
        );
        await page
            .getByRole('button', { exact: true, name: 'Next week' })
            .click();
        expect((await nextMeals).ok()).toBe(true);
        await expect(
            source.getByText('Layout test porridge', { exact: true }),
        ).toHaveCount(0);
        await expect(
            page.getByRole('button', { exact: true, name: 'Edit schedule' }),
        ).toBeEnabled();
        gate.resolve(undefined);
        await expect(saving).toHaveCount(0);
        const after = await board.boundingBox();
        expect(after?.y).toBe(before.y);
        await page
            .getByRole('button', { exact: true, name: 'Previous week' })
            .click();
        await expect(
            source.getByText('Layout test porridge', { exact: true }),
        ).toBeVisible();
    });
}
