'use client';

import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { UserPlus } from 'iconoir-react';
import type { ReactElement } from 'react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '~components/card';
import { AppModal } from '~components/overlays/overlays';
import { FindUsers } from '~features/find-users';

import styles from './connections.module.css';

type ConnectionsProps = Readonly<{
    connections: ReactNode;
    professional: ReactNode;
    requests: ReactNode;
}>;

export const Connections = ({
    connections,
    professional,
    requests,
}: ConnectionsProps): ReactElement => {
    const { t } = useTranslation();
    const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width: 48em)');
    const openAddPerson = (): void => {
        setIsAddPersonOpen(true);
    };
    const closeAddPerson = (): void => {
        setIsAddPersonOpen(false);
    };

    return (
        <Container className={styles.container}>
            <Stack gap="lg">
                <Group
                    align="flex-end"
                    className={styles.header}
                    justify="space-between"
                >
                    <div>
                        <Title order={2}>{t('connections.title')}</Title>
                        <Text c="dimmed" mt={4}>
                            {t('connections.description')}
                        </Text>
                    </div>
                    <Button leftSection={<UserPlus />} onClick={openAddPerson}>
                        {t('connections.add_person')}
                    </Button>
                </Group>

                <div className={styles.grid}>
                    <div className={styles.careTeam}>
                        <Card>{professional}</Card>
                    </div>
                    <div className={styles.people}>
                        <Card>{connections}</Card>
                    </div>
                    <div className={styles.requests}>
                        <Card>{requests}</Card>
                    </div>
                </div>
            </Stack>

            <AppModal
                centered
                fullScreen={isMobile}
                onClose={closeAddPerson}
                opened={isAddPersonOpen}
                size="lg"
                title={t('connections.add_person')}
            >
                <FindUsers />
            </AppModal>
        </Container>
    );
};
