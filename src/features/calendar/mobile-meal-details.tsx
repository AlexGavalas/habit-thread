import { Group } from '@mantine/core';
import type { ReactElement } from 'react';

import { type EditedMeal, type Meal } from '~types/meal';

import { MealAnnotations } from './meal-annotations';
import { NutritionSummary } from './nutrition-summary';

type MobileMealDetailsProps = Readonly<{
    meal?: Meal | EditedMeal;
}>;

export const MobileMealDetails = ({
    meal,
}: MobileMealDetailsProps): ReactElement => {
    return (
        <Group gap="xs">
            <MealAnnotations meal={meal} />
            {meal?.items?.length ? (
                <NutritionSummary compact meals={[meal]} />
            ) : null}
        </Group>
    );
};
