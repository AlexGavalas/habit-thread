/* oxlint-disable sort-keys */
import {
    bigint,
    boolean,
    doublePrecision,
    index,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    created_at: timestamp('created_at', { mode: 'string', withTimezone: true })
        .defaultNow()
        .notNull(),
    email: text('email').notNull().unique(),
    full_name: text('full_name').notNull(),
    has_completed_onboarding: boolean('has_completed_onboarding').default(
        false,
    ),
    height: doublePrecision('height'),
    id: bigint('id', { mode: 'number' })
        .primaryKey()
        .generatedByDefaultAsIdentity(),
    is_discoverable: boolean('is_discoverable').notNull().default(false),
    language: text('language').notNull(),
    target_weight: doublePrecision('target_weight'),
    food_preferences_positive: text('food_preferences_positive'),
    food_preferences_negative: text('food_preferences_negative'),
});

export const userCredentials = pgTable('user_credentials', {
    password_hash: text('password_hash').notNull(),
    user_id: bigint('user_id', { mode: 'number' })
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
});

export const userRoles = pgTable(
    'user_roles',
    {
        role: text('role').notNull(),
        user_id: bigint('user_id', { mode: 'number' })
            .notNull()
            .references(() => users.id, {
                onDelete: 'cascade',
            }),
    },
    (table) => [
        primaryKey({
            columns: [table.user_id, table.role],
            name: 'user_roles_user_id_role_pk',
        }),
        index('user_roles_role_idx').on(table.role),
    ],
);
