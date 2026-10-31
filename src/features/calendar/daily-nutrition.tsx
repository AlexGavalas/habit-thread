import { Popover, UnstyledButton } from '@mantine/core';
import { format } from 'date-fns';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { MEAL_ZONE_KEYS } from '~constants/meal-zones';
import { useCurrentWeek, useMeals } from '~store/hooks';
import { type MealsMap } from '~types/meal';
import { getDaysOfWeek } from '~util/date';

import styles from './daily-nutrition.module.css';
import { NutritionSummary } from './nutrition-summary';

export const DailyNutrition = (): ReactElement => {
    const { t } = useTranslation();
    const { currentWeek } = useCurrentWeek();
    const { meals } = useMeals();
    const map = meals.reduce<MealsMap>((result, meal) => {
        result[meal.section_key] = meal;
        return result;
    }, {});

    return (
        <div className={styles.wrapper}>
            <div />
            {getDaysOfWeek(currentWeek).map(({ label, timestamp }) => {
                const day = format(timestamp, 'yyyy-MM-dd');
                const dayMeals = Object.values(map)
                    .filter((meal) => meal.day === day)
                    .sort((a, b) => {
                        const zone = (meal: typeof a): number =>
                            MEAL_ZONE_KEYS.findIndex(
                                (key) => key === meal.section_key.split('_')[0],
                            );
                        return zone(a) - zone(b);
                    });
                const hasNutrition = dayMeals.some(
                    (meal) => meal.items?.length,
                );
                return (
                    <div className={styles.day} key={label}>
                        {hasNutrition ? (
                            <Popover position="bottom" width={300} withArrow>
                                <Popover.Target>
                                    <UnstyledButton
                                        aria-label={t('nutrition.details')}
                                        className={styles.button}
                                    >
                                        <NutritionSummary
                                            compact
                                            meals={dayMeals}
                                        />
                                    </UnstyledButton>
                                </Popover.Target>
                                <Popover.Dropdown>
                                    <NutritionSummary meals={dayMeals} />
                                </Popover.Dropdown>
                            </Popover>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
};
