import { Badge, Group, Popover, Text } from '@mantine/core';
import { MultiplePages, ThreeStars } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditedMeal, type Meal } from '~types/meal';

import styles from './meal-annotations.module.css';

type MealAnnotationsProps = Readonly<{
    meal?: Meal | EditedMeal;
}>;

export const MealAnnotations = ({
    meal,
}: MealAnnotationsProps): ReactElement | null => {
    const { t } = useTranslation();

    if (!meal?.note && !meal?.rating) {
        return null;
    }

    return (
        <Group gap="xs">
            {meal.note && (
                <Popover
                    withArrow
                    trapFocus
                    returnFocus
                    width={280}
                    shadow="md"
                >
                    <Popover.Target>
                        <Badge
                            component="button"
                            type="button"
                            className={styles.noteButton}
                            leftSection={
                                <MultiplePages aria-hidden fontSize="90%" />
                            }
                            size="xs"
                            variant="light"
                        >
                            {t('note')}
                        </Badge>
                    </Popover.Target>
                    <Popover.Dropdown className={styles.note}>
                        {/* Keep the enclosing client drawer open when dismissing this preview. */}
                        <Text
                            data-autofocus
                            data-mantine-stop-propagation
                            tabIndex={-1}
                            size="sm"
                        >
                            {meal.note}
                        </Text>
                    </Popover.Dropdown>
                </Popover>
            )}
            {meal.rating ? (
                <Badge
                    leftSection={<ThreeStars aria-hidden fontSize="90%" />}
                    size="xs"
                    variant="light"
                >
                    {t('rating')}: {meal.rating}/5
                </Badge>
            ) : null}
        </Group>
    );
};
