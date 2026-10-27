import {
    type APIRequestContext,
    type Locator,
    type Page,
    expect,
    test,
} from '@playwright/test';
import { z } from 'zod';

import { weeklyMealZoneSchema } from '../../src/schemas/weekly-meal-zone';

const mealName =
    'A long meal name with porridge, fresh blueberries, banana, walnuts and oat milk to check that dragging never changes the calendar layout';

const seedMeal = async (
    request: APIRequestContext,
    week: string,
): Promise<void> => {
    const profile = z
        .object({ data: z.object({ id: z.number() }) })
        .parse(await (await request.get('/api/v1/user')).json());
    const { data: zones } = z
        .object({ data: z.array(weeklyMealZoneSchema) })
        .parse(
            await (
                await request.get(`/api/v1/weekly-meal-zones?weekStart=${week}`)
            ).json(),
        );
    const source = zones[0];
    if (!source) {
        throw new Error('Expected a source slot');
    }
    expect(
        (
            await request.patch('/api/v1/meal', {
                data: {
                    deletedIds: [],
                    editedMeals: [],
                    newMeals: [
                        {
                            day: source.day,
                            meal: mealName,
                            note: 'Keep this note when moving the meal',
                            section_key: source.zoneKey,
                            user_id: profile.data.id,
                        },
                    ],
                },
            })
        ).ok(),
    ).toBe(true);
};

const startDrag = async (page: Page, handle: Locator): Promise<void> => {
    await handle.locator('xpath=ancestor::*[@data-meal-slot]').hover();
    await handle.hover();
    const bounds = await handle.boundingBox();
    if (!bounds) {
        throw new Error('Expected a visible drag handle');
    }
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 12, y + 12, { steps: 4 });
    await page.mouse.move(x + 24, y + 24, { steps: 4 });
    await expect(handle).toHaveAttribute('aria-pressed', 'true');
};

const hoverEdge = async (
    page: Page,
    board: Locator,
    side: 'left' | 'right',
): Promise<void> => {
    const bounds = await board.boundingBox();
    if (!bounds) {
        throw new Error('Expected a visible calendar');
    }
    await page.mouse.move(
        side === 'left' ? bounds.x + 12 : bounds.x + bounds.width - 12,
        bounds.y + 160,
        { steps: 12 },
    );
};

test('reveals handles on hover and focus without shifting the calendar when dragging', async ({
    page,
    request,
}) => {
    const week = '2031-03-03';
    await seedMeal(request, week);
    await page.setViewportSize({ height: 1000, width: 1100 });
    await page.goto(`/meal-plan?date=${week}`);
    const board = page.getByRole('region', { name: 'Weekly meal plan' });
    const firstDay = board
        .getByRole('group', { name: 'Carousel slide' })
        .first();
    const slot = board.locator('article').first();
    const handle = slot.getByRole('button', { name: /^Swap or move/ });
    const instructions = page
        .getByRole('status')
        .filter({ hasText: 'Drag a meal handle' });
    const time = await slot.locator('time').boundingBox();
    const emptyTime = await board
        .locator('article')
        .nth(1)
        .locator('time')
        .boundingBox();
    if (!time || !emptyTime) {
        throw new Error('Expected visible slot times');
    }
    expect(time.x + time.width).toBeCloseTo(emptyTime.x + emptyTime.width, 1);
    await instructions.hover();
    await expect(handle).toHaveCSS('opacity', '0');
    await slot.locator('[data-meal-body]').hover();
    await expect(handle).toHaveCSS('opacity', '1');
    await instructions.hover();
    await expect(handle).toHaveCSS('opacity', '0');
    await handle.focus();
    await expect(handle).toHaveCSS('opacity', '1');
    const before = await firstDay.boundingBox();
    await startDrag(page, handle);
    const after = await firstDay.boundingBox();
    if (!before || !after) {
        throw new Error('Expected a visible day before and during the drag');
    }
    expect(after.y).toBeCloseTo(before.y, 1);
    await expect(
        page.getByRole('status').filter({ hasText: 'Choose a slot' }),
    ).toHaveAttribute('title', new RegExp(mealName));
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const cancelled = await firstDay.boundingBox();
    expect(cancelled?.y).toBeCloseTo(before.y, 1);
});

test('drags to offscreen days in either direction and drops without clicking carousel arrows', async ({
    page,
    request,
}) => {
    const week = '2031-03-10';
    await seedMeal(request, week);
    await page.setViewportSize({ height: 1000, width: 1100 });
    await page.goto(`/meal-plan?date=${week}`);
    const board = page.getByRole('region', { name: 'Weekly meal plan' });
    const slots = board.locator('article');
    const handle = slots.first().getByRole('button', { name: /^Swap or move/ });
    await startDrag(page, handle);
    await hoverEdge(page, board, 'right');
    await expect(board).toHaveAttribute('data-scroll-edge', 'right');
    await expect(
        board.getByRole('heading', { name: /^Sun / }),
    ).toBeInViewport();
    await hoverEdge(page, board, 'left');
    await expect(board).toHaveAttribute('data-scroll-edge', 'left');
    await expect(
        board.getByRole('heading', { name: /^Mon / }),
    ).toBeInViewport();
    await hoverEdge(page, board, 'right');
    await expect(
        board.getByRole('heading', { name: /^Sun / }),
    ).toBeInViewport();
    const destination = slots.nth(30);
    const target = destination.getByRole('button', { name: /^Move meal to/ });
    await expect(target).toBeInViewport({ ratio: 1 });
    const targetBounds = await target.boundingBox();
    if (!targetBounds) {
        throw new Error('Expected a visible drop destination');
    }
    await page.mouse.move(
        targetBounds.x + targetBounds.width / 2,
        targetBounds.y + targetBounds.height / 2,
        { steps: 10 },
    );
    // Manual Chromium drags need a move over the entered target to emit dragover.
    await page.mouse.move(
        targetBounds.x + targetBounds.width / 2 + 1,
        targetBounds.y + targetBounds.height / 2 + 1,
    );
    await page.mouse.up();
    await expect(board).not.toHaveAttribute('data-scroll-edge', /./);
    await expect(
        destination.getByText(mealName, { exact: true }),
    ).toBeVisible();
    await expect(slots.first().locator('[data-edited]')).toHaveCount(0);
    await expect(destination.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(
        page.getByRole('button', { exact: true, name: 'Save' }),
    ).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Show later days' }).click();
    await page.getByRole('button', { name: 'Show later days' }).click();
    await page.getByRole('button', { name: 'Show later days' }).click();
    await expect(
        destination.getByText(mealName, { exact: true }),
    ).toBeVisible();
});
