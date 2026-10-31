'use client';

import { Box, Button, Center, Group, Stack, Title } from '@mantine/core';
import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { Plus } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LoadingOverlay } from '~components/loading-overlay';
import { INITIAL_PAGE, PAGE_SIZE, Table } from '~components/table';
import { useProfile } from '~hooks/use-profile';
import { measurementsResponseSchema } from '~schemas/measurement';
import { countResponseSchema } from '~schemas/response';
import { type Measurement } from '~types/measurement';
import { useOpenContextModal } from '~util/modal';
import { showErrorNotification } from '~util/notification';
import { parseResponse } from '~util/parse-response';

import { getMeasurementHeaders } from './measurement-table';

export const Measurements = (): ReactElement => {
    const { t } = useTranslation();
    const { profile } = useProfile();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(INITIAL_PAGE);
    const openMeasurementModal = useOpenContextModal('measurement');

    const { data: count = 0, isFetched } = useQuery({
        enabled: Boolean(profile),
        queryFn: async (): Promise<number> => {
            const response = await fetch('/api/v1/measurement?count=true');

            const { count } = await parseResponse(
                response,
                countResponseSchema,
            );

            return count;
        },
        queryKey: ['measurements-count'],
    });

    const { data: measurements = [], isFetching } = useQuery({
        enabled: Boolean(profile),
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<Measurement[]> => {
            const start = (page - 1) * PAGE_SIZE;
            const end = page * PAGE_SIZE - 1;

            const response = await fetch(
                `/api/v1/measurement?end=${end}&start=${start}`,
            );

            const { data } = await parseResponse(
                response,
                measurementsResponseSchema,
            );

            return data;
        },
        queryKey: ['measurements', page],
    });

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
    const isLoading = (!measurements.length && !isFetched) || isFetching;

    const handleNewWeightSave = async (): Promise<void> => {
        setPage(INITIAL_PAGE);

        await queryClient.invalidateQueries({
            queryKey: ['measurement-summary'],
        });
        await queryClient.invalidateQueries({
            queryKey: ['measurements-count'],
        });

        await queryClient.invalidateQueries({
            queryKey: ['measurements'],
        });
    };

    const handleDelete = async (item: Measurement): Promise<void> => {
        const response = await fetch(`/api/v1/measurement?id=${item.id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            showErrorNotification({
                message: `${t('errors.measurement_delete')}. ${t('try_again')}`,
                title: t('notification.error.title'),
            });
        } else {
            await queryClient.invalidateQueries({
                queryKey: ['measurement-summary'],
            });
            await queryClient.invalidateQueries({
                queryKey: ['measurements-count'],
            });

            await queryClient.invalidateQueries({
                queryKey: ['measurements'],
            });
        }
    };

    const handleEdit = (item: Measurement): void => {
        const handleSave = async (): Promise<void> => {
            await queryClient.invalidateQueries({
                queryKey: ['measurement-summary'],
            });
            await queryClient.invalidateQueries({
                queryKey: ['measurements', page],
            });
        };

        openMeasurementModal({
            innerProps: {
                initialData: {
                    date: parseISO(item.date),
                    id: item.id,
                    ...(item.fat_percentage && {
                        fat_percentage: item.fat_percentage,
                    }),
                    ...(item.weight && {
                        weight: item.weight,
                    }),
                },
                onSave: handleSave,
            },
            size: 'sm',
            title: t('edit_measurement'),
        });
    };

    const handlePageChange = (page: number): void => {
        setPage(page);
    };

    const handleAddMeasurement = (): void => {
        openMeasurementModal({
            innerProps: {
                onSave: handleNewWeightSave,
            },
            size: 'sm',
            title: t('new_measurement'),
        });
    };

    const headers = getMeasurementHeaders(t);

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Title order={3}>{t('measurements')}</Title>
                <Button
                    aria-label={t('add_measurement')}
                    leftSection={<Plus />}
                    onClick={handleAddMeasurement}
                    variant="outline"
                >
                    {t('generic.actions.add')}
                </Button>
            </Group>
            <Box style={{ minHeight: 100 }}>
                <LoadingOverlay visible={isLoading} />
                {measurements.length > 0 ? (
                    <Table
                        data={measurements}
                        headers={headers}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onPageChange={handlePageChange}
                        page={page}
                        totalPages={totalPages}
                    />
                ) : (
                    !isLoading && (
                        <Center style={{ height: 100 }}>
                            <Title order={4}>{t('no_measurements_yet')}</Title>
                        </Center>
                    )
                )}
            </Box>
        </Stack>
    );
};
