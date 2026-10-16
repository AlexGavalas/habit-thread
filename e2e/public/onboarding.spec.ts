import { expect, test } from '@playwright/test';

import { authenticateE2eUser } from '../support/auth';
import { expectNoHorizontalOverflow } from '../support/layout';

for (const viewport of [
    { height: 900, name: 'desktop', width: 1280 },
    { height: 568, name: 'mobile', width: 320 },
]) {
    test(`illustrated onboarding saves the professional choice on ${viewport.name}`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await authenticateE2eUser(
            page,
            {
                EMAIL: `onboarding-${viewport.name}@example.test`,
                FULL_NAME: 'Onboarding User',
                PASSWORD: 'onboarding-e2e-password',
            },
            'preview',
        );

        const welcome = page.getByRole('dialog', {
            name: 'Small habits. A healthier rhythm.',
        });
        await expect(welcome).toBeVisible();
        await expect(welcome.getByRole('checkbox')).not.toBeChecked();
        await expectNoHorizontalOverflow(page);
        const artwork = welcome.locator('img');
        await expect(artwork).toBeVisible();
        const artworkBox = await artwork.boundingBox();
        const titleBox = await welcome.getByRole('heading').boundingBox();
        expect(artworkBox).not.toBeNull();
        expect(titleBox).not.toBeNull();
        expect((artworkBox?.y ?? 0) + (artworkBox?.height ?? 0)).toBeLessThan(
            titleBox?.y ?? 0,
        );
        await expect(welcome).toHaveScreenshot(
            `onboarding-${viewport.name}.png`,
        );

        await welcome.getByRole('checkbox').check();
        await welcome.getByRole('button', { name: 'Continue' }).click();
        const choice = page.getByRole('dialog', {
            name: 'Make yourself at home',
        });
        await expect(choice).toBeVisible();
        await expect(choice).toHaveScreenshot(
            `onboarding-choice-${viewport.name}.png`,
        );
        await choice.getByRole('button', { name: 'Explore on my own' }).click();
        await expect(choice).toBeHidden();
        await page.reload();
        await expect(
            page.getByRole('heading', { name: 'Today’s meals' }),
        ).toBeVisible();
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await page.goto('/settings');
        await page.getByRole('tab', { name: 'Advanced Settings' }).click();
        await expect(
            page.getByRole('switch', {
                name: 'Use HabitThread as a professional',
            }),
        ).toBeChecked();
        await expect(
            page.getByRole('switch', { name: 'Allow clients to find me' }),
        ).not.toBeChecked();
    });
}

test('the optional tour still navigates and persists completion', async ({
    page,
}) => {
    await authenticateE2eUser(
        page,
        {
            EMAIL: 'onboarding-tour@example.test',
            FULL_NAME: 'Tour User',
            PASSWORD: 'onboarding-e2e-password',
        },
        'preview',
    );
    await page.getByRole('button', { exact: true, name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Show me around' }).click();
    await expect(
        page.getByText('Here you can see your meals for the day.', {
            exact: true,
        }),
    ).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Next' }).click();
    await page.getByRole('button', { exact: true, name: 'Next' }).click();
    await expect(page).toHaveURL('/meal-plan');
    await expect(
        page.getByText(
            'Here you can see and edit your meal plan for the week.',
            { exact: true },
        ),
    ).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Skip' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(
        page.getByRole('heading', { exact: true, name: 'Meal plan' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
