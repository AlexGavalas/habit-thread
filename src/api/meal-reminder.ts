import 'server-only';
import webpush from 'web-push';
import { z } from 'zod';

import { fetchMealsForDay } from '~api/meal';
import {
    claimMealReminderDelivery,
    deletePushSubscriptionByEndpoint,
    fetchDueMealReminders,
    fetchPushSubscriptions,
    releaseMealReminderDelivery,
    saveNotificationPreferences,
} from '~api/push-notification';
import { getNextReminderAt, getTomorrowInTimeZone } from '~util/meal-reminder';

const pushErrorSchema = z.object({ statusCode: z.number() });

const configureWebPush = (): void => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
        throw new Error('VAPID environment variables are not configured');
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
};

const getNotificationCopy = ({
    language,
    mealNames,
}: {
    language: string;
    mealNames: string[];
}): { body: string; title: string } => {
    const mealSummary = mealNames.join(' · ');
    const body =
        mealSummary.length > 240
            ? `${mealSummary.slice(0, 239)}…`
            : mealSummary;

    if (language === 'gr') {
        return {
            body: mealNames.length
                ? body
                : 'Δεν έχεις προγραμματίσει ακόμη τα αυριανά γεύματα.',
            title: 'Τα αυριανά γεύματα',
        };
    }

    return {
        body: mealNames.length
            ? body
            : "You haven't planned tomorrow's meals yet.",
        title: "Tomorrow's meals",
    };
};

const sendToSubscription = async ({
    payload,
    subscription,
}: {
    payload: string;
    subscription: {
        auth: string;
        endpoint: string;
        p256dh: string;
    };
}): Promise<boolean> => {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    auth: subscription.auth,
                    p256dh: subscription.p256dh,
                },
            },
            payload,
        );
        return true;
    } catch (error) {
        const parsed = pushErrorSchema.safeParse(error);
        const statusCode = parsed.success ? parsed.data.statusCode : undefined;

        if (statusCode === 404 || statusCode === 410) {
            await deletePushSubscriptionByEndpoint(subscription.endpoint);
            return false;
        }

        throw error;
    }
};

export const dispatchDueMealReminders = async (
    now = new Date(),
): Promise<{ failed: number; sent: number }> => {
    configureWebPush();

    const reminders = await fetchDueMealReminders(now);
    let failed = 0;
    let sent = 0;

    for (const reminder of reminders) {
        const time = reminder.meal_reminder_time.slice(0, 5);
        const targetDate = getTomorrowInTimeZone(now, reminder.timezone);
        const nextNotificationAt = getNextReminderAt({
            now,
            time,
            timezone: reminder.timezone,
        });

        const subscriptions = await fetchPushSubscriptions(reminder.user_id);

        if (!subscriptions.length) {
            await saveNotificationPreferences({
                enabled: true,
                nextNotificationAt,
                time,
                timezone: reminder.timezone,
                userId: reminder.user_id,
            });
            continue;
        }

        const isClaimed = await claimMealReminderDelivery({
            localDate: targetDate,
            userId: reminder.user_id,
        });

        if (!isClaimed) {
            await saveNotificationPreferences({
                enabled: true,
                nextNotificationAt,
                time,
                timezone: reminder.timezone,
                userId: reminder.user_id,
            });
            continue;
        }

        try {
            const meals = await fetchMealsForDay({
                day: targetDate,
                userId: reminder.user_id,
            });
            const payload = JSON.stringify({
                ...getNotificationCopy({
                    language: reminder.language,
                    mealNames: meals.map(({ meal }) => meal),
                }),
                icon: '/icons/icon-192x192.png',
                tag: `meal-plan-${targetDate}`,
                url: `/meal-plan?date=${targetDate}`,
            });
            const results = await Promise.allSettled(
                subscriptions.map((subscription) =>
                    sendToSubscription({ payload, subscription }),
                ),
            );
            const successful = results.filter(
                (result) => result.status === 'fulfilled' && result.value,
            ).length;

            if (successful === 0) {
                await releaseMealReminderDelivery({
                    localDate: targetDate,
                    userId: reminder.user_id,
                });
                failed += 1;
            } else {
                await saveNotificationPreferences({
                    enabled: true,
                    nextNotificationAt,
                    time,
                    timezone: reminder.timezone,
                    userId: reminder.user_id,
                });
                sent += 1;
            }
        } catch (error) {
            console.error('Failed to send meal reminder', error);
            await releaseMealReminderDelivery({
                localDate: targetDate,
                userId: reminder.user_id,
            });
            failed += 1;
        }
    }

    return { failed, sent };
};
