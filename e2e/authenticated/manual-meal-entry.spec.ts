import { expect, test } from '@playwright/test';
import { z } from 'zod';

import en from '../../public/locales/en/common.json';
import {
    expectModalScreenshot,
    expectNoHorizontalOverflow,
} from '../support/layout';

for (const width of [1280, 390]) {
    test(`creates a meal variation without replacing the source at ${width}px`, async ({
        page,
        request,
    }) => {
        const source = `Manual entry porridge ${width}`;
        const variation = `${source} with banana`;
        await expect(
            await request.post('/api/v1/pool/meal', {
                data: { templates: [{ content: source, items: [] }] },
            }),
        ).toBeOK();
        await page.setViewportSize({ height: 900, width });
        await page.goto('/meal-plan');
        await page
            .getByRole('button', {
                exact: true,
                name: width < 768 ? en.create_meal : en.meal_plan.meal_library,
            })
            .click();
        const dialog = page.getByRole('dialog', {
            name: en.modals.meal_pool.title,
        });
        const copy = en.modals.meal_pool.manual;
        const description = dialog.getByRole('textbox', {
            name: copy.description,
        });
        const save = dialog.getByRole('button', { name: copy.save });
        await expect(description).toBeEmpty();
        await expect(save).toBeDisabled();
        await expect(
            dialog.getByRole('textbox', { name: copy.search }),
        ).toHaveCount(0);
        await description.fill('My unsaved breakfast');
        await dialog.getByRole('button', { name: copy.use_previous }).click();
        const search = dialog.getByRole('textbox', { name: copy.search });
        await search.fill(source);
        await dialog.getByRole('button', { name: copy.use_meal }).click();
        await expect(description).toHaveValue('My unsaved breakfast');
        await dialog.getByRole('button', { name: copy.keep_draft }).click();
        await search.fill(source);
        await dialog.getByRole('button', { name: copy.use_meal }).click();
        await dialog.getByRole('button', { name: copy.replace }).click();
        await expect(description).toHaveValue(source);
        await expect(description).toBeFocused();
        await expect(save).toBeDisabled();
        await dialog.getByRole('button', { name: copy.undo }).click();
        await expect(description).toHaveValue('My unsaved breakfast');
        await dialog.getByRole('button', { name: copy.use_previous }).click();
        await search.fill(source);
        await dialog.getByRole('button', { name: copy.use_meal }).click();
        await dialog.getByRole('button', { name: copy.replace }).click();
        await description.fill(variation);
        await expectNoHorizontalOverflow(page);
        const footer = dialog.getByRole('contentinfo');
        await expect(
            footer.getByRole('button', { name: copy.save }),
        ).toBeVisible();
        await expect(
            footer.getByRole('button', { name: copy.use_previous }),
        ).toHaveCount(0);
        // The food-search flag changes the modal width, including in previews.
        const layout = (await dialog
            .getByRole('tab', { name: en.modals.meal_pool.tabs.food_database })
            .isVisible())
            ? 'wide'
            : 'compact';
        await expectModalScreenshot(
            dialog,
            `meal-library-manual-${width}-${layout}.png`,
        );
        const saved = page.waitForResponse(
            (response) =>
                response.url().includes('/api/v1/pool/meal') &&
                response.request().method() === 'POST',
        );
        await save.click();
        expect((await saved).ok()).toBe(true);
        await expect(dialog).toBeHidden();
        const response = await request.get(
            `/api/v1/pool/meal?q=${encodeURIComponent(source)}`,
        );
        await expect(response).toBeOK();
        const { data } = z
            .object({
                data: z.array(z.object({ content: z.string() })),
            })
            .parse(await response.json());
        expect(data.map(({ content }) => content)).toEqual(
            expect.arrayContaining([source, variation]),
        );
    });
}
