import { Grid, Textarea } from '@mantine/core';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { type ContextModalProps } from '@mantine/modals';
import type { ReactElement } from 'react';
import {
    type ChangeEventHandler,
    type MouseEventHandler,
    type SubmitEventHandler,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useFeatureFlags } from '~features/feature-flags';
import { useProfile } from '~hooks/use-profile';
import { type FoodSearchResult } from '~types/food-search';
import { type EditedMealItem } from '~types/meal';

import { useGetMealPool } from '../meal-pool/hooks/use-get-meal-pool';
import { useMealItems } from './hooks/use-meal-items';
import { MealActions } from './meal-actions';
import { MealEditorPanel } from './meal-editor-panel';
import { MealFoodWorkspace } from './meal-food-workspace';
import { type OnMealEdit } from './meal-result';
import { MealSearch } from './meal-search';
import { MealSourcePanel } from './meal-source-panel';
import styles from './meal.module.css';

type MealModalProps = {
    onDelete: () => Promise<void> | void;
    initialItems?: EditedMealItem[];
    onSave: (meal: string, items: EditedMealItem[]) => Promise<void> | void;
    initialMeal: string;
    ownerUserId?: number;
};

export const MealModal = ({
    context,
    id,
    innerProps: {
        initialItems = [],
        initialMeal,
        onDelete,
        onSave,
        ownerUserId,
    },
}: ContextModalProps<MealModalProps>): ReactElement => {
    const { t } = useTranslation();
    const { isFoodDatabaseSearchEnabled } = useFeatureFlags();
    const { profile } = useProfile();
    const isMobile = useMediaQuery('(max-width: 48em)');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(initialMeal);
    const { addFood, items, recentlyAddedIndex, setItems } =
        useMealItems(initialItems);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 350);

    const shouldIncludeClient = Boolean(
        ownerUserId && profile?.id && ownerUserId !== profile.id,
    );
    const { data = [] } = useGetMealPool({
        includeClient: shouldIncludeClient,
        ownerUserId,
        searchQuery: debouncedSearchQuery,
    });
    const results = Array.isArray(data) ? { client: [], own: data } : data;

    const closeModal = (): void => {
        context.closeContextModal(id);
    };

    const resetError = (): void => {
        setError('');
    };

    const handleSubmit = (async (e): Promise<void> => {
        e.preventDefault();

        const meal = preview;

        if (!meal) {
            setError(t('errors.meal_empty'));
            return;
        }

        await onSave(meal, items);

        closeModal();
    }) satisfies SubmitEventHandler<HTMLFormElement>;

    const handleDelete = (async (): Promise<void> => {
        await onDelete();
        closeModal();
    }) satisfies MouseEventHandler<HTMLButtonElement>;

    const handleSearchChange = ((e): void => {
        setSearchQuery(e.target.value);
    }) satisfies ChangeEventHandler<HTMLInputElement>;

    const handleEdit = ((template): void => {
        setPreview(template.content);
        setItems(
            template.items.map(({ id: _id, ...item }) => ({
                ...item,
            })),
        );
    }) satisfies OnMealEdit;

    const handleFoodSelect = (food: FoodSearchResult): void => {
        addFood(food);
        if (!preview) {
            setPreview([food.brand, food.name].filter(Boolean).join(' '));
        }
    };

    const handleChange = ((e): void => {
        setPreview(e.target.value);
    }) satisfies ChangeEventHandler<HTMLTextAreaElement>;
    const handleItemsChange = (nextItems: EditedMealItem[]): void => {
        setItems(nextItems);
    };
    const mealSearch = (
        <MealSearch
            onEdit={handleEdit}
            onSearchChange={handleSearchChange}
            results={results}
            showClientMeals={shouldIncludeClient}
        />
    );

    const sources = (
        <MealSourcePanel
            foodDatabaseEnabled={isFoodDatabaseSearchEnabled}
            mealSearch={mealSearch}
            onFoodSelect={handleFoodSelect}
            selectedItems={items}
        />
    );
    const editor = (
        <MealEditorPanel
            error={error}
            items={items}
            meal={preview}
            onItemsChange={handleItemsChange}
            onMealChange={handleChange}
            onMealFocus={resetError}
            sourcePanel={isMobile ? sources : undefined}
        />
    );

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div
                className={`${styles.content} ${isFoodDatabaseSearchEnabled ? styles.workspaceContent : ''}`}
            >
                {isFoodDatabaseSearchEnabled ? (
                    <MealFoodWorkspace
                        details={
                            <Textarea
                                autosize
                                error={error}
                                label={t('modals.meal_edit.details.label')}
                                maxRows={3}
                                minRows={1}
                                name="meal"
                                onChange={handleChange}
                                onFocus={resetError}
                                placeholder={t('meal_placeholder')}
                                value={preview}
                            />
                        }
                        detailsInvalid={Boolean(error)}
                        items={items}
                        onItemsChange={handleItemsChange}
                        recentlyAddedIndex={recentlyAddedIndex}
                    >
                        {sources}
                    </MealFoodWorkspace>
                ) : isMobile ? (
                    editor
                ) : (
                    <Grid gap="md">
                        <Grid.Col span={8}>{editor}</Grid.Col>
                        <Grid.Col span={4}>{sources}</Grid.Col>
                    </Grid>
                )}
            </div>
            <MealActions
                canDelete={Boolean(initialMeal)}
                onCancel={closeModal}
                onDelete={handleDelete}
            />
        </form>
    );
};
