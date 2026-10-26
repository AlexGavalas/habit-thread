import { Badge, Group, Paper, Title, UnstyledButton } from '@mantine/core';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditedMealItem } from '~types/meal';

import styles from './meal-food-workspace.module.css';
import { MealItemsEditor } from './meal-items-editor';

type MealFoodWorkspaceProps = Readonly<{
    children: ReactNode;
    details: ReactNode;
    detailsInvalid?: boolean;
    items: EditedMealItem[];
    onItemsChange: (items: EditedMealItem[]) => void;
    recentlyAddedIndex: number | null;
}>;

export const MealFoodWorkspace = ({
    children,
    details,
    detailsInvalid = false,
    items,
    onItemsChange,
    recentlyAddedIndex,
}: MealFoodWorkspaceProps): ReactElement => {
    const { t } = useTranslation();
    const [view, setView] = useState('search');
    const workspaceRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        workspaceRef.current
            ?.querySelector('[data-recently-added]')
            ?.scrollIntoView?.({ block: 'nearest' });
    }, [recentlyAddedIndex, view]);
    useEffect(() => {
        if (detailsInvalid) {
            setView('selected');
        }
    }, [detailsInvalid]);
    const addedItem =
        recentlyAddedIndex === null ? null : items[recentlyAddedIndex];
    const handleSearchView = (): void => {
        setView('search');
    };
    const handleSelectedView = (): void => {
        setView('selected');
    };

    return (
        <div className={styles.workspace} data-view={view} ref={workspaceRef}>
            <Group className={styles.mobileSwitch} gap="xs" grow>
                <UnstyledButton
                    aria-pressed={view === 'search'}
                    className={styles.viewButton}
                    onClick={handleSearchView}
                    type="button"
                >
                    {t('modals.meal_edit.workspace.search')}
                </UnstyledButton>
                <UnstyledButton
                    aria-pressed={view === 'selected'}
                    className={styles.viewButton}
                    onClick={handleSelectedView}
                    type="button"
                >
                    {t('modals.meal_edit.workspace.selected_count', {
                        count: items.length,
                    })}
                </UnstyledButton>
            </Group>
            <div aria-live="polite" className={styles.feedback} role="status">
                {addedItem
                    ? t('modals.meal_edit.workspace.added', {
                          count: items.length,
                          item: addedItem.name,
                      })
                    : t('modals.meal_edit.workspace.hint')}
            </div>
            <div className={styles.columns}>
                <section
                    aria-label={t('modals.meal_edit.workspace.search')}
                    className={styles.search}
                >
                    {children}
                </section>
                <Paper
                    aria-label={t('modals.meal_edit.workspace.selected')}
                    className={styles.basket}
                    component="section"
                    p="md"
                    withBorder
                >
                    <div className={styles.basketHeader}>
                        <Group gap="xs" justify="space-between">
                            <Title order={3} size="h4">
                                {t('modals.meal_edit.workspace.selected')}
                            </Title>
                            <Badge variant="light">{items.length}</Badge>
                        </Group>
                        {details}
                    </div>
                    <MealItemsEditor
                        items={items}
                        onItemsChange={onItemsChange}
                        recentlyAddedIndex={recentlyAddedIndex}
                        scrollable
                    />
                </Paper>
            </div>
        </div>
    );
};
