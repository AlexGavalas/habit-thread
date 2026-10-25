import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

/**
 * Scan the whole rendered page, including portals. Call only after asserting
 * that the intended page/dialog/error state is visible and ready.
 */
export const expectAccessible = async (
    page: Page,
    state: string,
): Promise<void> => {
    await page.evaluate(async () => {
        await document.fonts.ready;
        // Visibility alone does not mean a dialog's fade/slide has finished.
        // Scan its settled colors, not a partially transparent animation frame.
        await new Promise<void>((resolve) =>
            requestAnimationFrame(() => {
                resolve();
            }),
        );
        await Promise.all(
            document
                .getAnimations()
                .filter(
                    (animation) =>
                        animation.effect?.getComputedTiming().iterations !==
                        Infinity,
                )
                .map((animation) => animation.finished.catch(() => undefined)),
        );
    });
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

    await test.info().attach(`accessibility-${state}`, {
        body: JSON.stringify(
            {
                incomplete: results.incomplete,
                state,
                testEngine: results.testEngine,
                url: page.url(),
                violations: results.violations,
            },
            null,
            2,
        ),
        contentType: 'application/json',
    });

    // Continue scanning subsequent states so the report shows the whole journey.
    expect
        .soft(results.violations, `${state}: WCAG A/AA violations`)
        .toEqual([]);
};

/** Verify initial focus and both tab-wrap boundaries of dialogs with a close button. */
export const expectDialogFocusContained = async (
    page: Page,
    lastControl: Locator,
): Promise<void> => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator(':focus')).toHaveCount(1);
    const close = dialog.getByRole('button', { exact: true, name: 'Close' });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(lastControl).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
};
