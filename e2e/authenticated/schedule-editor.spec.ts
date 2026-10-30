import { expect, test } from '@playwright/test';

import { expectAccessible } from '../support/accessibility';
import {
    expectModalScreenshot,
    expectNoHorizontalOverflow,
} from '../support/layout';
import { openDefaultSchedule as openDefault } from '../support/schedules';

for (const viewport of [
    { height: 500, width: 1024 },
    { height: 700, width: 390 },
]) {
    test(`keeps default schedule actions visible at ${viewport.width}px`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await page.goto('/meal-plan');
        await openDefault(page, viewport.width <= 1024);
        const drawer = page.getByRole('dialog', { name: 'Default schedule' });
        const save = drawer.getByRole('button', {
            name: 'Save from 19/01/2026',
        });
        await expect(save).toBeInViewport();
        await drawer
            .getByLabel('Time for meal slot 5')
            .scrollIntoViewIfNeeded();
        await expect(save).toBeInViewport();
        await expect(
            drawer.getByRole('heading', { name: 'Default schedule' }),
        ).toBeInViewport();
        await expectNoHorizontalOverflow(page);
        await expectAccessible(page, 'default-schedule');
        await expectModalScreenshot(
            drawer,
            `default-schedule-${viewport.width}.png`,
        );
    });
}

test('persists a daily default from next Monday without changing this week', async ({
    page,
}) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/meal-plan?date=2026-01-12');
    await openDefault(page);
    const defaults = page.getByRole('dialog', { name: 'Default schedule' });
    await defaults.getByLabel('Name for meal slot 1').fill('Early breakfast');
    await defaults.getByLabel('Time for meal slot 1').fill('08:30');
    await defaults
        .getByRole('button', { name: 'Save from 19/01/2026' })
        .click();
    await expect(defaults).toBeHidden();
    await page.reload();
    await expect(
        page.getByText('Early breakfast', { exact: true }),
    ).toHaveCount(0);

    await page.goto('/meal-plan?date=2026-01-19');
    await expect(
        page.getByText('Early breakfast', { exact: true }).first(),
    ).toBeVisible();
});

test('preserves a custom date when the pending default changes and restores inheritance on reset', async ({
    page,
}) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/meal-plan?date=2026-01-19');
    await openDefault(page);
    const defaults = page.getByRole('dialog', { name: 'Default schedule' });
    const defaultTime = await defaults
        .getByLabel('Time for meal slot 1')
        .inputValue();
    await page.keyboard.press('Escape');
    await page
        .getByRole('button', {
            exact: true,
            name: 'Edit schedule for Mon 19/01',
        })
        .click();
    const monday = page.getByRole('dialog', {
        name: 'Schedule for 19/01/2026',
    });
    await monday.getByLabel('Name for meal slot 1').fill('Late breakfast');
    await monday.getByLabel('Time for meal slot 1').fill('10:00');
    await monday.getByRole('button', { name: 'Save this day' }).click();
    await expect(monday).toBeHidden();
    await page.reload();
    await expect(
        page.getByText('Late breakfast', { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('img', { exact: true, name: 'Custom schedule' }).first(),
    ).toBeVisible();

    await openDefault(page);
    await defaults.getByLabel('Name for meal slot 1').fill('Routine breakfast');
    await defaults
        .getByRole('button', { name: 'Save from 19/01/2026' })
        .click();
    await expect(defaults).toBeHidden();
    await expect(
        page.getByText('Late breakfast', { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText('Routine breakfast', { exact: true }).first(),
    ).toBeVisible();
    await page
        .getByRole('button', {
            exact: true,
            name: 'Edit schedule for Mon 19/01',
        })
        .click();
    await monday.getByRole('button', { name: 'Use default schedule' }).click();
    await expect(monday).toBeHidden();
    await page.reload();
    await expect(page.getByText('Late breakfast', { exact: true })).toHaveCount(
        0,
    );
    await page
        .getByRole('button', {
            exact: true,
            name: 'Edit schedule for Mon 19/01',
        })
        .click();
    await expect(monday.getByLabel('Name for meal slot 1')).toHaveValue(
        'Routine breakfast',
    );
    await expect(monday.getByLabel('Time for meal slot 1')).toHaveValue(
        defaultTime,
    );
    await expect(
        monday.getByRole('button', { name: 'Use default schedule' }),
    ).toHaveCount(0);
});
