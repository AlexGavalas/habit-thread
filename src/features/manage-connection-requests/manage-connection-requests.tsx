'use client';

import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Mail } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingOverlay } from '~components/loading-overlay';
import { useProfile } from '~hooks/use-profile';
import { connectionRequestsResponseSchema } from '~schemas/notification';
import {
    type Notification,
    type NotificationWithUser,
} from '~types/notification';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';
import { parseResponse } from '~util/parse-response';

import { acceptConnectionRequest } from '../../app/actions';
import { ConnectionRequest } from './connection-request';

export const ManageConnectionRequests = (): ReactElement => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const queryClient = useQueryClient();

    const {
        data: connectionRequests = [],
        isFetching: isFetchingConnectionRequests,
    } = useQuery({
        enabled: Boolean(profile),
        queryFn: async (): Promise<NotificationWithUser[]> => {
            const response = await fetch(
                '/api/v1/notification?type=connection_request',
            );

            const { data } = await parseResponse(
                response,
                connectionRequestsResponseSchema,
            );

            return data;
        },
        queryKey: ['connection-requests', profile?.id],
    });

    const hasConnectionsRequests =
        !isFetchingConnectionRequests && connectionRequests.length > 0;

    const removeConnectionRequest = async (
        connectionRequestId: string,
    ): Promise<Response> => {
        const response = await fetch(
            `/api/v1/notification?id=${connectionRequestId}`,
            {
                method: 'DELETE',
            },
        );

        return response;
    };

    const handleAcceptConnectionRequest = async (
        connectionRequest: Notification,
    ): Promise<void> => {
        const response = await acceptConnectionRequest(
            connectionRequest.id,
        ).catch(() => ({ ok: false }));

        if (!response.ok) {
            showErrorNotification({
                message: t(
                    'connections.manage_connection_requests.accept_error',
                ),
                title: t('notification.error.title'),
            });
        } else {
            showSuccessNotification({
                message: t(
                    'connections.manage_connection_requests.accept_success',
                ),
                title: t('notification.success.title'),
            });

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['connection-requests', profile?.id],
                }),
                queryClient.invalidateQueries({ queryKey: ['connections'] }),
            ]);
        }
    };

    const handleDeclineConnectionRequest = async (
        connectionRequestId: string,
    ): Promise<void> => {
        const response = await removeConnectionRequest(connectionRequestId);

        if (!response.ok) {
            showErrorNotification({
                message: t(
                    'connections.manage_connection_requests.decline_error',
                ),
                title: t('notification.error.title'),
            });
        } else {
            showSuccessNotification({
                message: t(
                    'connections.manage_connection_requests.decline_success',
                ),
                title: t('notification.success.title'),
            });

            await queryClient.invalidateQueries({
                queryKey: ['connection-requests', profile?.id],
            });

            await queryClient.invalidateQueries({
                queryKey: ['connections'],
            });
        }
    };

    return (
        <Stack data-has-requests={hasConnectionsRequests} gap="md">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <Mail aria-hidden="true" />
                    <Title order={3}>
                        {t('connections.manage_connection_requests.title')}
                    </Title>
                </Group>
                <Badge variant="light">{connectionRequests.length}</Badge>
            </Group>
            {!hasConnectionsRequests && (
                <Group gap="xs" wrap="nowrap">
                    <CheckCircle aria-hidden="true" />
                    <Text c="dimmed" size="sm">
                        {t(
                            'connections.manage_connection_requests.no_requests',
                        )}
                    </Text>
                </Group>
            )}
            {isFetchingConnectionRequests ? (
                <LoadingOverlay visible />
            ) : (
                <Stack gap="sm" role="list">
                    {connectionRequests.map((connectionRequest) => (
                        <ConnectionRequest
                            key={connectionRequest.id}
                            connectionRequest={connectionRequest}
                            onAcceptConnectionRequest={
                                handleAcceptConnectionRequest
                            }
                            onDeclineConnectionRequest={
                                handleDeclineConnectionRequest
                            }
                        />
                    ))}
                </Stack>
            )}
        </Stack>
    );
};
