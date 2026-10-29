import { type Page } from '@playwright/test';

export const openDefaultSchedule = async (
    page: Page,
    mobile = false,
): Promise<void> => {
    if (mobile) {
        await page
            .locator('#meal-plan-container')
            .getByRole('button', { exact: true, name: 'More actions' })
            .click();
        await page.getByRole('menuitem', { name: 'Default schedule' }).click();
        return;
    }
    await page
        .getByRole('button', { exact: true, name: 'Default schedule' })
        .click();
};
