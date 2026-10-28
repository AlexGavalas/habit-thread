'use client';

import { Container } from '@mantine/core';
import { useIsMutating } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import {
    type ChangeEventHandler,
    type FormEventHandler,
    type ReactNode,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useLocalizedPath } from '~hooks/use-localized-path';
import type {
    PaginatedProfessionalClients,
    ProfessionalClientSummary,
} from '~types/professional';
import { showErrorNotification } from '~util/notification';

import { removeProfessionalRelationship } from '../../app/actions';
import { ClientDirectory } from './client-directory';
import { ClientDrawer } from './client-drawer';

type ProfessionalDashboardProps = Readonly<{
    clients: PaginatedProfessionalClients;
    detail: ReactNode;
    query: string;
    selectedClient: ProfessionalClientSummary | null;
}>;

export const ProfessionalDashboard = ({
    clients,
    detail,
    query,
    selectedClient,
}: ProfessionalDashboardProps): ReactElement => {
    const router = useRouter();
    const localize = useLocalizedPath();
    const [search, setSearch] = useState(query);
    const ownerUserId = selectedClient?.id ?? -1;
    const isSaving =
        useIsMutating({ mutationKey: ['meal-plan-write', ownerUserId] }) > 0;
    const { t } = useTranslation();
    const canNavigate = (): boolean => {
        if (!isSaving) {
            return true;
        }
        showErrorNotification({
            message: t('meal_plan.persistence.wait'),
            title: t('meal_plan.persistence.saving'),
        });
        return false;
    };

    const destination = ({
        client,
        page = clients.page,
        q = query,
    }: {
        client?: number;
        page?: number;
        q?: string;
    }): string => {
        const params = new URLSearchParams();
        if (q) {
            params.set('q', q);
        }
        if (page > 1) {
            params.set('page', String(page));
        }
        if (client) {
            params.set('client', String(client));
        }
        const value = params.toString();
        return `${localize('/professional')}${value ? `?${value}` : ''}`;
    };

    const navigate = (url: string): void => {
        if (!canNavigate()) {
            return;
        }
        router.push(url);
    };

    const handleSearch: FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        navigate(destination({ page: 1, q: search.trim() }));
    };

    const handleStopManaging = async (): Promise<void> => {
        if (!selectedClient) {
            return;
        }
        if (!canNavigate()) {
            return;
        }
        const result = await removeProfessionalRelationship({
            relationshipId: selectedClient.relationshipId,
        });
        if (result.ok) {
            router.push(destination({}));
            router.refresh();
        }
    };

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (
        event,
    ) => {
        setSearch(event.target.value);
    };

    const handleSelectClient = (clientId: number): void => {
        navigate(destination({ client: clientId }));
    };

    const handlePageChange = (page: number): void => {
        navigate(destination({ page }));
    };

    const handleCloseDrawer = (): void => {
        navigate(destination({}));
    };

    return (
        <Container fluid>
            <ClientDirectory
                clients={clients}
                onPageChange={handlePageChange}
                onSearch={handleSearch}
                onSearchChange={handleSearchChange}
                onSelectClient={handleSelectClient}
                search={search}
                selectedClientId={selectedClient?.id}
            />
            <ClientDrawer
                client={selectedClient}
                detail={detail}
                onClose={handleCloseDrawer}
                onStopManaging={handleStopManaging}
            />
        </Container>
    );
};
