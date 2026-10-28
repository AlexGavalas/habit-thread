import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Exercise the layout rule without authentication.
// The fixture mirrors the two input wrappers and button in FoodDatabaseSearch.
for (const viewportWidth of [390, 1024, 1280]) {
    test(`food search controls fit narrow panels at viewport ${viewportWidth}`, async ({
        page,
    }) => {
        await page.setViewportSize({ height: 900, width: viewportWidth });
        const stylesheet = await readFile(
            'src/features/modals/meal/food-database-search.module.css',
            'utf8',
        );
        await page.setContent(`
            <style>
                :root { --mantine-spacing-xs: 8px; }
                * { box-sizing: border-box; }
                body { margin: 0; font: 16px/24px sans-serif; }
                label { display: block; }
                input, select { width: 100%; height: 36px; }
                button { height: 36px; padding: 0 18px; }
                ${stylesheet}
            </style>
            <div class="searchControls">
                <div>
                    <label for="food">Food or brand</label>
                    <input id="food" placeholder="e.g. oats, feta or Alpro">
                </div>
                <div>
                    <label for="market">Market</label>
                    <select id="market"><option>Germany</option></select>
                </div>
                <button class="searchButton">Search</button>
            </div>
        `);

        for (const panelWidth of [240, 280, 340]) {
            await page.locator('.searchControls').evaluate((element, width) => {
                element.style.width = `${width}px`;
            }, panelWidth);
            const food = await page.getByLabel('Food or brand').boundingBox();
            const market = await page.getByLabel('Market').boundingBox();
            const search = await page
                .getByRole('button', { name: 'Search' })
                .boundingBox();
            expect(food).not.toBeNull();
            expect(market).not.toBeNull();
            expect(search).not.toBeNull();
            // The query field must stay usable, not just avoid page overflow.
            expect(food?.width).toBeGreaterThanOrEqual(224);
            for (const box of [food, market, search]) {
                expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
                    panelWidth,
                );
            }
            expect(market?.y).toBeGreaterThanOrEqual(
                (food?.y ?? 0) + (food?.height ?? 0),
            );
            await expect(page.locator('label[for="food"]')).toHaveCSS(
                'height',
                '24px',
            );
        }
    });
}
