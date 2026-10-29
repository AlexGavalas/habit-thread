import { expect, test, type Page } from '@playwright/test';

import { profileResponseSchema } from '../../src/schemas/user';
import { expectAccessible } from '../support/accessibility';
import {
    expectModalScreenshot,
    expectNoHorizontalOverflow,
} from '../support/layout';

const openDefault = async (page: Page, mobile = false): Promise<void> => {
    if (mobile) {
        await page
            .locator('#meal-plan-container')
            .getByRole('button', { exact: true, name: 'More actions' })
            .click();
        await page.getByRole('menuitem', { name: 'Default schedule' }).click();
        return;
    }
    await page
        .getByRole('button', { exact: true, name: 'Default schedule' })
        .click();
};

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

test('persists next-week defaults, date overrides, resets and occupied-slot protection', async ({
    page,
    request,
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
        '08:30',
    );
    await expect(
        monday.getByRole('button', { name: 'Use default schedule' }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    const profile = await request.get('/api/v1/user');
    const owner = profileResponseSchema.parse(await profile.json()).data;
    const seed = await request.patch('/api/v1/meal', {
        data: {
            deletedIds: [],
            editedMeals: [],
            newMeals: [
                {
                    day: '2026-01-20',
                    meal: 'Protected porridge',
                    section_key: 'morning_Tue 20/01/2026',
                    user_id: owner.id,
                },
            ],
            weekStart: '2026-01-19',
        },
    });
    await expect(seed).toBeOK();
    await openDefault(page);
    await defaults
        .getByRole('button', { exact: true, name: 'Remove Routine breakfast' })
        .click();
    await defaults
        .getByRole('button', { name: 'Save from 19/01/2026' })
        .click();
    await expect(defaults.getByRole('alert')).toContainText('2026-01-20');
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(
        page.getByText('Protected porridge', { exact: true }).first(),
    ).toBeVisible();
    await openDefault(page);
    await expect(defaults.getByLabel('Name for meal slot 1')).toHaveValue(
        'Routine breakfast',
    );
    await page.keyboard.press('Escape');
    await page
        .getByRole('button', {
            exact: true,
            name: 'Edit schedule for Tue 20/01',
        })
        .click();
    const tuesday = page.getByRole('dialog', {
        name: 'Schedule for 20/01/2026',
    });
    await tuesday
        .getByRole('button', { exact: true, name: 'Remove Routine breakfast' })
        .click();
    await expect(tuesday.getByRole('alert')).toContainText(
        'Your meal has not been deleted.',
    );
    await expect(
        tuesday.getByRole('button', { name: 'Save this day' }),
    ).toBeDisabled();
});
