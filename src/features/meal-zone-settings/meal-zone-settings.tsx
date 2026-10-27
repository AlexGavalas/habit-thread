'use client';

import { Button, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import type { ReactElement } from 'react';
import { type ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ReadError } from '~components/read-error';
import { DEFAULT_MEAL_ZONE_TIMES, ROWS } from '~constants/calendar';
import { SettingsActions } from '~features/settings-actions';
import { useMealZoneTimes } from '~hooks/use-meal-zone-times';
import { mealZoneTimesSchema } from '~schemas/meal-zone';
import { type MealZoneKey, type MealZoneTimes } from '~types/meal-zone';
import { requireActionSuccess } from '~util/action-result';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';

import { saveMealZoneTimes } from '../../app/actions';

export const MealZoneSettings = ({
    ownerUserId,
}: Readonly<{ ownerUserId?: number }>): ReactElement => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const {
        effectiveFrom,
        isFetching,
        times,
        isError,
        retry: handleRetry,
    } = useMealZoneTimes(undefined, ownerUserId);
    const [values, setValues] = useState<MealZoneTimes>(
        DEFAULT_MEAL_ZONE_TIMES,
    );
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!isError && !isFetching && !hasLoaded) {
            setValues(times);
            setHasLoaded(true);
        }
    }, [hasLoaded, isError, isFetching, times]);

    const validation = mealZoneTimesSchema.safeParse(values);

    const { isPending, mutate } = useMutation({
        mutationFn: async (): Promise<{
            effectiveFrom?: string;
            ok: boolean;
        }> => {
            const response = await saveMealZoneTimes({
                ownerUserId,
                times: values,
            });

            return requireActionSuccess(response);
        },
        onError: (): void => {
            showErrorNotification({
                message: t('meal_zone_settings.save_error'),
                title: t('notification.error.title'),
            });
        },
        onSuccess: async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: ['meal-zone-times', ownerUserId],
            });
            showSuccessNotification({
                message: t('meal_zone_settings.save_success'),
                title: t('notification.success.title'),
            });
        },
    });

    const handleChange =
        (key: MealZoneKey): ((event: ChangeEvent<HTMLInputElement>) => void) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;

            setValues((current) => ({
                ...current,
                [key]: value,
            }));
        };

    const handleSave = (): void => {
        if (validation.success) {
            mutate();
        }
    };

    const isBusy = isFetching || isPending;
    const formattedEffectiveDate = effectiveFrom
        ? format(parseISO(effectiveFrom), 'dd/MM/yyyy')
        : '';

    if (isError) {
        return <ReadError onRetry={handleRetry} isRetrying={isFetching} />;
    }

    return (
        <Stack gap="md">
            <div>
                <Title order={3}>{t('meal_zone_settings.title')}</Title>
                <Text c="dimmed" mt="xs" size="sm">
                    {t('meal_zone_settings.description', {
                        date: formattedEffectiveDate,
                    })}
                </Text>
            </div>
            <SimpleGrid cols={{ base: 1, md: 5, sm: 2 }} spacing="md">
                {ROWS.map(({ key }, index) => {
                    const previous = ROWS[index - 1];
                    const next = ROWS[index + 1];

                    return (
                        <TimeInput
                            key={key}
                            disabled={isBusy}
                            error={
                                !validation.success &&
                                validation.error.issues.some(
                                    (issue) => issue.path[0] === key,
                                )
                                    ? t('meal_zone_settings.order_error')
                                    : undefined
                            }
                            label={t(`meal_zone_settings.labels.${key}`)}
                            maxTime={next ? values[next.key] : '23:59'}
                            minTime={previous ? values[previous.key] : '00:00'}
                            onChange={handleChange(key)}
                            value={values[key]}
                        />
                    );
                })}
            </SimpleGrid>
            <SettingsActions>
                <Button
                    disabled={!validation.success || isFetching}
                    loading={isPending}
                    onClick={handleSave}
                >
                    {t('generic.actions.save')}
                </Button>
            </SettingsActions>
        </Stack>
    );
};
