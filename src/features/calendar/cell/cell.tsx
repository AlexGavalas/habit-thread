import { Badge, Box, Center, Stack, Text } from '@mantine/core';
import { useFocusWithin, useHover, useMergedRef } from '@mantine/hooks';
import { Cutlery, MultiplePages } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
    useCanEditMealAnnotations,
    useMealPlanOwnerId,
} from '~features/meal-plan-owner';
import { useMeals } from '~store/hooks';
import { type EditedMeal, type Meal, type MealChange } from '~types/meal';

import { NutritionSummary } from '../nutrition-summary';
import styles from './cell.module.css';
import { CellOverlay } from './overlay';

export type CellProps = Readonly<{
    id: string;
    meal?: Meal | EditedMeal;
    timestamp: Date;
    isEdited: boolean;
}>;

export const Cell = ({
    id,
    meal,
    timestamp,
    isEdited,
}: CellProps): ReactElement => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    const canEditAnnotations = useCanEditMealAnnotations();
    const { hovered: isHovered, ref } = useHover();
    const { focused: isFocusedWithin, ref: focusRef } = useFocusWithin();
    const mergedRef = useMergedRef(ref, focusRef);

    const { deleteEntryCell, saveEntryCell } = useMeals();

    const handleSave = (newMeal: MealChange): void => {
        if (!ownerUserId || !newMeal.meal) {
            return;
        }

        saveEntryCell({
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

    const handleDelete = (): void => {
        if (!meal) {
            return;
        }

        deleteEntryCell({ meal });
    };

    const hasNote = !!meal?.note;

    return (
        <Box ref={mergedRef} style={{ position: 'relative' }} tabIndex={0}>
            {(isHovered || isFocusedWithin) && (
                <CellOverlay
                    canEditAnnotations={canEditAnnotations}
                    meal={meal}
                    onDelete={handleDelete}
                    onSave={handleSave}
                    ownerUserId={ownerUserId}
                />
            )}
            <Box
                className={styles.cell}
                data-edited={isEdited || undefined}
                style={{
                    ...(hasNote && { gridTemplateRows: 'auto 1fr' }),
                    ...(isEdited && {
                        border: '2px solid var(--app-color-state-modified)',
                    }),
                }}
            >
                {hasNote && (
                    <Badge
                        fullWidth
                        leftSection={<MultiplePages fontSize="90%" />}
                        size="xs"
                        variant="light"
                    >
                        {t('note')}
                    </Badge>
                )}
                <Center
                    style={{
                        ...((isHovered || isFocusedWithin) && {
                            opacity: 0.15,
                        }),
                    }}
                >
                    <Stack
                        align="center"
                        gap="xs"
                        p="var(--app-space-calendar-cell)"
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
