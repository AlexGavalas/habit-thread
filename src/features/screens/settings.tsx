'use client';

import { Container, Space, Tabs } from '@mantine/core';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '~components/card';
import { AccountExport } from '~features/account-export/account-export';
import { AdvancedSettings } from '~features/advanced-settings';
import { DeleteAccount } from '~features/delete-account';
import { FoodPreferences } from '~features/food-preferences';
import { PersonalSettings } from '~features/personal-settings';

import styles from './settings.module.css';

type SettingsProps = Readonly<{
    activities: ReactNode;
    measurements: ReactNode;
}>;

const SETTINGS_TABS = ['advanced', 'measurements', 'personal'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

const isSettingsTab = (value: string | null): value is SettingsTab =>
    SETTINGS_TABS.some((tab) => tab === value);

export const Settings = ({
    activities,
    measurements,
}: SettingsProps): ReactElement => {
    const { t } = useTranslation();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const activeTab = isSettingsTab(requestedTab)
        ? requestedTab
        : 'measurements';

    const handleTabChange = (value: string | null): void => {
        if (!isSettingsTab(value)) {
            return;
        }

        const params = new URLSearchParams(searchParams.toString());
        if (value === 'measurements') {
            params.delete('tab');
        } else {
            params.set('tab', value);
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
        });
    };

    return (
        <Container className={styles.container}>
            <Tabs id="settings" onChange={handleTabChange} value={activeTab}>
                <Tabs.List className={styles.tabList}>
                    <Tabs.Tab
                        className={styles.tab}
                        id="settings-tab-measurements"
                        value="measurements"
                    >
                        {t('measurements')}
                    </Tabs.Tab>
                    <Tabs.Tab
                        className={styles.tab}
                        id="settings-tab-personal"
                        value="personal"
                    >
                        {t('personal_info')}
                    </Tabs.Tab>
                    <Tabs.Tab
                        className={styles.tab}
                        id="settings-tab-advanced"
                        value="advanced"
                    >
                        {t('advanced_settings')}
                    </Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel pt="md" value="measurements">
                    <Card>{measurements}</Card>
                    <Space h="lg" />
                    <Card>{activities}</Card>
                </Tabs.Panel>
                <Tabs.Panel pt="md" value="personal">
                    <Card>
                        <PersonalSettings />
                    </Card>
                    <Space h="lg" />
                    <Card>
                        <FoodPreferences />
                    </Card>
                </Tabs.Panel>
                <Tabs.Panel pt="md" value="advanced">
                    <Card>
                        <AdvancedSettings />
                    </Card>
                    <Space h="lg" />
                    <Card>
                        <AccountExport />
                    </Card>
                    <Space h="lg" />
                    <Card>
                        <DeleteAccount />
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
};
