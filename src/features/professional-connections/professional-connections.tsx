'use client';

import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Search } from 'iconoir-react';
import type { ReactElement } from 'react';
import { type ChangeEventHandler, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingOverlay } from '~components/loading-overlay';
import { useProfile } from '~hooks/use-profile';
import {
    professionalConnectionsResponseSchema,
    professionalSearchResponseSchema,
} from '~schemas/professional';
import { type ProfessionalSummary } from '~types/professional';
import { parseResponse } from '~util/parse-response';

import {
    ConnectionSections,
    type ConnectionState,
} from './connection-sections';

export const ProfessionalConnections = (): ReactElement => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [debouncedSearch] = useDebouncedValue(search, 350);
    const [error, setError] = useState<string | null>(null);
    const isProfessional = profile?.roles.includes('professional') ?? false;

    const { data: state, isFetching } = useQuery({
        queryFn: async (): Promise<ConnectionState> => {
            const response = await fetch(
                '/api/v1/professional?type=connections',
            );
            if (!response.ok) {
                throw new Error('Could not load professional connections');
            }
            const result = await parseResponse(
                response,
                professionalConnectionsResponseSchema,
            );
            return result.data;
        },
        queryKey: ['professional-connections', profile?.id],
    });

    const { data: professionals = [], isFetching: isSearching } = useQuery({
        enabled: debouncedSearch.trim().length > 0,
        queryFn: async (): Promise<ProfessionalSummary[]> => {
            const query = new URLSearchParams({
                q: debouncedSearch,
                type: 'search',
            });
            const response = await fetch(`/api/v1/professional?${query}`);
            const result = await parseResponse(
                response,
                professionalSearchResponseSchema,
            );
            return result.data;
        },
        queryKey: ['professional-search', debouncedSearch],
    });

    const refresh = async (): Promise<void> => {
        setError(null);
        await queryClient.invalidateQueries({
            queryKey: ['professional-connections', profile?.id],
        });
    };

    const run = async (
        action: () => Promise<{ error?: string; ok: boolean }>,
    ): Promise<void> => {
        const result = await action();
        if (!result.ok) {
            setError(
                result.error === 'capacity_reached'
                    ? t('professional.connections.capacity_error')
                    : t('professional.connections.action_error'),
            );
            return;
        }
        await refresh();
    };

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (
        event,
    ) => {
        setSearch(event.target.value);
    };
    const handleToggleSearch = (): void => {
        setIsSearchOpen((value) => !value);
    };

    return (
        <Stack gap="lg">
            <LoadingOverlay visible={isFetching} />
            <Group align="flex-start" justify="space-between">
                <Group align="flex-start" gap="sm" wrap="nowrap">
                    <Heart aria-hidden="true" />
                    <div>
                        <Title order={3}>
                            {t('professional.connections.title')}
                        </Title>
                        <Text c="dimmed" mt={4} size="sm">
                            {t('professional.connections.description')}
                        </Text>
                    </div>
                </Group>
                {!state?.currentProfessional && (
                    <Button
                        leftSection={<Search />}
                        onClick={handleToggleSearch}
                        variant={isSearchOpen ? 'light' : 'outline'}
                    >
                        {t('professional.connections.find_title')}
                    </Button>
                )}
            </Group>
            {error && (
                <Alert color="danger" variant="outline">
                    {error}
                </Alert>
            )}
            <ConnectionSections
                isProfessional={isProfessional}
                isSearchOpen={isSearchOpen}
                isSearching={isSearching}
                onSearchChange={handleSearchChange}
                professionals={professionals}
                run={run}
                search={search}
                state={state}
            />
        </Stack>
    );
};
