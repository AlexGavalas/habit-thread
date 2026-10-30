import {
    ActionIcon,
    Button,
    Group,
    Menu,
    Paper,
    Stack,
    Text,
} from '@mantine/core';
import { MoreHoriz, Trash } from 'iconoir-react';
import type { ReactElement } from 'react';
import { type MouseEventHandler, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NameAvatar } from '~components/name-avatar';
import { AppModal } from '~components/overlays/overlays';
import { type Connection, type ConnectionWithUser } from '~types/connection';

import styles from './connection.module.css';

type ConnectionItemProps = Readonly<{
    connection: ConnectionWithUser;
    removeConnection: (connection: Connection) => Promise<void>;
}>;

export const ConnectionItem = ({
    connection,
    removeConnection,
}: ConnectionItemProps): ReactElement => {
    const { t } = useTranslation();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemoveConnection = (async (): Promise<void> => {
        setIsRemoving(true);
        await removeConnection(connection);
        setIsRemoving(false);
        setIsConfirmOpen(false);
    }) satisfies MouseEventHandler<HTMLButtonElement>;
    const openConfirmation = (): void => {
        setIsConfirmOpen(true);
    };
    const closeConfirmation = (): void => {
        setIsConfirmOpen(false);
    };

    return (
        <Paper withBorder p="md" role="listitem">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <NameAvatar name={connection.users.full_name} />
                    <Text fw="var(--mantine-font-weight-semibold)">
                        {connection.users.full_name}
                    </Text>
                </Group>
                <Menu position="bottom-end" width={210}>
                    <Menu.Target>
                        <ActionIcon
                            aria-label={t('generic.actions.more_actions')}
                            className={styles.moreButton}
                            variant="subtle"
                        >
                            <MoreHoriz />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            color="danger"
                            leftSection={<Trash />}
                            onClick={openConfirmation}
                        >
                            {t(
                                'connections.manage_connections.remove_connection',
                            )}
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>

            <AppModal
                centered
                onClose={closeConfirmation}
                opened={isConfirmOpen}
                title={t('connections.manage_connections.remove_title')}
            >
                <Stack gap="lg">
                    <Text>
                        {t('connections.manage_connections.remove_confirm', {
                            fullName: connection.users.full_name,
                        })}
                    </Text>
                    <Group justify="flex-end">
                        <Button
                            disabled={isRemoving}
                            onClick={closeConfirmation}
                            variant="default"
                        >
                            {t('generic.actions.cancel')}
                        </Button>
                        <Button
                            color="danger"
                            loading={isRemoving}
                            onClick={handleRemoveConnection}
                        >
                            {t(
                                'connections.manage_connections.remove_connection',
                            )}
                        </Button>
                    </Group>
                </Stack>
            </AppModal>
        </Paper>
    );
};
