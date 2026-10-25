import { expect, test as teardown } from '@playwright/test';
import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'path';
import { z } from 'zod';

import {
    ACCOUNT_STATE_DIRECTORY,
    AUTH_DIRECTORY,
    E2E_RUN_ID,
} from './support/auth';
import { isRunAccount } from './support/fixtures';

teardown(
    'delete only accounts owned by this run',
    async ({ baseURL, playwright }, testInfo) => {
        teardown.slow();
        const accounts = await readdir(ACCOUNT_STATE_DIRECTORY).catch(
            (error: unknown) => {
                if (
                    error instanceof Error &&
                    'code' in error &&
                    error.code === 'ENOENT'
                ) {
                    return [];
                }
                throw error;
            },
        );
        for (const file of accounts) {
            const email = decodeURIComponent(file.replace(/\.json$/, ''));
            if (!isRunAccount(email, E2E_RUN_ID)) {
                throw new Error(
                    'Refusing to clean up an account outside this e2e run',
                );
            }
            const request = await playwright.request.newContext({
                baseURL,
                extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders,
                storageState: resolve(ACCOUNT_STATE_DIRECTORY, file),
            });
            try {
                const response = await request.get('/api/v1/user');
                await expect(response).toBeOK();
                const profile = z
                    .object({ data: z.object({ email: z.email() }) })
                    .parse(await response.json()).data;
                expect(profile.email).toBe(email);
                await expect(await request.delete('/api/v1/user')).toBeOK();
            } finally {
                await request.dispose();
            }
        }
        await rm(AUTH_DIRECTORY, { force: true, recursive: true });
    },
);
