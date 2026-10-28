import { Tabs } from '@mantine/core';
import { type ContextModalProps } from '@mantine/modals';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { FileUploadTab } from './file-upload';
import { FoodDatabaseTab } from './food-database';
import { ManualInputTab } from './manual-input';
import styles from './meal-pool.module.css';

export const MealPoolModal = ({
    context,
    id,
}: ContextModalProps): ReactElement => {
    const { t } = useTranslation();
    const closeModal = (): void => {
        context.closeContextModal(id);
    };

    return (
        <Tabs className={styles.tabs} defaultValue="manually">
            <Tabs.List className={styles.tabList} mb="md" mt="sm">
                <Tabs.Tab value="manually">
                    {t('modals.meal_pool.tabs.manual')}
                </Tabs.Tab>
                <Tabs.Tab value="food-database">
                    {t('modals.meal_pool.tabs.food_database')}
                </Tabs.Tab>
                <Tabs.Tab value="automatic">
                    {t('modals.meal_pool.tabs.import')}
                </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel className={styles.panel} value="manually">
                <ManualInputTab onDone={closeModal} />
            </Tabs.Panel>
            <Tabs.Panel className={styles.panel} value="automatic">
                <FileUploadTab onDone={closeModal} />
            </Tabs.Panel>
            <Tabs.Panel className={styles.panel} value="food-database">
                <FoodDatabaseTab onDone={closeModal} />
            </Tabs.Panel>
        </Tabs>
    );
};
