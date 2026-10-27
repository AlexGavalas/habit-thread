'use client';

import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale/el';
import { enGB } from 'date-fns/locale/en-GB';
import { EditPencil, NavArrowRight } from 'iconoir-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '~components/card';
import { ReadError } from '~components/read-error';
import { useMeasurementSummary } from '~hooks/use-measurement-summary';

import { getTimelineTrend, toSparklinePoints } from './home-helpers';
import { Trend } from './home-trend';
import styles from './home.module.css';

type HealthSummaryProps = Readonly<{
    onAddMeasurement: () => void;
    targetWeight: number | null;
}>;

export const HealthSummary = ({
    onAddMeasurement,
    targetWeight,
}: HealthSummaryProps): ReactElement => {
    const { t, i18n } = useTranslation();
    const {
        data: summary,
        isError,
        isFetching,
        refetch,
    } = useMeasurementSummary();
    const handleRetry = (): void => {
        void refetch();
    };
    const weight = getTimelineTrend(summary?.weightTimeline);
    const fat = getTimelineTrend(summary?.fatTimeline);
    const formatter = new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 1,
    });
    const latestDate = weight.latestDate ?? fat.latestDate;
    const hasMeasurements = weight.current !== null || fat.current !== null;
    const weightGap =
        weight.current !== null && targetWeight
            ? Math.abs(weight.current - targetWeight)
            : null;

    return (
        <Card>
            <section
                aria-labelledby="health-trend-title"
                id="health-trend-container"
            >
                <Group
                    className={styles.sectionHeader}
                    justify="space-between"
                    mb="lg"
                    wrap="nowrap"
                >
                    <Title id="health-trend-title" order={2} size="h3">
                        {t('home_dashboard.health_trend')}
                    </Title>
                    <Button
                        component={Link}
                        href="/settings"
                        rightSection={<NavArrowRight aria-hidden />}
                        size="compact-sm"
                        variant="subtle"
                    >
                        {t('home_dashboard.details')}
                    </Button>
                </Group>
                {isError ? (
                    <ReadError onRetry={handleRetry} isRetrying={isFetching} />
                ) : !hasMeasurements ? (
                    <EmptyHealthSummary onAddMeasurement={onAddMeasurement} />
                ) : (
                    <Stack gap="lg">
                        {weight.current !== null && (
                            <div>
                                <Text c="dimmed" size="sm">
                                    {t('home_dashboard.latest_weight', {
                                        date: latestDate
                                            ? format(
                                                  parseISO(latestDate),
                                                  'd MMM',
                                                  {
                                                      locale:
                                                          i18n.language === 'gr'
                                                              ? el
                                                              : enGB,
                                                  },
                                              )
                                            : '',
                                    })}
                                </Text>
                                <Group align="baseline" justify="space-between">
                                    <Text className={styles.metricValue}>
                                        {formatter.format(weight.current)}{' '}
                                        {t('kg')}
                                    </Text>
                                    <Trend
                                        change={weight.change}
                                        date={weight.firstDate}
                                        unit={t('kg')}
                                    />
                                </Group>
                                {weight.values.length > 1 && (
                                    <svg
                                        aria-label={t(
                                            'home_dashboard.weight_trend_label',
                                        )}
                                        className={styles.sparkline}
                                        preserveAspectRatio="none"
                                        role="img"
                                        viewBox="0 0 100 28"
                                    >
                                        <polyline
                                            points={toSparklinePoints(
                                                weight.values,
                                            )}
                                        />
                                    </svg>
                                )}
                            </div>
                        )}
                        {fat.current !== null && (
                            <div>
                                <Text c="dimmed" size="sm">
                                    {t('home_dashboard.body_fat')}
                                </Text>
                                <Group align="baseline" justify="space-between">
                                    <Text className={styles.metricValue}>
                                        {formatter.format(fat.current)}%
                                    </Text>
                                    <Trend
                                        change={fat.change}
                                        date={fat.firstDate}
                                        unit={t(
                                            'home_dashboard.percentage_points',
                                        )}
                                    />
                                </Group>
                            </div>
                        )}
                        {weightGap !== null && (
                            <Text c="dimmed" size="sm">
                                {weightGap === 0
                                    ? t('home_dashboard.target_reached')
                                    : t('home_dashboard.to_target', {
                                          amount: formatter.format(weightGap),
                                          unit: t('kg'),
                                      })}
                            </Text>
                        )}
                    </Stack>
                )}
            </section>
        </Card>
    );
};

const EmptyHealthSummary = ({
    onAddMeasurement,
}: Readonly<{ onAddMeasurement: () => void }>): ReactElement => {
    const { t } = useTranslation();

    return (
        <Stack align="flex-start" gap="sm">
            <Text c="dimmed">{t('home_dashboard.no_measurements')}</Text>
            <Button
                leftSection={<EditPencil aria-hidden />}
                onClick={onAddMeasurement}
                variant="outline"
            >
                {t('home_dashboard.add_measurement')}
            </Button>
        </Stack>
    );
};
