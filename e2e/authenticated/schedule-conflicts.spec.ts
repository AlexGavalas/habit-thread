import { expect, test } from '@playwright/test';

import { profileResponseSchema } from '../../src/schemas/user';
import { openDefaultSchedule } from '../support/schedules';

test('rejects removing occupied slots without changing the default or deleting meals', async ({
    page,
    request,
}) => {
    await page.setViewportSize({ height: 900, width: 1440 });
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
    await page.goto('/meal-plan?date=2026-01-19');
    await openDefaultSchedule(page);
    const defaults = page.getByRole('dialog', { name: 'Default schedule' });
    const slotName = await defaults
        .getByLabel('Name for meal slot 1')
        .inputValue();
    await defaults
        .getByRole('button', { exact: true, name: `Remove ${slotName}` })
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
    await openDefaultSchedule(page);
    await expect(defaults.getByLabel('Name for meal slot 1')).toHaveValue(
        slotName,
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
        .getByRole('button', { exact: true, name: `Remove ${slotName}` })
        .click();
    await expect(tuesday.getByRole('alert')).toContainText(
        'Your meal has not been deleted.',
    );
    await expect(
        tuesday.getByRole('button', { name: 'Save this day' }),
    ).toBeDisabled();
});
