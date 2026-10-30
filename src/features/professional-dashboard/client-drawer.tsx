import { Button, Group, Stack, Text } from '@mantine/core';
import type { ReactElement } from 'react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppDrawer } from '~components/overlays/overlays';
import { type ProfessionalClientSummary } from '~types/professional';

import styles from './professional-dashboard.module.css';

type ClientDrawerProps = Readonly<{
    client: ProfessionalClientSummary | null;
    detail: ReactNode;
    onClose: () => void;
    onStopManaging: () => void;
}>;

export const ClientDrawer = ({
    client,
    detail,
    onClose,
    onStopManaging,
}: ClientDrawerProps): ReactElement => {
    const { t } = useTranslation();

    return (
        <AppDrawer
            classNames={{ body: styles.drawerBody }}
            closeButtonProps={{ 'aria-label': t('generic.actions.close') }}
            onClose={onClose}
            opened={Boolean(client)}
            position="bottom"
            size="95dvh"
            title={client?.fullName}
        >
            {client && (
                <Stack gap="lg">
                    <Group justify="space-between">
                        <Text c="dimmed">{client.email}</Text>
                        <Button
                            color="danger.9"
                            onClick={onStopManaging}
                            variant="outline"
                        >
                            {t('professional.dashboard.stop_managing')}
                        </Button>
                    </Group>
                    {detail}
                </Stack>
            )}
        </AppDrawer>
    );
};
