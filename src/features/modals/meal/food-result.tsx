import { Button, Stack, Text } from '@mantine/core';
import type { ReactElement } from 'react';
import { type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { type FoodSearchResult } from '~types/food-search';

type FoodResultProps = Readonly<{
    food: FoodSearchResult;
    onSelect: (food: FoodSearchResult) => void;
}>;

type FoodResultGroupProps = Readonly<{
    foods: readonly FoodSearchResult[];
    onSelect: (food: FoodSearchResult) => void;
    title: string;
}>;

export const FoodResultGroup = ({
    foods,
    onSelect,
    title,
}: FoodResultGroupProps): ReactElement | null => {
    if (foods.length === 0) {
        return null;
    }
    return (
        <Stack gap={2}>
            <Text fw={600} size="sm">
                {title}
            </Text>
            {foods.map((food) => (
                <FoodResult key={food.id} food={food} onSelect={onSelect} />
            ))}
        </Stack>
    );
};

export const FoodResult = ({
    food,
    onSelect,
}: FoodResultProps): ReactElement => {
    const { i18n, t } = useTranslation();

    const handleClick = ((): void => {
        onSelect(food);
    }) satisfies MouseEventHandler<HTMLButtonElement>;

    const format = new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 1,
    });

    const nutrients = [
        food.nutrition.calories === null
            ? null
            : `${format.format(food.nutrition.calories)} kcal`,
        food.nutrition.protein === null
            ? null
            : `${t('modals.meal_edit.food_search.protein')} ${format.format(food.nutrition.protein)} g`,
        food.nutrition.carbohydrates === null
            ? null
            : `${t('modals.meal_edit.food_search.carbohydrates')} ${format.format(food.nutrition.carbohydrates)} g`,
        food.nutrition.fat === null
            ? null
            : `${t('modals.meal_edit.food_search.fat')} ${format.format(food.nutrition.fat)} g`,
    ].filter(Boolean);

    return (
        <Button
            fullWidth
            h="auto"
            justify="flex-start"
            onClick={handleClick}
            py="xs"
            styles={{ label: { whiteSpace: 'normal', width: '100%' } }}
            type="button"
            variant="subtle"
        >
            <Stack align="flex-start" gap={2} ta="left" w="100%">
                <Text fw={600} size="sm">
                    {[food.brand, food.name].filter(Boolean).join(' · ')}
                </Text>
                {food.alternativeName && food.alternativeName !== food.name && (
                    <Text c="dimmed" size="xs">
                        {food.alternativeName}
                    </Text>
                )}
                <Text c="dimmed" size="xs">
                    {nutrients.join(' · ')}{' '}
                    {food.quantity ? `· ${food.quantity}` : ''}
                </Text>
            </Stack>
        </Button>
    );
};
