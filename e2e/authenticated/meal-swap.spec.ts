import { expect, test } from '@playwright/test';
import { z } from 'zod';

import { getResponseSchema } from '../../src/schemas/meal';
import { weeklyMealZoneSchema } from '../../src/schemas/weekly-meal-zone';

test('swaps and moves whole meals with immediate persistence', async ({
    page,
    request,
}) => {
    await page.setViewportSize({ height: 1000, width: 1440 });
    const week = '2031-02-03';
    const profile = z
        .object({ data: z.object({ id: z.number() }) })
        .parse(await (await request.get('/api/v1/user')).json());
    const schedule = z
        .object({ data: z.array(weeklyMealZoneSchema) })
        .parse(
            await (
                await request.get(`/api/v1/weekly-meal-zones?weekStart=${week}`)
            ).json(),
        );
    const [source, destination] = schedule.data;
    const empty = schedule.data[7];
    if (!source || !destination || !empty) {
        throw new Error('Expected at least three meal slots');
    }
    const initialMeals = [
        {
            day: source.day,
            items: [
                {
                    basis_grams: 100,
                    calories: 350,
                    name: 'Oats',
                    position: 0,
                    provider_food_id: 'oats',
                    quantity_grams: 80,
                    source: 'bls',
                },
            ],
            meal: 'Swap porridge',
            note: 'Keep oat milk',
            rating: 5,
            section_key: source.zoneKey,
            user_id: profile.data.id,
        },
        {
            day: destination.day,
            items: [],
            meal: 'Swap soup',
            note: 'Keep low salt',
            rating: 4,
            section_key: destination.zoneKey,
            user_id: profile.data.id,
        },
    ];
    expect(
        (
            await request.patch('/api/v1/meal', {
                data: {
                    deletedIds: [],
                    editedMeals: [],
                    newMeals: initialMeals,
                },
            })
        ).ok(),
    ).toBe(true);
    const readMeals = async (): Promise<z.infer<typeof getResponseSchema>> =>
        getResponseSchema.parse(
            await (
                await request.get(
                    `/api/v1/meal?startDate=${week}&endDate=2031-02-09`,
                )
            ).json(),
        );
    const original = await readMeals();
    await page.goto(`/meal-plan?date=${week}`);
    const board = page.getByRole('region', { name: 'Weekly meal plan' });
    const slots = board.locator('article');
    const first = slots.nth(0);
    const second = slots.nth(1);
    const third = slots.nth(7);
    await test.step('Reach the header handle after revealing the cell overlay', async () => {
        await first.locator('[data-meal-body]').hover();
        await expect(
            first.getByRole('button', { exact: true, name: 'Edit' }),
        ).toBeVisible();
        const handle = first.getByRole('button', { name: /^Swap or move/ });
        await handle.hover();
        await expect(
            first.getByRole('button', { exact: true, name: 'Edit' }),
        ).toHaveCount(0);
        await handle.click();
        await expect(
            second.getByRole('button', { name: /^Swap meals with/ }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
    });
    await first
        .getByRole('button', { name: /^Swap or move/ })
        .dragTo(second.locator('[data-meal-slot]'));
    await expect(first.getByText('Swap soup', { exact: true })).toBeVisible();
    await expect(
        second.getByText('Swap porridge', { exact: true }),
    ).toBeVisible();
    await expect(second.locator('[aria-busy="true"]')).toHaveCount(0);
    await second.getByRole('button', { name: /^Swap or move/ }).click();
    await third.getByRole('button', { name: /^Move meal to/ }).click();
    await expect(
        second.getByText('Swap porridge', { exact: true }),
    ).toHaveCount(0);
    await expect(
        third.getByText('Swap porridge', { exact: true }),
    ).toBeVisible();
    await test.step('Finish saving without leaving edited markers', async () => {
        await expect(third.locator('[aria-busy="true"]')).toHaveCount(0);
        await expect(second.locator('[data-edited]')).toHaveCount(0);
        await expect(third.locator('[data-edited]')).toHaveCount(0);
        await expect(first.locator('[data-edited]')).toHaveCount(0);
    });
    await expect(
        page.getByRole('button', { exact: true, name: 'Save' }),
    ).toHaveCount(0);
    await page.reload();
    const saved = await readMeals();
    expect(saved.data).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                ...original.data?.find((meal) => meal.meal === 'Swap porridge'),
                day: empty.day,
                items: expect.arrayContaining([
                    expect.objectContaining({ quantity_grams: 80 }),
                ]),
                section_key: empty.zoneKey,
            }),
            expect.objectContaining({
                ...original.data?.find((meal) => meal.meal === 'Swap soup'),
                day: source.day,
                section_key: source.zoneKey,
            }),
        ]),
    );
    await third.getByRole('button', { name: /^Swap or move/ }).focus();
    await page.keyboard.press('Enter');
    await expect(
        second.getByRole('button', { name: /^Move meal to/ }),
    ).toBeVisible();
    await expect(board).toHaveScreenshot('desktop-meal-swap-targets.png');
    await page.keyboard.press('Escape');
    await expect(
        second.getByRole('button', { name: /^Move meal to/ }),
    ).toHaveCount(0);
    await third.getByRole('button', { name: /^Swap or move/ }).click();
    await second.getByRole('button', { name: /^Move meal to/ }).focus();
    await page.keyboard.press('Enter');
    await expect(second.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(
        second.getByText('Swap porridge', { exact: true }),
    ).toBeVisible();
    await expect(third.getByText('Swap porridge', { exact: true })).toHaveCount(
        0,
    );
    await expect(board).toHaveScreenshot('desktop-meal-swap.png');
    await test.step('Reach an offscreen day on a smaller desktop', async () => {
        await page.setViewportSize({ height: 1000, width: 1100 });
        await second.hover();
        await second.getByRole('button', { name: /^Swap or move/ }).click();
        const next = page.getByRole('button', { name: 'Show later days' });
        await next.click();
        await next.click();
        await next.click();
        const sunday = slots.nth(30);
        await sunday.getByRole('button', { name: /^Move meal to/ }).click();
        await expect(
            sunday.getByText('Swap porridge', { exact: true }),
        ).toBeInViewport();
        await expect(board).toHaveScreenshot('desktop-meal-swap-narrow.png');
        await expect(sunday.locator('[aria-busy="true"]')).toHaveCount(0);
    });
});
