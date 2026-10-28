import { Table, Text } from '@mantine/core';
import type { ReactElement } from 'react';
import { type KeyboardEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { type ProfessionalClientSummary } from '~types/professional';

import styles from './professional-dashboard.module.css';

type ClientListProps = Readonly<{
    clients: ProfessionalClientSummary[];
    onSelectClient: (clientId: number) => void;
    search: string;
    selectedClientId?: number;
}>;

export const ClientList = ({
    clients,
    onSelectClient,
    search,
    selectedClientId,
}: ClientListProps): ReactElement | null => {
    const { t } = useTranslation();

    if (!search.length && !clients.length) {
        return null;
    }

    if (!clients.length) {
        return <Text>{t('professional.dashboard.no_clients')}</Text>;
    }

    return (
        <Table highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>{t('professional.dashboard.client')}</Table.Th>
                    <Table.Th>{t('login.email')}</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {clients.map((client) => {
                    const handleSelectClient = (): void => {
                        onSelectClient(client.id);
                    };
                    const handleKeyDown: KeyboardEventHandler<HTMLElement> = (
                        event,
                    ) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectClient();
                        }
                    };
                    return (
                        <Table.Tr
                            key={client.id}
                            aria-current={
                                selectedClientId === client.id
                                    ? 'true'
                                    : undefined
                            }
                            className={styles.clientRow}
                            onClick={handleSelectClient}
                            onKeyDown={handleKeyDown}
                            role="button"
                            tabIndex={0}
                        >
                            <Table.Td>
                                <Text
                                    fw={
                                        selectedClientId === client.id
                                            ? 'var(--mantine-font-weight-bold)'
                                            : undefined
                                    }
                                >
                                    {client.fullName}
                                </Text>
                            </Table.Td>
                            <Table.Td>{client.email}</Table.Td>
                        </Table.Tr>
                    );
                })}
            </Table.Tbody>
        </Table>
    );
};
