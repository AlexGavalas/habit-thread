import { expect, test } from '@playwright/test';

for (const width of [1440, 1100]) {
    test(`uses only the required space above meal-plan days at ${width}px`, async ({
        page,
    }) => {
        await page.setViewportSize({ height: 1000, width });
        await page.goto('/meal-plan');
        const instructions = page.getByRole('status').filter({
            hasText: 'Drag a meal handle',
        });
        const board = page.getByRole('region', { name: 'Weekly meal plan' });
        const next = board.getByRole('button', { name: 'Show later days' });
        const firstDay = board
            .getByRole('group', { name: 'Carousel slide' })
            .first();
        await expect(instructions).toBeVisible();
        await expect(firstDay).toBeVisible();

        if (width === 1440) {
            await expect(next).toHaveCount(0);
            const textBounds = await instructions.locator('..').boundingBox();
            const dayBounds = await firstDay.boundingBox();
            if (!textBounds || !dayBounds) {
                throw new Error(
                    'Expected visible instructions and calendar days',
                );
            }
            expect(
                dayBounds.y - textBounds.y - textBounds.height,
            ).toBeLessThanOrEqual(12);
            return;
        }

        await expect(next).toBeVisible();
        const controlsBounds = await next.boundingBox();
        const dayBounds = await firstDay.boundingBox();
        if (!controlsBounds || !dayBounds) {
            throw new Error(
                'Expected visible navigation controls and calendar days',
            );
        }
        expect(
            dayBounds.y - controlsBounds.y - controlsBounds.height,
        ).toBeLessThanOrEqual(12);
        expect(dayBounds.y).toBeGreaterThanOrEqual(
            controlsBounds.y + controlsBounds.height,
        );
        await next.click();
        await expect(
            board.getByRole('heading', { name: /^Fri / }),
        ).toBeInViewport();
    });
}
