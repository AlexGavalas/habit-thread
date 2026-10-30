/** @jest-environment node */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

describe('password signup provenance data migration', () => {
    it('backfills only credential holders, preserves known origins, and is repeatable', async () => {
        expect.hasAssertions();

        const databaseUrl = process.env.SIGNUP_BACKFILL_TEST_DATABASE_URL;
        assert(databaseUrl, 'Missing SIGNUP_BACKFILL_TEST_DATABASE_URL');
        const sql = postgres(databaseUrl, { max: 1 });
        const migration = readFileSync(
            join(
                process.cwd(),
                'drizzle/0013_backfill_password_signup_origin.sql',
            ),
            'utf8',
        );

        try {
            await sql.begin(async (tx) => {
                // Temporary tables shadow real ones and disappear on commit.
                // No application data is read or changed.
                await tx`
                    CREATE TEMP TABLE users (
                        id bigint PRIMARY KEY
                    ) ON COMMIT DROP
                `;
                await tx`INSERT INTO users (id) VALUES (1), (2), (3), (4), (5)`;
                await tx`
                    CREATE TEMP TABLE user_credentials (
                        user_id bigint PRIMARY KEY REFERENCES users(id),
                        password_hash text NOT NULL
                    ) ON COMMIT DROP
                `;
                await tx`
                    CREATE TEMP TABLE user_signup_origins (
                        user_id bigint PRIMARY KEY REFERENCES users(id),
                        method text NOT NULL
                            CHECK (method IN ('password', 'google'))
                    ) ON COMMIT DROP
                `;
                await tx`
                    INSERT INTO user_credentials (user_id, password_hash)
                    VALUES (1, 'test-hash'), (3, 'test-hash'), (4, 'test-hash')
                `;
                await tx`
                    INSERT INTO user_signup_origins (user_id, method)
                    VALUES (3, 'google'), (4, 'password'), (5, 'google')
                `;

                await tx.unsafe(migration);
                const expected = [
                    { method: 'password', userId: 1 },
                    { method: 'unknown', userId: 2 },
                    { method: 'google', userId: 3 },
                    { method: 'password', userId: 4 },
                    { method: 'google', userId: 5 },
                ];
                // User 2 has no credentials or recorded origin and stays unknown.
                const rows = await tx`
                    SELECT u.id::integer AS "userId",
                           COALESCE(o.method, 'unknown') AS method
                    FROM users u LEFT JOIN user_signup_origins o ON o.user_id = u.id
                    ORDER BY u.id
                `;
                expect(rows).toStrictEqual(expected);

                await tx.unsafe(migration);
                const repeated = await tx`
                    SELECT u.id::integer AS "userId",
                           COALESCE(o.method, 'unknown') AS method
                    FROM users u LEFT JOIN user_signup_origins o ON o.user_id = u.id
                    ORDER BY u.id
                `;
                expect(repeated).toStrictEqual(expected);
            });
        } finally {
            await sql.end();
        }
    });
});
