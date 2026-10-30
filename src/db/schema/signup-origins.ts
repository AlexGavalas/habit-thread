import { sql } from 'drizzle-orm';
import { bigint, check, pgTable, text } from 'drizzle-orm/pg-core';

import { users } from './users';

// Separate from public profile data and from authentication/verification state.
// No row means unknown provenance; never infer it from current credentials.
export const userSignupOrigins = pgTable(
    'user_signup_origins',
    {
        method: text('method', { enum: ['password', 'google'] }).notNull(),
        user_id: bigint('user_id', { mode: 'number' })
            .primaryKey()
            .references(() => users.id, { onDelete: 'cascade' }),
    },
    (table) => [
        check(
            'user_signup_origins_method_check',
            sql`${table.method} in ('password', 'google')`,
        ),
    ],
);
