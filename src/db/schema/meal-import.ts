import { bigint, date, integer, pgTable } from 'drizzle-orm/pg-core';

import { users } from './users';

// One counter per user; no source documents or extracted meal content is stored.
export const mealImportUsage = pgTable('meal_import_usage', {
    attempts: integer('attempts').notNull(),
    usage_date: date('usage_date').notNull(),
    user_id: bigint('user_id', { mode: 'number' })
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
});
