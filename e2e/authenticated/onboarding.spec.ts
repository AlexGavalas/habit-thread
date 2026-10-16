import {
    type APIRequestContext,
    expect,
    type Locator,
    test,
} from '@playwright/test';

import en from '../../public/locales/en/common.json';

const setOnboardingCompletion = async (
    request: APIRequestContext,
    hasCompletedOnboarding: boolean,
): Promise<void> => {
    const response = await request.patch('/api/v1/user', {
        data: { hasCompletedOnboarding },
    });

    expect(response.ok()).toBe(true);
};

test.afterEach(async ({ request }) => {
    await setOnboardingCompletion(request, true);
});

test('anchors the redesigned home steps inside a mobile viewport', async ({
    page,
    request,
}) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await setOnboardingCompletion(request, false);
    await page.goto('/home');

    await page
        .getByRole('button', {
            exact: true,
            name: en.onboarding.welcome.continue,
        })
        .click();
    await page
        .getByRole('button', {
            exact: true,
            name: en.onboarding.welcome.start_tour,
        })
        .click();

    const dialog = page.getByRole('dialog');

    await expect(page.locator('#daily-meals-container')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.daily_meals);
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');
    await expect(dialog).toBeInViewport();

    await dialog
        .getByRole('button', {
            exact: true,
            name: en.generic.misc.next,
        })
        .click();

    await expect(page.locator('#health-trend-container')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.health_trend);
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');
    await expect(dialog).toBeInViewport();

    await dialog
        .getByRole('button', {
            exact: true,
            name: en.generic.actions.close,
        })
        .click();
});

test('guides a new user through the current home, meal plan, and settings UI', async ({
    page,
    request,
}) => {
    await setOnboardingCompletion(request, false);
    await page.goto('/home');

    await page
        .getByRole('button', {
            exact: true,
            name: en.onboarding.welcome.continue,
        })
        .click();
    await page
        .getByRole('button', {
            exact: true,
            name: en.onboarding.welcome.start_tour,
        })
        .click();

    const dialog = page.getByRole('dialog');
    const next = (): Locator =>
        dialog.getByRole('button', {
            exact: true,
            name: en.generic.misc.next,
        });

    await expect(page.locator('#daily-meals-container')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.daily_meals);
    await expect(dialog).toContainText('1 of 6');
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');

    await next().click();
    await expect(page.locator('#health-trend-container')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.health_trend);
    await expect(dialog).toContainText('2 of 6');
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');

    await next().click();
    await expect(page).toHaveURL('/meal-plan');
    await expect(page.locator('#meal-plan-container')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.meal_plan);
    await expect(dialog).toContainText('3 of 6');
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');

    const closeButton = dialog.getByRole('button', {
        exact: true,
        name: en.generic.actions.close,
    });
    const closeButtonBox = await closeButton.boundingBox();
    const bodyEndPadding = await dialog
        .locator('.mantine-Tour-body')
        .evaluate((body) =>
            Number.parseFloat(getComputedStyle(body).paddingInlineEnd),
        );

    expect(closeButtonBox).not.toBeNull();
    expect(bodyEndPadding).toBeGreaterThanOrEqual(closeButtonBox?.width ?? 0);

    await next().click();
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('#settings-tab-measurements')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.measurements);
    await expect(dialog).toContainText('4 of 6');
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');

    await next().click();
    await expect(page.locator('#settings-tab-personal')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.personal_settings);
    await expect(dialog).toContainText('5 of 6');
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');

    await next().click();
    await expect(page.locator('#settings-tab-advanced')).toBeVisible();
    await expect(dialog).toContainText(en.onboarding.content.advanced_settings);
    await expect(dialog).toContainText('6 of 6');
    await expect(dialog).not.toHaveAttribute('data-centered', 'true');

    await dialog
        .getByRole('button', {
            exact: true,
            name: en.generic.misc.done,
        })
        .click();

    await expect(dialog).toBeHidden();
    await expect
        .poll(async () => {
            const response = await request.get('/api/v1/user');
            const body = (await response.json()) as {
                data?: { has_completed_onboarding?: boolean };
            };

            return body.data?.has_completed_onboarding;
        })
        .toBe(true);
});
