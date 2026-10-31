import { z } from 'zod';

import {
    type EditedNotification,
    type NotificationWithUser,
} from '~types/notification';

type NotificationSchema = z.ZodType<EditedNotification>;

export const notificationSchema: NotificationSchema = z.object({
    date: z.string(),
    id: z.string().optional(),
    notification_type: z.string(),
    request_user_id: z.number(),
    target_user_id: z.number(),
});

export const postRequestSchema = z.object({
    targetUserId: z.number(),
});

export const connectionRequestsResponseSchema = z.object({
    data: z.array(
        z.object({
            date: z.string(),
            id: z.string(),
            notification_type: z.string(),
            request_user_id: z.number(),
            target_user_id: z.number(),
            users: z.object({ full_name: z.string() }),
        }) satisfies z.ZodType<NotificationWithUser>,
    ),
});
