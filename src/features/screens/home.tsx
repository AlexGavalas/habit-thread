'use client';

import { Button, Group, Text, Title } from '@mantine/core';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale/el';
import { enGB } from 'date-fns/locale/en-GB';
import { EditPencil, Running } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ReadError } from '~components/read-error';
import { useMeasurementSummary } from '~hooks/use-measurement-summary';

import { HealthSummary } from './home-health-summary';
import {
    getFirstName,
    getGreetingPeriod,
    getNextMealIndex,
    getTimelineTrend,
} from './home-helpers';
import { TodayMeals } from './home-meals';
import { SummaryCards } from './home-summary-cards';
import { type HomeProps, type MealItem } from './home-types';
import styles from './home.module.css';
import { useHomeActions } from './use-home-actions';

export const Home = ({
    dailyMeals,
    date,
    fullName,
    targetWeight,
    weeklyMealZones,
}: HomeProps): ReactElement => {
    const { t, i18n } = useTranslation();
    const { handleAddActivity, handleAddMeasurement } = useHomeActions();
    const {
        data: summary,
        isError,
        isFetching,
        refetch,
    } = useMeasurementSummary();
    const handleRetry = (): void => {
        void refetch();
    };
    const now = parseISO(date);
    const day = format(now, 'yyyy-MM-dd');
    const todayZones = weeklyMealZones
        .filter((zone) => zone.day === day)
        .toSorted((a, b) => a.position - b.position);
    const nextMealIndex = getNextMealIndex(date, todayZones);
    const mealItems: MealItem[] = todayZones.map((zone) => {
        const mealRecord = dailyMeals[zone.zoneKey];
        return {
            key: zone.zoneKey,
            label: zone.legacyKey
                ? t(`meal_zone_settings.labels.${zone.legacyKey}`)
                : zone.label,
            legacyKey: zone.legacyKey,
            meal: mealRecord?.meal.trim() || null,
            mealRecord,
            time: zone.time,
        };
    });
    const plannedMeals = mealItems.filter(({ meal }) => meal).length;
    const nextMeal =
        nextMealIndex >= 0 ? (mealItems[nextMealIndex] ?? null) : null;
    const currentWeight = summary?.currentWeight || null;
    const weightTrend = getTimelineTrend(summary?.weightTimeline);

    return (
        <main className={styles.layout}>
            <header className={styles.hero}>
                <div>
                    <Title order={1} size="h2">
                        {t(
                            `home_dashboard.greeting.${getGreetingPeriod(now.getHours())}`,
                            { name: getFirstName(fullName) },
                        )}
                    </Title>
                    <Text c="dimmed">
                        {t('home_dashboard.subtitle', {
                            date: format(now, 'EEEE, d MMMM', {
                                locale: i18n.language === 'gr' ? el : enGB,
                            }),
                        })}
                    </Text>
                </div>
                <Group className={styles.heroActions} gap="sm" wrap="nowrap">
                    <Button
                        leftSection={<EditPencil aria-hidden />}
                        onClick={handleAddMeasurement}
                    >
                        {t('home_dashboard.add_measurement')}
                    </Button>
                    <Button
                        leftSection={<Running aria-hidden />}
                        onClick={handleAddActivity}
                        variant="outline"
                    >
                        {t('home_dashboard.add_activity')}
                    </Button>
                </Group>
            </header>

            {isError ? (
                <ReadError onRetry={handleRetry} isRetrying={isFetching} />
            ) : (
                <SummaryCards
                    currentWeight={currentWeight}
                    nextMeal={nextMeal}
                    plannedMeals={plannedMeals}
                    targetWeight={targetWeight}
                    totalMeals={mealItems.length}
                    weightTrend={weightTrend}
                />
            )}

            <section className={styles.contentGrid}>
                <TodayMeals
                    day={day}
                    mealItems={mealItems}
                    nextMealIndex={nextMealIndex}
                />
                <HealthSummary
                    onAddMeasurement={handleAddMeasurement}
                    targetWeight={targetWeight}
                />
            </section>
        </main>
    );
};
