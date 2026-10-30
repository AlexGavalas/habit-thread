import {
    ActionIcon,
    Button,
    Group,
    Popover,
    Stack,
    Text,
    Title,
    UnstyledButton,
} from '@mantine/core';
import { format, isToday, parseISO } from 'date-fns';
import { EditPencil, Plus } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { type MealsMap } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './content.module.css';
import { CustomScheduleIndicator } from './custom-schedule-indicator';
import { NutritionSummary } from './nutrition-summary';
import { SwappableMeal } from './swappable-meal';

type Props = Readonly<{
    label: string;
    meals: MealsMap;
    onEditSchedule: (day: string) => void;
    timestamp: Date;
    zones: WeeklyMealZone[];
}>;

export const DayLane = ({
    label,
    meals,
    onEditSchedule,
    timestamp,
    zones,
}: Props): ReactElement => {
    const { t } = useTranslation();
    const day = format(timestamp, 'yyyy-MM-dd');
    const today = isToday(timestamp);
    const dayZones = zones
        .filter((zone) => zone.day === day)
        .toSorted((a, b) => a.position - b.position);
    const dayMeals = dayZones.map(({ zoneKey }) => meals[zoneKey]);
    const hasNutrition = dayMeals.some((meal) => meal?.items?.length);
    const handleEditSchedule = onEditSchedule.bind(undefined, day);

    return (
        <section className={styles.dayLane}>
            <header className={styles.dayHeader}>
                <Group align="flex-start" justify="space-between" wrap="nowrap">
                    <div>
                        <Title
                            aria-current={today ? 'date' : undefined}
                            c={today ? 'success.8' : undefined}
                            order={3}
                            size="h4"
                        >
                            <span className={styles.dayTitleContent}>
                                {label}
                                {dayZones.some((zone) => zone.isOverride) && (
                                    <CustomScheduleIndicator />
                                )}
                            </span>
                        </Title>
                        <Text c="dimmed" size="xs">
                            {t('meal_plan.schedule.slot_count', {
                                count: dayZones.length,
                            })}
                        </Text>
                    </div>
                    <ActionIcon
                        aria-label={t('meal_plan.schedule.edit_day', {
                            day: label,
                            interpolation: { escapeValue: false },
                        })}
                        onClick={handleEditSchedule}
                        variant="subtle"
                    >
                        <EditPencil />
                    </ActionIcon>
                </Group>
                {hasNutrition && (
                    <Popover position="bottom" width={300} withArrow>
                        <Popover.Target>
                            <UnstyledButton
                                aria-description={t('nutrition.details')}
                                className={styles.nutritionButton}
                            >
                                <NutritionSummary compact meals={dayMeals} />
                            </UnstyledButton>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <NutritionSummary meals={dayMeals} />
                        </Popover.Dropdown>
                    </Popover>
                )}
            </header>
            <Stack className={styles.slots} gap="compact">
                {dayZones.map((zone) => {
                    const meal = meals[zone.zoneKey];
                    const slotLabel = zone.legacyKey
                        ? t(`meal_zone_settings.labels.${zone.legacyKey}`)
                        : zone.label;
                    return (
                        <article className={styles.slot} key={zone.zoneKey}>
                            <SwappableMeal
                                day={zone.day}
                                id={zone.zoneKey}
                                label={`${label}, ${slotLabel}, ${zone.time}`}
                                meal={meal}
                                slotLabel={slotLabel}
                                time={zone.time}
                                timestamp={parseISO(zone.day)}
                            />
                        </article>
                    );
                })}
            </Stack>
            <Button
                fullWidth
                leftSection={<Plus />}
                onClick={handleEditSchedule}
                variant="subtle"
            >
                {t('meal_plan.schedule.add_slot')}
            </Button>
        </section>
    );
};
