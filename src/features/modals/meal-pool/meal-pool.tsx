import { Tabs } from '@mantine/core';
import { type ContextModalProps } from '@mantine/modals';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useFeatureFlags } from '~features/feature-flags';

import { FileUploadTab } from './file-upload';
import { FoodDatabaseTab } from './food-database';
import { ManualInputTab } from './manual-input';
import styles from './meal-pool.module.css';

export const MealPoolModal = ({
    context,
    id,
}: ContextModalProps): ReactElement => {
    const { t } = useTranslation();
    const { isFoodDatabaseSearchEnabled, isMealImportEnabled } =
        useFeatureFlags();
    const closeModal = (): void => {
        context.closeContextModal(id);
    };

    return (
        <Tabs
            className={isFoodDatabaseSearchEnabled ? styles.tabs : undefined}
            defaultValue="manually"
        >
            <Tabs.List
                className={
                    isFoodDatabaseSearchEnabled ? styles.tabList : undefined
                }
                mb="md"
                mt="sm"
            >
                <Tabs.Tab value="manually">
                    {t('modals.meal_pool.tabs.manual')}
                </Tabs.Tab>
                {isFoodDatabaseSearchEnabled && (
                    <Tabs.Tab value="food-database">
                        {t('modals.meal_pool.tabs.food_database')}
                    </Tabs.Tab>
                )}
                {isMealImportEnabled && (
                    <Tabs.Tab value="automatic">
                        {t('modals.meal_pool.tabs.import')}
                    </Tabs.Tab>
                )}
            </Tabs.List>
            <Tabs.Panel className={styles.panel} value="manually">
                <ManualInputTab onDone={closeModal} />
            </Tabs.Panel>
            {isMealImportEnabled && (
                <Tabs.Panel className={styles.panel} value="automatic">
                    <FileUploadTab onDone={closeModal} />
                </Tabs.Panel>
            )}
            {isFoodDatabaseSearchEnabled && (
                <Tabs.Panel
                    className={`${styles.panel} ${styles.foodPanel}`}
                    value="food-database"
                >
                    <FoodDatabaseTab onDone={closeModal} />
                </Tabs.Panel>
            )}
        </Tabs>
    );
};
