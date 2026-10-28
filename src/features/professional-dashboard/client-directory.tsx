import {
    Badge,
    Button,
    Group,
    Pagination,
    Stack,
    TextInput,
    Title,
} from '@mantine/core';
import type { ReactElement } from 'react';
import { type ChangeEventHandler, type FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '~components/card';
import { MAX_PROFESSIONAL_CLIENTS } from '~constants/professional';
import { type PaginatedProfessionalClients } from '~types/professional';

import { ClientList } from './client-list';

type ClientDirectoryProps = Readonly<{
    clients: PaginatedProfessionalClients;
    onPageChange: (page: number) => void;
    onSearch: FormEventHandler<HTMLFormElement>;
    onSearchChange: ChangeEventHandler<HTMLInputElement>;
    onSelectClient: (clientId: number) => void;
    search: string;
    selectedClientId?: number;
}>;

export const ClientDirectory = ({
    clients,
    onPageChange,
    onSearch,
    onSearchChange,
    onSelectClient,
    search,
    selectedClientId,
}: ClientDirectoryProps): ReactElement => {
    const { t } = useTranslation();
    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Title order={2}>{t('professional.dashboard.title')}</Title>
                <Badge size="lg" variant="light">
                    {t('professional.dashboard.capacity', {
                        count: clients.total,
                        limit: MAX_PROFESSIONAL_CLIENTS,
                    })}
                </Badge>
            </Group>
            <Card>
                <Stack gap="md">
                    <form onSubmit={onSearch}>
                        <Group align="end">
                            <TextInput
                                flex={1}
                                label={t('professional.dashboard.search_label')}
                                onChange={onSearchChange}
                                placeholder={t(
                                    'professional.dashboard.search_placeholder',
                                )}
                                value={search}
                            />
                            <Button type="submit">
                                {t('generic.search.label')}
                            </Button>
                        </Group>
                    </form>
                    <ClientList
                        clients={clients.clients}
                        onSelectClient={onSelectClient}
                        search={search}
                        selectedClientId={selectedClientId}
                    />
                    {clients.pageCount > 1 && (
                        <Pagination
                            onChange={onPageChange}
                            total={clients.pageCount}
                            value={clients.page}
                        />
                    )}
                </Stack>
            </Card>
        </Stack>
    );
};
