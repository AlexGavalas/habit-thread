'use client';

import { Loader, Stack, Title } from '@mantine/core';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ReadError } from '~components/read-error';

import { DefaultScheduleForm } from './default-schedule-form';
import { type useDefaultSchedule } from './use-default-schedule';

type MealZoneSettingsProps = Readonly<{
    schedule: ReturnType<typeof useDefaultSchedule>;
    onClose?: () => void;
}>;

const DefaultScheduleSettings = ({
    schedule,
    onClose,
}: MealZoneSettingsProps): ReactElement => {
    const { query, mutation, save: handleSave } = schedule;
    const handleRetry = (): void => {
        void query.refetch();
    };
    if (query.isError && !query.data) {
        return (
            <ReadError onRetry={handleRetry} isRetrying={query.isFetching} />
        );
    }
    if (!query.data) {
        return <Loader />;
    }
    return (
        <>
            {query.isError && (
                <ReadError
                    onRetry={handleRetry}
                    isRetrying={query.isFetching}
                />
            )}
            <DefaultScheduleForm
                key={query.data.effectiveFrom}
                initialTemplate={query.data.template}
                effectiveFrom={query.data.effectiveFrom}
                onSave={handleSave}
                onClose={onClose}
                isSaving={mutation.isPending}
                error={mutation.error}
                saved={mutation.isSuccess}
            />
        </>
    );
};

export const MealZoneSettings = ({
    schedule,
    onClose,
}: MealZoneSettingsProps): ReactElement => {
    const { t } = useTranslation();
    const editor = (
        <DefaultScheduleSettings schedule={schedule} onClose={onClose} />
    );
    if (onClose) {
        return editor;
    }
    return (
        <Stack gap="md">
            <Title order={3}>{t('meal_plan.schedule.default_title')}</Title>
            {editor}
        </Stack>
    );
};
