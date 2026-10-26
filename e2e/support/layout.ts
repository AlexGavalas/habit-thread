import { type Locator, type Page, expect } from '@playwright/test';

export const expectModalScreenshot = async (
    dialog: Locator,
    name: string,
): Promise<void> => {
    // Rounded corners expose page content through the translucent backdrop.
    // Isolate the modal capture without masking its content or relaxing pixel checks.
    await expect(dialog).toHaveScreenshot(name, {
        stylePath: ['e2e/styles.css', 'e2e/modal-screenshot.css'],
    });
};

export const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
};
