'use client';

import { Alert, Stack, Switch, Title } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProfile } from '~hooks/use-profile';
import { showSuccessNotification } from '~util/notification';

import { setProfessionalRole } from '../../app/actions';
import type { ProfessionalActionResult } from '../../app/professional-actions';

export const ProfessionalSettings = (): ReactElement => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const isProfessional = profile?.roles.includes('professional') ?? false;

    const refreshProfile = async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: ['user'] });
    };

    const roleMutation = useMutation({
        mutationFn: (enabled: boolean): Promise<ProfessionalActionResult> =>
            setProfessionalRole({ enabled }),
        onSuccess: async (result): Promise<void> => {
            if (!result.ok) {
                setError(
                    result.error === 'active_clients'
                        ? t('professional.settings.active_clients_error')
                        : t('notification.error.message'),
                );
                return;
            }

            setError(null);
            await refreshProfile();
            showSuccessNotification({
                message: t('notification.success.message'),
                title: t('notification.success.title'),
            });
        },
    });

    const handleRoleChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        roleMutation.mutate(event.target.checked);
    };
    return (
        <Stack component="section" gap="sm">
            <Title order={4}>{t('professional.settings.title')}</Title>
            {error && (
                <Alert color="danger" variant="outline">
                    {error}
                </Alert>
            )}
            <Switch
                checked={isProfessional}
                description={t('professional.settings.description')}
                disabled={!profile || roleMutation.isPending}
                label={t('professional.settings.role_label')}
                onChange={handleRoleChange}
                w="fit-content"
            />
        </Stack>
    );
};
