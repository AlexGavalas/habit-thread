import { expect, test, type Page } from '@playwright/test';

import { expectAccessible } from '../support/accessibility';
import {
    expectModalScreenshot,
    expectNoHorizontalOverflow,
} from '../support/layout';

const recordDrawerMotion = async (page: Page): Promise<void> => {
    await page.evaluate(() => {
        document.documentElement.dataset.scheduleDidAnimate = 'false';
        const sample = (): void => {
            const dialog = document.querySelector('[role="dialog"]');
            if (dialog) {
                const translation = new DOMMatrixReadOnly(
                    getComputedStyle(dialog).transform,
                ).m41;
                if (translation > 1 && translation < dialog.clientWidth - 1) {
                    document.documentElement.dataset.scheduleDidAnimate =
                        'true';
                    return;
                }
            }
            requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
    });
};

for (const viewport of [
    {
        date: '03/01/2040',
        dayLabel: 'Tue 03/01',
        height: 900,
        weekStart: '2040-01-02',
        width: 1440,
    },
    {
        date: '10/01/2040',
        dayLabel: 'Tue 10/01',
        height: 844,
        weekStart: '2040-01-09',
        width: 390,
    },
]) {
    test(`animates a new date and keeps its custom indicator beside the date at ${viewport.width}px`, async ({
        page,
    }) => {
        await page.setViewportSize({
            height: viewport.height,
            width: viewport.width,
        });
        await page.goto(`/meal-plan?date=${viewport.weekStart}`);
        if (viewport.width <= 1024) {
            await page
                .getByRole('button', { exact: true, name: viewport.dayLabel })
                .click();
        }
        await recordDrawerMotion(page);
        const trigger = page.getByRole('button', {
            exact: true,
            name:
                viewport.width > 1024
                    ? `Edit schedule for ${viewport.dayLabel}`
                    : 'Edit schedule for Tue',
        });
        await trigger.click();
        const drawer = page.getByRole('dialog', {
            name: `Schedule for ${viewport.date}`,
        });
        await expect(drawer).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute(
            'data-schedule-did-animate',
            'true',
        );
        await drawer
            .getByLabel('Name for meal slot 1')
            .fill('Custom breakfast');
        await expectModalScreenshot(
            drawer,
            `day-schedule-${viewport.width}.png`,
        );
        await drawer.getByRole('button', { name: 'Save this day' }).click();
        await expect(drawer).toBeHidden();
        await expect(trigger).toBeFocused();
        const heading = page
            .getByRole('heading')
            .filter({ hasText: viewport.dayLabel });
        const indicator = heading.getByRole('img', { name: 'Custom schedule' });
        await expect(indicator).toBeVisible();
        const dateBounds = await heading.boundingBox();
        const iconBounds = await indicator.boundingBox();
        if (!dateBounds || !iconBounds) {
            throw new Error('Missing visible date or schedule indicator');
        }
        expect(iconBounds.y).toBeGreaterThanOrEqual(dateBounds.y);
        expect(iconBounds.y + iconBounds.height).toBeLessThanOrEqual(
            dateBounds.y + dateBounds.height,
        );
        await expectNoHorizontalOverflow(page);
        await expectAccessible(page, 'custom-schedule-indicator');
        await expect(page).toHaveScreenshot(
            `custom-schedule-indicator-${viewport.width}.png`,
        );
        await indicator.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(indicator).toBeFocused();
        await expect(
            page.getByRole('tooltip').filter({ hasText: 'Custom schedule' }),
        ).toBeVisible();
    });
}

test('keeps default schedule configuration out of personal settings', async ({
    page,
}) => {
    await page.goto('/settings?tab=personal');
    await expect(
        page.getByRole('tab', { name: 'Personal Information' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
        page.getByRole('heading', { name: 'Food preferences' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Default schedule' }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Save from/ })).toHaveCount(
        0,
    );
});
