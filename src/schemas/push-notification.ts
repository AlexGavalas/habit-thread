import { z } from 'zod';

const validTimeZone = (value: string): boolean => {
    try {
        new Intl.DateTimeFormat('en', { timeZone: value }).format();
        return true;
    } catch {
        return false;
    }
};

export const pushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
        auth: z.string().min(1),
        p256dh: z.string().min(1),
    }),
});

export const deletePushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
});

export const notificationPreferencesSchema = z.object({
    mealReminderEnabled: z.boolean(),
    mealReminderTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid reminder time'),
    timezone: z.string().refine(validTimeZone, 'Invalid timezone'),
});

export const notificationPreferencesResponseSchema = z.object({
    data: z
        .object({
            meal_reminder_enabled: z.boolean(),
            meal_reminder_time: z.string(),
            next_notification_at: z.string().nullable(),
            timezone: z.string(),
            user_id: z.number(),
        })
        .nullable(),
});
