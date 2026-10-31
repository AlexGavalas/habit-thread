import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';

import type { users } from '~db/schema';
import type { userRoleSchema, userSummarySchema } from '~schemas/user';

export type User = InferSelectModel<typeof users>;
export type EditedUser = Partial<InferInsertModel<typeof users>>;

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserSummary = z.infer<typeof userSummarySchema>;

export type UserProfile = User & {
    roles: UserRole[];
};
