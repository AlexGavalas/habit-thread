import { z } from 'zod';

import {
    type ConnectionWithUser,
    type EditedConnection,
} from '~types/connection';

type ConnectionSchema = z.ZodType<EditedConnection>;

export const connectionSchema: ConnectionSchema = z.object({
    connection_user_id: z.number(),
    id: z.string().optional(),
    user_id: z.number(),
});

export const deleteRequestSchema = z.object({
    connectionId: z.string(),
    connectionUserId: z.number(),
});

export const postRequestSchema = z.object({
    connectionUserId: z.number(),
});

export const connectionsResponseSchema = z.object({
    data: z.array(
        z.object({
            connection_user_id: z.number(),
            id: z.string(),
            user_id: z.number(),
            users: z.object({ full_name: z.string() }),
        }) satisfies z.ZodType<ConnectionWithUser>,
    ),
});
