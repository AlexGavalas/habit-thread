import { type Locator, type Page, expect } from '@playwright/test';

import { expectAccessible } from './accessibility';
import { E2E_USER } from './auth';

export const expectComfortableDayColumns = async (
    drawer: Locator,
): Promise<void> => {
    const board = drawer.getByRole('region', { name: 'Weekly meal plan' });
    const firstSlide = board
        .getByRole('group', { name: 'Carousel slide' })
        .first();
    await expect
        .poll(async () => (await firstSlide.boundingBox())?.width ?? 0)
        .toBeGreaterThanOrEqual(256);
    const later = board.getByRole('button', { name: 'Show later days' });
    const earlier = board.getByRole('button', { name: 'Show earlier days' });
    for (
        let step = 0;
        step < 6 && (await later.getAttribute('aria-disabled')) === 'false';
        step += 1
    ) {
        await later.click();
    }
    await expect(
        board.getByRole('heading', { name: /^Sun / }),
    ).toBeInViewport();
    await expect(later).toHaveAttribute('aria-disabled', 'true');
    for (
        let step = 0;
        step < 6 && (await earlier.getAttribute('aria-disabled')) === 'false';
        step += 1
    ) {
        await earlier.click();
    }
    await expect(earlier).toHaveAttribute('aria-disabled', 'true');
};

export const expectReadOnlyFeedback = async (
    page: Page,
    screenshot: string,
): Promise<void> => {
    const drawer = page.getByRole('dialog').filter({
        has: page.getByRole('heading', {
            exact: true,
            name: E2E_USER.fullName,
        }),
    });
    const noteButton = drawer.getByRole('button', {
        exact: true,
        name: 'Note',
    });
    await expect(
        drawer.getByText('Rating: 4/5').filter({ visible: true }),
    ).toBeVisible();
    await noteButton.click();
    const note = page.getByRole('dialog', { name: 'Note' });
    await expect(note).toContainText('Client note');
    await expect(note.getByRole('textbox')).toHaveCount(0);
    await expect(
        drawer.getByRole('button', { name: /^(Edit note|Rate)$/ }),
    ).toHaveCount(0);
    await expectAccessible(page, 'professional-meal-feedback');
    await expect(note.getByText('Client note')).toBeFocused();
    // Accessibility scans may scroll both the drawer and its carousel.
    await drawer.evaluate((element) => {
        element.scrollTo(0, 0);
        element.querySelector('.mantine-Carousel-viewport')?.scrollTo(0, 0);
    });
    await expect(page).toHaveScreenshot(screenshot, {
        mask: [
            drawer.getByRole('banner'),
            drawer.getByText(E2E_USER.email, { exact: true }).locator('..'),
        ],
    });
    await page.keyboard.press('Escape');
    await expect(note).toBeHidden();
    await expect(drawer).toBeVisible();
    await expect(noteButton).toBeFocused();
};
