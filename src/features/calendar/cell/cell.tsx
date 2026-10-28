import { Box, Center, Stack, Text } from '@mantine/core';
import { useFocusWithin, useHover, useMergedRef } from '@mantine/hooks';
import { Cutlery } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
    useCanEditMealAnnotations,
    useMealPlanOwnerId,
} from '~features/meal-plan-owner';
import { useMeals } from '~store/hooks';
import { type EditedMeal, type Meal, type MealChange } from '~types/meal';

import { MealAnnotations } from '../meal-annotations';
import { NutritionSummary } from '../nutrition-summary';
import styles from './cell.module.css';
import { CellOverlay } from './overlay';

export type CellProps = Readonly<{
    id: string;
    meal?: Meal | EditedMeal;
    timestamp: Date;
}>;

export const Cell = ({ id, meal, timestamp }: CellProps): ReactElement => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    const canEditAnnotations = useCanEditMealAnnotations();
    const { hovered: isHovered, ref } = useHover();
    const { focused: isFocusedWithin, ref: focusRef } = useFocusWithin();
    const mergedRef = useMergedRef(ref, focusRef);

    const { deleteEntryCell, saveEntryCell, pendingSlots } = useMeals();
    const isSaving = pendingSlots.includes(id);

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

    const hasAnnotations = !!(meal?.note || meal?.rating);

    return (
        <Box ref={mergedRef} style={{ position: 'relative' }} tabIndex={0}>
            <Box
                className={styles.cell}
                aria-busy={isSaving}
                style={{
                    ...(hasAnnotations && { gridTemplateRows: 'auto 1fr' }),
                }}
            >
                {isSaving && (
                    <Text className={styles.saving} size="xs" role="status">
                        {t('meal_plan.persistence.saving')}
                    </Text>
                )}
                <MealAnnotations meal={meal} />
                <Center pos="relative">
                    {!isSaving && (isHovered || isFocusedWithin) && (
                        <CellOverlay
                            canEditAnnotations={canEditAnnotations}
                            meal={meal}
                            onDelete={handleDelete}
                            onSave={handleSave}
                            ownerUserId={ownerUserId}
                        />
                    )}
                    <Stack
                        align="center"
                        gap="xs"
                        p="var(--app-space-calendar-cell)"
                        style={{
                            ...(!isSaving &&
                                (isHovered || isFocusedWithin) && {
                                    opacity: 0.15,
                                }),
                        }}
                    >
                        <Text c={meal?.meal ? undefined : 'dimmed'} ta="center">
                            {meal?.meal || <Cutlery />}
                        </Text>
                        {meal?.items?.length ? (
                            <NutritionSummary compact meals={[meal]} />
                        ) : null}
                    </Stack>
                </Center>
            </Box>
        </Box>
    );
};
