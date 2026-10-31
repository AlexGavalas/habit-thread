'use client';

import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Community } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingOverlay } from '~components/loading-overlay';
import { useProfile } from '~hooks/use-profile';
import { connectionsResponseSchema } from '~schemas/connection';
import { type Connection, type ConnectionWithUser } from '~types/connection';
import { showErrorNotification } from '~util/notification';
import { parseResponse } from '~util/parse-response';

import { ConnectionItem } from './connection';

export const ManageConnections = (): ReactElement => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const queryClient = useQueryClient();

    const { data: connections = [], isFetching: isFetchingConnections } =
        useQuery({
            enabled: Boolean(profile),
            queryFn: async (): Promise<ConnectionWithUser[]> => {
                const response = await fetch('/api/v1/connection');

                const { data } = await parseResponse(
                    response,
                    connectionsResponseSchema,
                );

                return data;
            },
            queryKey: ['connections'],
        });

    const removeConnection = async (connection: Connection): Promise<void> => {
        const response = await fetch('/api/v1/connection', {
            body: JSON.stringify({
                connectionId: connection.id,
                connectionUserId: connection.connection_user_id,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'DELETE',
        });

        if (!response.ok) {
            showErrorNotification({
                message: t(
                    'connections.manage_connections.remove_connection_error',
                ),
                title: t('notification.error.title'),
            });
        } else {
            await queryClient.invalidateQueries({
                queryKey: ['connections'],
            });
        }
    };

    const hasConnections = !isFetchingConnections && connections.length > 0;

    return (
        <Stack gap="md">
            <LoadingOverlay visible={isFetchingConnections} />
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <Community aria-hidden="true" />
                    <Title order={3}>
                        {t('connections.manage_connections.title')}
                    </Title>
                </Group>
                <Badge variant="light">{connections.length}</Badge>
            </Group>
            {!hasConnections && (
                <Stack align="center" gap={4} py="lg" ta="center">
                    <Text fw="var(--mantine-font-weight-semibold)">
                        {t('connections.manage_connections.empty_title')}
                    </Text>
                    <Text c="dimmed" maw="26rem" size="sm">
                        {t('connections.manage_connections.no_connections')}
                    </Text>
                </Stack>
            )}
            <Stack gap="sm" role="list">
                {connections.map((connection) => (
                    <ConnectionItem
                        key={connection.id}
                        connection={connection}
                        removeConnection={removeConnection}
                    />
                ))}
            </Stack>
        </Stack>
    );
};
