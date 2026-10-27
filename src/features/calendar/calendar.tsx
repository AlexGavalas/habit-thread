import { useDisclosure } from '@mantine/hooks';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

import { Card } from '~components/card';
import { LoadingOverlay } from '~components/loading-overlay';
import { ReadError } from '~components/read-error';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { useWeeklyMealZones } from '~hooks/use-weekly-meal-zones';
import { useCurrentWeek, useMeals } from '~store/hooks';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './calendar.module.css';
import { Content } from './content';
import { Controls } from './controls';
import { MealSwapBoard } from './meal-swap-board';
import { MobileContent } from './mobile-content';
import { PersistenceStatus } from './persistence-status';
import { ScheduleEditor } from './schedule-editor';

export const Calendar = ({
    initialDate,
    initialSchedule,
}: Readonly<{
    initialDate: string;
    initialSchedule: {
        ownerUserId?: number;
        weekStart: string;
        zones: WeeklyMealZone[];
    };
}>): ReactElement => {
    const ref = useRef<HTMLDivElement>(null);
    const [scheduleOpened, scheduleHandlers] = useDisclosure(false);
    const [scheduleDay, setScheduleDay] = useState(initialDate);
    const closeScheduleEditor = scheduleHandlers.close;
    const { currentWeek } = useCurrentWeek();
    const ownerUserId = useMealPlanOwnerId();
    const {
        isLoading: mealsLoading,
        meals,
        isSaving,
        isError,
        retry,
    } = useMeals();
    const schedule = useWeeklyMealZones(currentWeek, initialSchedule);
    const handleSaveSchedule = schedule.save;
    const openScheduleEditor = (day?: string): void => {
        if (isSaving) {
            return;
        }
        setScheduleDay(day ?? schedule.zones[0]?.day ?? initialDate);
        scheduleHandlers.open();
    };

    const handlePrint = useReactToPrint({
        bodyClass: `${styles.print} ${styles.container}`,
        contentRef: ref,
    });

    const handleRetry = (): void => {
        retry();
        schedule.retry();
    };
    if (isError || schedule.isError) {
        return (
            <ReadError
                onRetry={handleRetry}
                isRetrying={mealsLoading || schedule.isLoading}
            />
        );
    }

    return (
        <section className={styles.container}>
            <LoadingOverlay visible={mealsLoading || schedule.isLoading} />
            <div id="meal-plan-container">
                <Controls
                    onEditSchedule={openScheduleEditor}
                    onPrint={handlePrint}
                />
                <PersistenceStatus />
            </div>
            <div ref={ref} className={styles.desktopCalendar}>
                <Card>
                    <MealSwapBoard
                        key={`${ownerUserId}-${currentWeek.toISOString()}-${schedule.zones.map((zone) => `${zone.zoneKey}:${zone.day}`).join(',')}`}
                        zones={schedule.zones}
                    >
                        <Content
                            onEditSchedule={openScheduleEditor}
                            zones={schedule.zones}
                        />
                    </MealSwapBoard>
                </Card>
            </div>
            <div className={styles.mobileCalendar}>
                <MobileContent
                    initialDate={initialDate}
                    onEditSchedule={openScheduleEditor}
                    zones={schedule.zones}
                />
            </div>
            <ScheduleEditor
                isSaving={schedule.isSaving}
                initialDay={scheduleDay}
                meals={meals}
                onClose={closeScheduleEditor}
                onSave={handleSaveSchedule}
                opened={scheduleOpened}
                weekStart={schedule.weekStart}
                zones={schedule.zones}
            />
        </section>
    );
};
