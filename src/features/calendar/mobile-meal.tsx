import { Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core';
import { AppleHalf, EditPencil } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { MEAL_ICON } from '~constants/calendar';
import {
    useCanEditMealAnnotations,
    useMealPlanOwnerId,
} from '~features/meal-plan-owner';
import { useMeals } from '~store/hooks';
import {
    type EditedMeal,
    type EditedMealItem,
    type Meal,
    type MealChange,
} from '~types/meal';
import { type MealZoneKey } from '~types/meal-zone';
import { useOpenContextModal } from '~util/modal';

import { MEAL_MODAL_OPTIONS } from '../modals/meal/meal-modal-options';
import styles from './mobile-content.module.css';
import { MobileMealActions } from './mobile-meal-actions';
import { MobileMealDetails } from './mobile-meal-details';
import { type RowKey } from './types';

type MobileMealProps = Readonly<{
    id: string;
    label: string;
    legacyKey?: MealZoneKey;
    meal?: Meal | EditedMeal;
    time: string;
    timestamp: Date;
}>;

const isSavedMeal = (meal?: Meal | EditedMeal): meal is Meal =>
    meal?.id !== undefined;

export const MobileMeal = ({
    id,
    label,
    legacyKey,
    meal,
    time,
    timestamp,
}: MobileMealProps): ReactElement => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    const canEditAnnotations = useCanEditMealAnnotations();
    const { deleteEntryCell, saveEntryCell, pendingSlots } = useMeals();
    const isSaving = pendingSlots.includes(id);
    const openEditMealModal = useOpenContextModal('meal');
    const openMealNoteModal = useOpenContextModal('meal-note');
    const openMealRatingModal = useOpenContextModal('meal-rating');
    const [rowKey] = id.split('_');
    const Icon = legacyKey
        ? MEAL_ICON[legacyKey]
        : (MEAL_ICON[rowKey as RowKey] ?? AppleHalf);

    const handleSave = async (newMeal: MealChange): Promise<void> => {
        if (!ownerUserId || !newMeal.meal) {
            return;
        }

        await saveEntryCell({
            items: newMeal.items,
            meal,
            note: newMeal.note,
            rating: newMeal.rating,
            sectionKey: id,
            timestamp,
            userId: ownerUserId,
            value: newMeal.meal,
        });
    };

    const handleDelete = async (): Promise<void> => {
        if (!meal) {
            return;
        }
        await deleteEntryCell({ meal });
    };

    const handleOpenEdit = (): void => {
        openEditMealModal({
            ...MEAL_MODAL_OPTIONS,
            innerProps: {
                initialItems: meal?.items ?? [],
                initialMeal: meal?.meal ?? '',
                onDelete: handleDelete,
                onSave: (
                    value: string,
                    items: EditedMealItem[],
                ): Promise<void> => handleSave({ ...meal, items, meal: value }),
                ownerUserId,
            },
            title: t('edit_meal'),
        });
    };

    const handleOpenNote = (): void => {
        if (!isSavedMeal(meal)) {
            return;
        }
        openMealNoteModal({
            centered: true,
            innerProps: {
                meal,
                onDelete: (): Promise<void> =>
                    handleSave({ ...meal, note: null }),
                onSave: (note: string): Promise<void> =>
                    handleSave({ ...meal, note }),
            },
            title: t('notes'),
        });
    };

    const handleOpenRating = (): void => {
        if (!isSavedMeal(meal)) {
            return;
        }
        openMealRatingModal({
            centered: true,
            innerProps: {
                meal,
                onDelete: (): Promise<void> =>
                    handleSave({ ...meal, rating: null }),
                onSave: (rating: number): Promise<void> =>
                    handleSave({ ...meal, rating }),
            },
            title: t('modals.meal_rate.title'),
        });
    };

    const handleCopyMeal = (): void => {
        if (meal?.meal) {
            void navigator.clipboard.writeText(meal.meal);
        }
    };

    return (
        <Paper withBorder className={styles.meal} aria-busy={isSaving} p="md">
            <Group justify="space-between" wrap="nowrap">
                <Group className={styles.mealSummary} gap="md" wrap="nowrap">
                    <Box aria-hidden className={styles.mealIcon}>
                        <Icon />
                    </Box>
                    <Stack gap="micro">
                        <Text fw="var(--mantine-font-weight-bold)">
                            {label} · {time}
                        </Text>
                        <Text c={meal?.meal ? undefined : 'dimmed'}>
                            {meal?.meal || 'N/A'}
                        </Text>
                        <MobileMealDetails meal={meal} />
                        {isSaving && (
                            <Text size="xs" role="status">
                                {t('meal_plan.persistence.saving')}
                            </Text>
                        )}
                    </Stack>
                </Group>
                <Group gap="xs" wrap="nowrap">
                    <UnstyledButton
                        aria-label={t('meal_plan.edit_meal_label', { label })}
                        className={styles.actionButton}
                        disabled={isSaving}
                        onClick={handleOpenEdit}
                    >
                        <EditPencil />
                    </UnstyledButton>
                    {meal?.meal && !isSaving && (
                        <MobileMealActions
                            canEditAnnotations={
                                isSavedMeal(meal) && canEditAnnotations
                            }
                            onCopy={handleCopyMeal}
                            onEditNote={handleOpenNote}
                            onEditRating={handleOpenRating}
                        />
                    )}
                </Group>
            </Group>
        </Paper>
    );
};
