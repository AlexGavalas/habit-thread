import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';

import type { users } from '~db/schema';

export type User = InferSelectModel<typeof users>;
export type EditedUser = Partial<InferInsertModel<typeof users>>;

export type UserRole = 'professional';

export type UserProfile = User & {
    roles: UserRole[];
};
