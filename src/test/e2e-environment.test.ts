import { loadE2eEnvironment } from '../../e2e/support/environment';

jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('e2e environment', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shares one generated namespace across config and worker environment loads', () => {
        jest.replaceProperty(process, 'env', {
            E2E_MODE: 'preview',
            NODE_ENV: 'test',
        });
        const first = loadE2eEnvironment();
        expect(loadE2eEnvironment().runId).toBe(first.runId);
        expect(process.env.E2E_RUN_ID).toBe(first.runId);
    });

    it('does not pass a database URL into preview setup', () => {
        jest.replaceProperty(process, 'env', {
            E2E_DATABASE_URL: 'postgres://localhost/not-an-e2e-database',
            E2E_MODE: 'preview',
            E2E_RUN_ID: 'run-1',
            NODE_ENV: 'test',
        });
        const environment = loadE2eEnvironment();
        expect(environment.databaseUrl).toBeUndefined();
        expect(environment.serverEnvironment).toStrictEqual({});
    });

    it('preserves the namespace and database safety guard in local mode', () => {
        jest.replaceProperty(process, 'env', {
            E2E_DATABASE_URL: 'postgres://localhost/habitthread_e2e',
            E2E_RUN_ID: 'run-1',
            NODE_ENV: 'test',
        });
        expect(loadE2eEnvironment().runId).toBe('run-1');
        process.env.E2E_DATABASE_URL = 'postgres://localhost/production';
        expect(() => loadE2eEnvironment()).toThrow(
            'Refusing to reset database',
        );
    });
});
