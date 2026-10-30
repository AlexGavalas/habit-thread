import { Button, Stack, Title } from '@mantine/core';
import { format, getDay, parseISO } from 'date-fns';
import { EditPencil } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMeals } from '~store/hooks';
import { type MealsMap } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';
import { getDaysOfWeek } from '~util/date';

import calendarStyles from './content.module.css';
import { CustomScheduleIndicator } from './custom-schedule-indicator';
import styles from './mobile-content.module.css';
import { MobileDayButton } from './mobile-day-button';
import { MobileMeal } from './mobile-meal';
import { NutritionSummary } from './nutrition-summary';

export const MobileContent = ({
    initialDate,
    onEditSchedule,
    zones,
}: Readonly<{
    initialDate: string;
    onEditSchedule: (day: string) => void;
    zones: WeeklyMealZone[];
}>): ReactElement | null => {
    const { i18n, t } = useTranslation();
    const { meals } = useMeals();
    const [selectedDay, setSelectedDay] = useState(
        () => (getDay(parseISO(initialDate)) + 6) % 7,
    );
    const daysOfWeek = getDaysOfWeek(
        parseISO(zones[0]?.weekStart ?? initialDate),
    );
    const localizedDays = getDaysOfWeek(
        parseISO(zones[0]?.weekStart ?? initialDate),
        'EEE',
        i18n.language === 'gr' ? 'gr' : 'en',
    );
    const mealsMap = meals.reduce<MealsMap>((acc, meal) => {
        acc[meal.section_key] = meal;
        return acc;
    }, {});
    const day = daysOfWeek[selectedDay] ?? daysOfWeek[0];

    if (!day) {
        return null;
    }

    const dayKey = format(day.timestamp, 'yyyy-MM-dd');
    const dayZones = zones
        .filter((zone) => zone.day === dayKey)
        .toSorted((a, b) => a.position - b.position);
    const dayMeals = dayZones.map(({ zoneKey }) => mealsMap[zoneKey]);

    return (
        <Stack gap="lg">
            <div
                aria-label={t('meal_plan.select_day')}
                className={styles.dayPicker}
                role="group"
            >
                {daysOfWeek.map(({ timestamp }, index) => (
                    <MobileDayButton
                        key={timestamp.toISOString()}
                        date={timestamp}
                        index={index}
                        label={localizedDays[index]?.label}
                        onSelect={setSelectedDay}
                        selected={selectedDay === index}
                    />
                ))}
            </div>
            <Stack gap="sm">
                <Title order={3}>
                    <span className={calendarStyles.dayTitleContent}>
                        {localizedDays[selectedDay]?.label}{' '}
                        {format(day.timestamp, 'dd/MM')}
                        {dayZones.some((zone) => zone.isOverride) && (
                            <CustomScheduleIndicator />
                        )}
                    </span>
                </Title>
                <NutritionSummary meals={dayMeals} />
                {dayZones.map((zone) => (
                    <MobileMeal
                        id={zone.zoneKey}
                        key={zone.zoneKey}
                        label={
                            zone.legacyKey
                                ? t(
                                      `meal_zone_settings.labels.${zone.legacyKey}`,
                                  )
                                : zone.label
                        }
                        legacyKey={zone.legacyKey}
                        meal={mealsMap[zone.zoneKey]}
                        time={zone.time}
                        timestamp={parseISO(zone.day)}
                    />
                ))}
                <Button
                    fullWidth
                    leftSection={<EditPencil />}
                    onClick={onEditSchedule.bind(undefined, dayKey)}
                    variant="light"
                >
                    {t('meal_plan.schedule.edit_day', {
                        day: localizedDays[selectedDay]?.label,
                    })}
                </Button>
            </Stack>
        </Stack>
    );
};
