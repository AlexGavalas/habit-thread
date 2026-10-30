import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { expectAccessible } from '../support/accessibility';
import { expectNoHorizontalOverflow } from '../support/layout';
import { readFixtureProfile } from '../support/provision';

const archiveSchema = z.object({
    data: z.object({
        profile: z.array(z.object({ email: z.string(), id: z.number() })),
        signupOrigins: z.array(
            z.object({
                method: z.enum(['password', 'google']),
                userId: z.number(),
            }),
        ),
    }),
    formatVersion: z.literal(1),
    generatedAt: z.iso.datetime(),
});

test('downloads only the session account even when a different owner is requested', async ({
    request,
}) => {
    const profile = await readFixtureProfile(request);
    const response = await request.get('/api/account-export?userId=0');
    await expect(response).toBeOK();
    expect(response.headers()['cache-control']).toBe('private, no-store');
    const zip = await JSZip.loadAsync(await response.body(), {
        checkCRC32: true,
    });
    const json = z
        .string()
        .parse(await zip.file('export.json')?.async('string'));
    const archive = archiveSchema.parse(JSON.parse(json));
    expect(archive.data.profile).toEqual([
        expect.objectContaining({ email: profile.email, id: profile.id }),
    ]);
    expect(archive.data.signupOrigins).toEqual([
        { method: 'password', userId: profile.id },
    ]);
    expect(json).not.toMatch(
        /passwordHash|password_hash|p256dh|access_token|refresh_token/u,
    );
});

test('rejects an anonymous download without redirecting or caching', async ({
    browser,
    baseURL,
}, testInfo) => {
    const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
        storageState: { cookies: [], origins: [] },
    });
    try {
        const response = await context.request.get('/api/account-export');
        expect(response.status()).toBe(401);
        expect(response.headers()['cache-control']).toBe('private, no-store');
    } finally {
        await context.close();
    }
});

for (const width of [390, 1280]) {
    test(
        `exports from accessible settings at ${width}px`,
        { tag: '@a11y' },
        async ({ page }) => {
            await page.setViewportSize({ height: 900, width });
            await page.goto('/settings?tab=advanced');
            const section = page.getByRole('region', {
                name: 'Export your account data',
            });
            const button = section.getByRole('button', {
                name: 'Download my data',
            });
            await expect(button).toBeVisible();
            const deleteButton = page.getByRole('button', {
                exact: true,
                name: 'Delete account',
            });
            expect((await button.boundingBox())?.height).toBe(
                (await deleteButton.boundingBox())?.height,
            );
            await expectNoHorizontalOverflow(page);
            await expectAccessible(page, `account-export-${width}`);
            await expect(section).toHaveScreenshot(
                `account-export-${width}.png`,
            );
            await button.focus();
            const downloaded = page.waitForEvent('download');
            await page.keyboard.press('Enter');
            const download = await downloaded;
            expect(download.suggestedFilename()).toBe(
                'habitthread-account-export.zip',
            );
            const path = z.string().parse(await download.path());
            const zip = await JSZip.loadAsync(await readFile(path), {
                checkCRC32: true,
            });
            expect(zip.file('export.json')).not.toBeNull();
            await expect(section.getByRole('status')).toContainText(
                'Your archive is ready',
            );
        },
    );
}
