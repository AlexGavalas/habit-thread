import { Button, Group, TextInput } from '@mantine/core';
import type { ReactElement } from 'react';
import { type MouseEventHandler, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type FoodSearchResult } from '~types/food-search';

import { FoodDatabaseSearch } from '../meal/food-database-search';
import { useMealItems } from '../meal/hooks/use-meal-items';
import { MealFoodWorkspace } from '../meal/meal-food-workspace';
import styles from './food-database.module.css';
import { useCreateMealPool } from './hooks/use-create-meal-pool';
import { MealLibraryPanel } from './meal-library-panel';

type FoodDatabaseTabProps = Readonly<{
    onDone: () => void;
}>;

export const FoodDatabaseTab = ({
    onDone,
}: FoodDatabaseTabProps): ReactElement => {
    const { t } = useTranslation();
    const [preview, setPreview] = useState('');
    const { addFood, items, recentlyAddedIndex, setItems } = useMealItems();
    const {
        mutate,
        isPending: isLoading,
        error,
        reset: resetCreationState,
    } = useCreateMealPool({ onSuccess: onDone });

    const handleCreate = ((): void => {
        mutate({ templates: [{ content: preview, items }] });
    }) satisfies MouseEventHandler<HTMLButtonElement>;
    const handleFoodSelect = (food: FoodSearchResult): void => {
        addFood(food);
        if (!preview) {
            setPreview([food.brand, food.name].filter(Boolean).join(' '));
        }
    };
    const handlePreviewChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        setPreview(event.target.value);
    };
    return (
        <MealLibraryPanel
            workspace
            actions={
                <Group gap="md" justify="end">
                    <Button
                        disabled={isLoading}
                        onClick={onDone}
                        type="button"
                        variant="default"
                    >
                        {t('generic.actions.cancel')}
                    </Button>
                    <Button
                        disabled={!preview.trim() || items.length === 0}
                        loading={isLoading}
                        onClick={handleCreate}
                    >
                        {t('generic.actions.save')}
                    </Button>
                </Group>
            }
        >
            <div className={styles.tab}>
                <MealFoodWorkspace
                    details={
                        <TextInput
                            withAsterisk
                            error={error instanceof Error && error.message}
                            label={t('meal_label')}
                            onChange={handlePreviewChange}
                            onFocus={resetCreationState}
                            value={preview}
                        />
                    }
                    items={items}
                    onItemsChange={setItems}
                    recentlyAddedIndex={recentlyAddedIndex}
                >
                    <FoodDatabaseSearch
                        onSelect={handleFoodSelect}
                        selectedItems={items}
                    />
                </MealFoodWorkspace>
            </div>
        </MealLibraryPanel>
    );
};
