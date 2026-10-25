import { defineConfig, devices } from '@playwright/test';

import {
    AUTH_STATE_PATH,
    PROFESSIONAL_AUTH_STATE_PATH,
    VISUAL_AUTH_STATE_PATH,
} from './e2e/support/auth';
import { loadE2eEnvironment } from './e2e/support/environment';
import { E2E_REQUEST_DATE_HEADER } from './src/constants/e2e';

const environment = loadE2eEnvironment();
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const isCi = Boolean(process.env.CI);

export default defineConfig({
    expect: {
        timeout: 30000,
        toHaveScreenshot: {
            maxDiffPixelRatio: isCi ? 0.1 : 0,
            stylePath: 'e2e/styles.css',
        },
    },
    forbidOnly: isCi,
    fullyParallel: false,
    globalSetup: './e2e/global.setup.ts',
    projects: [
        {
            name: 'fixtures-setup',
            // Do not retry fresh-account provisioning against dirty partial state.
            // A rerun gets a new namespace instead.
            retries: 0,
            teardown: 'fixtures-cleanup',
            testMatch: /fixtures\.setup\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'fixtures-cleanup',
            testMatch: /fixtures\.teardown\.ts/,
        },
        {
            dependencies: ['fixtures-setup'],
            name: 'public',
            testMatch: /public\/.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            dependencies: ['fixtures-setup'],
            name: 'professional',
            testMatch: /professional\/.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: PROFESSIONAL_AUTH_STATE_PATH,
            },
        },
        {
            dependencies: ['fixtures-setup'],
            name: 'authenticated',
            testMatch: /authenticated\/.*\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: AUTH_STATE_PATH,
            },
        },
        {
            dependencies: ['fixtures-setup'],
            name: 'mobile-public',
            testMatch: /visual\/public\.spec\.ts/,
            use: { ...devices['Pixel 5'] },
        },
        {
            dependencies: ['fixtures-setup'],
            name: 'mobile-authenticated',
            testMatch: /visual\/(authenticated|connections)\.spec\.ts/,
            use: {
                ...devices['Pixel 5'],
                storageState: VISUAL_AUTH_STATE_PATH,
            },
        },
    ],
    reporter: [['html', { open: 'never' }]],
    retries: isCi ? 2 : 0,
    snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
    testDir: './e2e',
    use: {
        baseURL: environment.baseUrl,
        extraHTTPHeaders: {
            [E2E_REQUEST_DATE_HEADER]: environment.requestDate,
            ...(bypassSecret
                ? {
                      'x-vercel-protection-bypass': bypassSecret,
                      'x-vercel-set-bypass-cookie': 'true',
                  }
                : {}),
        },
        trace: 'on-first-retry',
    },
    workers: 1,
    ...(environment.mode === 'local' &&
        environment.databaseUrl && {
            webServer: {
                command: 'mise exec -- pnpm preview',
                env: {
                    ...environment.serverEnvironment,
                    DATABASE_URL: environment.databaseUrl,
                },
                reuseExistingServer: false,
                url: environment.baseUrl,
            },
        }),
});
