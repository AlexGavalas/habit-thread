import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { resolve } from 'path';
import postgres from 'postgres';

import {
    assertE2eDatabaseUrl,
    loadE2eEnvironment,
} from './support/environment';

const globalSetup = async (): Promise<void> => {
    const { databaseUrl, mode } = loadE2eEnvironment();
    if (mode === 'preview') {
        return;
    }
    if (!databaseUrl) {
        throw new Error('Missing local e2e database URL');
    }
    assertE2eDatabaseUrl(databaseUrl);
    const sql = postgres(databaseUrl, { max: 1, prepare: false });
    try {
        await migrate(drizzle(sql), {
            migrationsFolder: resolve(process.cwd(), 'drizzle'),
        });
        // Local preparation only. All fixtures are provisioned through the app.
        await sql`TRUNCATE TABLE ${sql('users')} RESTART IDENTITY CASCADE`;
    } finally {
        await sql.end();
    }
};

export default globalSetup;
