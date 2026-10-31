import {
    ActionIcon,
    Autocomplete,
    type AutocompleteProps,
    Button,
    Group,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProfileCircle, UserPlus, Xmark } from 'iconoir-react';
import type { ReactElement } from 'react';
import { type MouseEventHandler, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProfile } from '~hooks/use-profile';
import { booleanResponseSchema } from '~schemas/response';
import {
    userSearchResponseSchema,
    userSummaryResponseSchema,
} from '~schemas/user';
import { type UserSummary } from '~types/user';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';
import { parseResponse } from '~util/parse-response';

import styles from './find-users.module.css';

export const FindUsers = (): ReactElement => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 350);
    const { profile } = useProfile();
    const queryClient = useQueryClient();

    const { data: users = [] } = useQuery({
        enabled: Boolean(debouncedSearchQuery),
        queryFn: async (): Promise<{ label: string; value: string }[]> => {
            const response = await fetch(
                `/api/v1/user?type=search&fullName=${debouncedSearchQuery}`,
            );

            return (await parseResponse(response, userSearchResponseSchema))
                .data;
        },
        queryKey: ['users', debouncedSearchQuery],
    });

    const { data: selectedUser, isFetching: isFetchingSelectedUser } = useQuery(
        {
            enabled: Boolean(selectedUserId),
            queryFn: async (): Promise<UserSummary[]> => {
                const response = await fetch(
                    `/api/v1/user?type=profile&id=${selectedUserId}`,
                );

                return (
                    await parseResponse(response, userSummaryResponseSchema)
                ).data;
            },
            queryKey: ['connection', selectedUserId],
        },
    );

    const selectedUserProfileId = selectedUser?.[0]?.id;

    const {
        data: hasAlreadySentRequest,
        isFetching: isFetchingHasAlreadySentRequest,
    } = useQuery({
        enabled: Boolean(selectedUserProfileId),
        queryFn: async (): Promise<boolean | null | undefined> => {
            if (!selectedUserProfileId || !profile) {
                return null;
            }

            const response = await fetch(
                `/api/v1/notification?requestUserId=${profile.id}&targetUserId=${selectedUserProfileId}`,
            );

            const { data: hasAlreadySentRequest } = await parseResponse(
                response,
                booleanResponseSchema,
            );

            return hasAlreadySentRequest;
        },
        queryKey: ['connection_request', selectedUserProfileId],
    });

    const handleUserSelect = ((value): void => {
        setSelectedUserId(value);
    }) satisfies NonNullable<AutocompleteProps['onOptionSubmit']>;

    const handleClearInput = (): void => {
        setSearchQuery('');
        setSelectedUserId('');
    };

    const handleConnectionRequest = (async (): Promise<void> => {
        if (!profile || !selectedUser) {
            return;
        }

        const response = await fetch('/api/v1/notification', {
            body: JSON.stringify({
                targetUserId: selectedUser[0]?.id,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });

        if (!response.ok) {
            showErrorNotification({
                message: t('connections.request.error'),
                title: t('notification.error.title'),
            });
        } else {
            showSuccessNotification({
                message: t('connections.request.success'),
                title: t('notification.success.title'),
            });

            await queryClient.invalidateQueries({
                queryKey: ['connection_request', selectedUserProfileId],
            });
        }
    }) satisfies MouseEventHandler<HTMLButtonElement>;

    const shouldShowConnectionInfo =
        selectedUser && !isFetchingHasAlreadySentRequest;

    return (
        <Stack gap="md">
            <Title order={3}>{t('connections.search.title')}</Title>
            <Autocomplete
                data={users}
                disabled={isFetchingSelectedUser}
                label={t('connections.search.label')}
                leftSection={<ProfileCircle />}
                onChange={setSearchQuery}
                onOptionSubmit={handleUserSelect}
                placeholder={t('connections.search.placeholder')}
                rightSection={
                    <ActionIcon
                        aria-label={t('generic.actions.clear')}
                        onClick={handleClearInput}
                        variant="white"
                    >
                        <Xmark />
                    </ActionIcon>
                }
                value={searchQuery}
            />

            {shouldShowConnectionInfo &&
                (hasAlreadySentRequest ? (
                    <Text
                        c="success.8"
                        fw="var(--mantine-font-weight-semibold)"
                    >
                        {t('connections.request.already_sent', {
                            fullName: selectedUser[0]?.full_name,
                        })}
                    </Text>
                ) : (
                    <Group
                        className={styles.searchResult}
                        justify="space-between"
                    >
                        <div>
                            <Text span>{t('connections.request.add')} </Text>
                            <Text span fw="var(--mantine-font-weight-semibold)">
                                {selectedUser[0]?.full_name}
                            </Text>
                            <Text span>
                                {' '}
                                {t('connections.request.to_connections')}?
                            </Text>
                        </div>
                        <Button
                            className={styles.sendButton}
                            onClick={handleConnectionRequest}
                            rightSection={<UserPlus />}
                        >
                            {t('connections.request.send')}
                        </Button>
                    </Group>
                ))}
        </Stack>
    );
};
