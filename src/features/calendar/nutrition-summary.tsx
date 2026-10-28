import {
    Box,
    Divider,
    Group,
    Paper,
    Progress,
    SimpleGrid,
    Stack,
    Text,
} from '@mantine/core';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditedMeal, type Meal } from '~types/meal';
import { macroEnergyPercentages, totalNutrition } from '~util/nutrition';

const MEAL_COLORS = ['grape', 'cyan', 'orange', 'lime', 'pink'] as const;

export const NutritionSummary = ({
    compact = false,
    meals,
    showMealDistribution = true,
}: Readonly<{
    compact?: boolean;
    meals: readonly (Meal | EditedMeal | undefined)[];
    showMealDistribution?: boolean;
}>): ReactElement | null => {
    const { i18n, t } = useTranslation();
    const planned = meals.filter((meal) => meal?.meal);
    const items = planned.flatMap((meal) => meal?.items ?? []);
    if (!items.length) {
        return null;
    }
    const totals = totalNutrition(items);
    const partial =
        planned.some((meal) => !meal?.items?.length) ||
        Object.values(totals.complete).some((complete) => !complete);
    const macros = macroEnergyPercentages(totals);
    const mealCalories = planned.map((meal, index) => ({
        calories: totalNutrition(meal?.items ?? []).calories ?? 0,
        color: MEAL_COLORS[index % MEAL_COLORS.length] ?? 'grape',
        label: meal?.meal ?? '',
    }));
    const calorieTotal = mealCalories.reduce(
        (sum, meal) => sum + meal.calories,
        0,
    );
    const format = new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 1,
    });
    const value = (amount: number | null, unit = 'g'): string =>
        amount === null ? '—' : `${format.format(amount)} ${unit}`;

    return (
        <Stack gap={4}>
            <Text fw={600} size="sm">
                {value(totals.calories, 'kcal')}
                {partial ? ` · ${t('nutrition.partial')}` : ''}
            </Text>
            <Text c="dimmed" size="xs">
                P {value(totals.protein)} · C {value(totals.carbohydrates)} · F{' '}
                {value(totals.fat)}
            </Text>
            {!compact && (
                <Stack gap="sm">
                    <Text c="dimmed" fw={600} size="xs">
                        {t('nutrition.macro_distribution')}
                    </Text>
                    <Progress.Root
                        aria-label={t('nutrition.macro_distribution')}
                        role="group"
                        size="md"
                    >
                        <Progress.Section
                            aria-label={t('nutrition.protein')}
                            color="blue"
                            value={macros.protein}
                        />
                        <Progress.Section
                            aria-label={t('nutrition.carbohydrates')}
                            color="yellow"
                            value={macros.carbohydrates}
                        />
                        <Progress.Section
                            aria-label={t('nutrition.fat')}
                            color="red"
                            value={macros.fat}
                        />
                    </Progress.Root>
                    <SimpleGrid cols={3} spacing="xs">
                        {(
                            [
                                ['fiber', totals.fiber],
                                ['sugar', totals.sugar],
                                ['salt', totals.salt],
                            ] as const
                        ).map(([key, amount]) => (
                            <Paper key={key} p="xs" ta="center" withBorder>
                                <Text c="dimmed" size="xs">
                                    {t(`nutrition.${key}`)}
                                </Text>
                                <Text fw={600} size="sm">
                                    {value(amount)}
                                </Text>
                            </Paper>
                        ))}
                    </SimpleGrid>
                    {showMealDistribution && calorieTotal > 0 && (
                        <>
                            <Divider />
                            <Text c="dimmed" fw={600} size="xs">
                                {t('nutrition.calories_by_meal')}
                            </Text>
                            <Progress.Root
                                aria-label={t('nutrition.calories_by_meal')}
                                role="group"
                                size="md"
                            >
                                {mealCalories.map((meal, index) => (
                                    <Progress.Section
                                        aria-label={meal.label}
                                        color={meal.color}
                                        key={`${meal.label}:${index}`}
                                        value={
                                            (meal.calories / calorieTotal) * 100
                                        }
                                    />
                                ))}
                            </Progress.Root>
                            <Group gap="xs">
                                {mealCalories.map((meal, index) =>
                                    meal.calories > 0 ? (
                                        <Group
                                            gap={4}
                                            key={`${meal.label}:${index}`}
                                            wrap="nowrap"
                                        >
                                            <Box
                                                aria-hidden
                                                bg={meal.color}
                                                h={8}
                                                style={{
                                                    borderRadius: '50%',
                                                    flexShrink: 0,
                                                }}
                                                w={8}
                                            />
                                            <Text c="dimmed" size="xs">
                                                {meal.label}{' '}
                                                {format.format(
                                                    (meal.calories /
                                                        calorieTotal) *
                                                        100,
                                                )}
                                                %
                                            </Text>
                                        </Group>
                                    ) : null,
                                )}
                            </Group>
                        </>
                    )}
                </Stack>
            )}
        </Stack>
    );
};
