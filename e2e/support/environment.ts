import { config as loadDotenv } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { resolve } from 'path';

import { DEFAULT_E2E_REQUEST_DATE } from '../../src/constants/e2e';
import { runIdSchema } from './fixtures';

export type E2eEnvironment = {
    baseUrl: string;
    databaseUrl?: string;
    mode: 'local' | 'preview';
    requestDate: string;
    runId: string;
    serverEnvironment: Record<string, string>;
};

const getEnvironmentValue = (key: string, fallback?: string): string => {
    const value = process.env[key] ?? fallback;

    if (!value) {
        throw new Error(
            `Missing ${key}. Copy .env.e2e.example to .env.e2e or set it in the environment.`,
        );
    }

    return value;
};

export const assertE2eDatabaseUrl = (databaseUrl: string): void => {
    const parsedUrl = new URL(databaseUrl);
    const databaseName = parsedUrl.pathname.split('/').filter(Boolean).at(-1);

    if (!databaseName?.toLowerCase().includes('e2e')) {
        throw new Error(
            `Refusing to reset database "${
                databaseName ?? 'unknown'
            }". The e2e database name must contain "e2e".`,
        );
    }
};

export const loadE2eEnvironment = (): E2eEnvironment => {
    loadDotenv({
        path: resolve(process.cwd(), '.env.e2e'),
        quiet: true,
    });

    const baseUrl = getEnvironmentValue(
        'PLAYWRIGHT_TEST_BASE_URL',
        'http://localhost:3000',
    );

    const mode = process.env.E2E_MODE === 'preview' ? 'preview' : 'local';
    const runId = runIdSchema.parse(
        process.env.E2E_RUN_ID ?? randomBytes(6).toString('hex'),
    );
    // Config loads before workers and the server start. Inherit one namespace
    // across all of them, even when a worker is restarted for a test retry.
    process.env.E2E_RUN_ID = runId;
    const requestDate = getEnvironmentValue(
        'E2E_REQUEST_DATE',
        DEFAULT_E2E_REQUEST_DATE,
    );

    if (mode === 'preview') {
        return { baseUrl, mode, requestDate, runId, serverEnvironment: {} };
    }

    const databaseUrl = getEnvironmentValue('E2E_DATABASE_URL');

    const googleId = getEnvironmentValue(
        'GOOGLE_ID',
        'habitthread-e2e-google-id',
    );

    const googleSecret = getEnvironmentValue(
        'GOOGLE_SECRET',
        'habitthread-e2e-google-secret',
    );

    const nextAuthSecret = getEnvironmentValue(
        'NEXTAUTH_SECRET',
        'habitthread-e2e-only-secret',
    );

    const nextAuthUrl = getEnvironmentValue('NEXTAUTH_URL', baseUrl);

    assertE2eDatabaseUrl(databaseUrl);

    const serverEnvironment = {
        E2E_DATABASE_URL: databaseUrl,
        E2E_MODE: mode,
        E2E_REQUEST_DATE: requestDate,
        GOOGLE_ID: googleId,
        GOOGLE_SECRET: googleSecret,
        NEXTAUTH_SECRET: nextAuthSecret,
        NEXTAUTH_URL: nextAuthUrl,
        PLAYWRIGHT_TEST_BASE_URL: baseUrl,
    };

    Object.assign(process.env, serverEnvironment, {
        DATABASE_URL: databaseUrl,
    });

    return {
        baseUrl,
        databaseUrl,
        mode,
        requestDate,
        runId,
        serverEnvironment,
    };
};
