import { drizzle } from 'drizzle-orm/pg-proxy';

import { readAccountExport } from './data';

const mockQueries: { params: unknown[]; sql: string }[] = [];
let mockTemplateRows: unknown[][];
const mockDb = drizzle((sql, params) => {
    mockQueries.push({ params, sql });
    return Promise.resolve({
        rows: sql.includes('from "schedule_templates"') ? mockTemplateRows : [],
    });
});
const mockTransaction = jest.fn(
    async (
        operation: (db: typeof mockDb) => Promise<unknown>,
    ): Promise<unknown> => operation(mockDb),
);

jest.mock('~db', () => ({
    getDb: (): { transaction: typeof mockTransaction } => ({
        transaction: mockTransaction,
    }),
}));

describe('account export ownership boundary', () => {
    beforeEach(() => {
        mockQueries.length = 0;
        mockTemplateRows = [];
    });

    it('scopes every table to the owner, children through owned parents, and relationships to participants', async () => {
        expect.hasAssertions();
        await readAccountExport(7);
        expect(mockQueries).toHaveLength(18);
        for (const query of mockQueries) {
            expect(query.sql).toContain(' where ');
            expect(query.params.length).toBeGreaterThan(0);
            expect(query.params.every((param) => param === 7)).toBe(true);
        }
        expect(
            mockQueries.find(({ sql }) => sql.includes('from "meal_items"'))
                ?.sql,
        ).toContain(
            'inner join "meals" on "meals"."id" = "meal_items"."meal_id" where "meals"."user_id" = $1',
        );
        expect(
            mockQueries.find(({ sql }) =>
                sql.includes('from "meal_pool_items"'),
            )?.sql,
        ).toContain('where "meals_pool"."user_id" = $1');
        expect(
            mockQueries.find(({ sql }) =>
                sql.includes('from "professional_clients"'),
            )?.sql,
        ).toContain(
            'where ("professional_clients"."client_user_id" = $1 or "professional_clients"."professional_user_id" = $2)',
        );
        expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
            accessMode: 'read only',
            isolationLevel: 'repeatable read',
        });
    });

    it('selects only allowlisted columns, never credentials or push subscriptions or counterpart profiles', async () => {
        expect.hasAssertions();
        await readAccountExport(7);
        const sql = mockQueries.map((query) => query.sql).join('\n');
        expect(sql).not.toMatch(
            /password|credential|token|session|verification|push_subscriptions|endpoint|p256dh|auth/i,
        );
        expect(sql).not.toContain('join "users"');
        expect(
            mockQueries.find((query) => query.sql.includes('from "users"'))
                ?.sql,
        ).toContain('where "users"."id" = $1');
    });

    it('validates stored recurring schedule JSON before exporting it', async () => {
        expect.hasAssertions();
        mockTemplateRows = [
            [
                '2026-01-01',
                {
                    kind: 'daily',
                    slots: [
                        { key: 'breakfast', label: 'Πρωινό', time: '08:00' },
                    ],
                },
                7,
            ],
        ];
        const data = await readAccountExport(7);
        expect(data.scheduleTemplates).toStrictEqual([
            {
                effectiveFrom: '2026-01-01',
                template: {
                    kind: 'daily',
                    slots: [
                        { key: 'breakfast', label: 'Πρωινό', time: '08:00' },
                    ],
                },
                userId: 7,
            },
        ]);
    });

    it('fails rather than silently dropping malformed stored schedules', async () => {
        expect.hasAssertions();
        mockTemplateRows = [['2026-01-01', { kind: 'invalid' }, 7]];
        await expect(readAccountExport(7)).rejects.toThrow(
            'Invalid discriminator',
        );
    });
});
