import { expect, test } from '@playwright/test';

import en from '../../public/locales/en/common.json';
import { E2E_USER } from '../support/auth';

const hydrationCases = [
    {
        headings: [
            en.home_dashboard.todays_meals,
            en.home_dashboard.health_trend,
        ],
        path: '/home',
    },
    { headings: [], path: '/meal-plan' },
    { headings: [en.measurements, en.activities], path: '/settings' },
    {
        headings: [
            en.connections.manage_connection_requests.title,
            en.connections.manage_connections.title,
        ],
        path: '/connections',
    },
    { headings: [en.measurements, en.activities], path: '/gr/settings' },
];

for (const { headings, path } of hydrationCases) {
    test(`hydrates ${path} without duplicate browser data requests`, async ({
        page,
    }) => {
        const errors: string[] = [];
        const requests: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('request', (request) => {
            if (
                request.method() === 'GET' &&
                new URL(request.url()).pathname.startsWith('/api/v1/')
            ) {
                requests.push(request.url());
            }
        });

        await page.goto(path);
        for (const name of headings) {
            await expect(
                page.getByRole('heading', { exact: true, name }),
            ).toBeVisible();
        }

        if (path === '/meal-plan') {
            await expect(
                page.getByRole('button', { name: en.week.previous }),
            ).toBeEnabled();
            await page.getByRole('button', { name: en.see_overview }).click();
            const overview = page.getByRole('dialog', {
                name: en.modals.week_overview.title,
            });
            await expect(overview).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(overview).toBeHidden();
        }

        await page
            .getByRole('button')
            .filter({
                has: page.getByRole('img', { name: E2E_USER.fullName }),
            })
            .click();
        await expect(
            page.getByRole('menuitem', { name: en.settings }),
        ).toBeVisible();
        expect(requests).toEqual([]);
        expect(errors).toEqual([]);
    });
}
