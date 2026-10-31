'use client';

import { Text } from '@mantine/core';
import type { ReactElement } from 'react';
import { type ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { notificationPreferencesResponseSchema } from '~schemas/push-notification';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';

import {
    getCurrentSubscription,
    isSubscriptionSaved,
    subscribeCurrentDevice,
    unsubscribeCurrentDevice,
} from './push-subscription';
import { saveReminderPreferences } from './reminder-api';
import { ReminderControls } from './reminder-controls';

export const MealReminders = (): ReactElement | null => {
    const { t } = useTranslation();
    const [detectedTimezone, setDetectedTimezone] = useState('');
    const [isMealReminderEnabled, setIsMealReminderEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPushEnabled, setIsPushEnabled] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSupported, setIsSupported] = useState<boolean | null>(null);
    const [time, setTime] = useState('20:00');
    const [timezone, setTimezone] = useState('UTC');

    useEffect(() => {
        const browserTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDetectedTimezone(browserTimezone);
        setTimezone(browserTimezone);
        setIsSupported(
            'serviceWorker' in navigator &&
                'PushManager' in window &&
                'Notification' in window,
        );

        const load = async (): Promise<void> => {
            try {
                const [preferencesResponse, subscription] = await Promise.all([
                    fetch('/api/v1/notification-preferences'),
                    getCurrentSubscription(),
                ]);

                if (subscription) {
                    setIsPushEnabled(await isSubscriptionSaved(subscription));
                }

                if (!preferencesResponse.ok) {
                    return;
                }

                const { data } = notificationPreferencesResponseSchema.parse(
                    await preferencesResponse.json(),
                );

                if (data) {
                    setIsMealReminderEnabled(data.meal_reminder_enabled);
                    setTime(data.meal_reminder_time.slice(0, 5));
                    setTimezone(data.timezone);
                }
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, []);

    const handleMealReminderChange = async (
        nextEnabled: boolean,
    ): Promise<void> => {
        setIsSaving(true);

        try {
            await saveReminderPreferences({
                enabled: nextEnabled,
                time,
                timezone,
            });
            setIsMealReminderEnabled(nextEnabled);
            showSuccessNotification({
                message: t('meal_reminders.saved'),
                title: t('notification.success.title'),
            });
        } catch {
            showErrorNotification({
                message: t('meal_reminders.error'),
                title: t('notification.error.title'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (): Promise<void> => {
        setIsSaving(true);

        try {
            await saveReminderPreferences({
                enabled: isMealReminderEnabled,
                time,
                timezone,
            });
            showSuccessNotification({
                message: t('meal_reminders.saved'),
                title: t('notification.success.title'),
            });
        } catch {
            showErrorNotification({
                message: t('meal_reminders.error'),
                title: t('notification.error.title'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleMealReminderSwitchChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        void handleMealReminderChange(event.target.checked);
    };

    const handleTimeChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setTime(event.target.value);
    };

    const handleUseCurrentTimezone = (): void => {
        setTimezone(detectedTimezone);
    };

    const handlePushChange = async (nextEnabled: boolean): Promise<void> => {
        setIsSaving(true);

        try {
            if (nextEnabled) {
                await subscribeCurrentDevice();
            } else {
                await unsubscribeCurrentDevice();
            }

            setIsPushEnabled(nextEnabled);
            showSuccessNotification({
                message: t(
                    nextEnabled
                        ? 'meal_reminders.device_enabled'
                        : 'meal_reminders.device_disabled',
                ),
                title: t('notification.success.title'),
            });
        } catch {
            showErrorNotification({
                message: t('meal_reminders.error'),
                title: t('notification.error.title'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePushSwitchChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        void handlePushChange(event.target.checked);
    };

    if (isSupported === null) {
        return null;
    }

    if (!isSupported) {
        return <Text>{t('meal_reminders.unsupported')}</Text>;
    }

    const isBusy = isLoading || isSaving;

    return (
        <ReminderControls
            detectedTimezone={detectedTimezone}
            isBusy={isBusy}
            isMealReminderEnabled={isMealReminderEnabled}
            isPushEnabled={isPushEnabled}
            onMealReminderChange={handleMealReminderSwitchChange}
            onPushChange={handlePushSwitchChange}
            onSave={handleSave}
            onTimeChange={handleTimeChange}
            onUseCurrentTimezone={handleUseCurrentTimezone}
            time={time}
            timezone={timezone}
        />
    );
};
