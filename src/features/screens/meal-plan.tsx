'use client';

import { parseISO } from 'date-fns';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

import { Calendar } from '~features/calendar';
import { DeepLinkedMealModal } from '~features/calendar/deep-linked-meal-modal';
import { MealPlanOwnerProvider } from '~features/meal-plan-owner';
import { useCurrentWeek } from '~store/hooks';
import { type MealZoneKey, type WeeklyMealZone } from '~types/meal-zone';

export const MealPlan = ({
    canEditAnnotations,
    initialDate,
    initialMealZone,
    initialSlotKey,
    initialWeeklyMealZones,
    initialWeekStart,
    ownerUserId,
}: Readonly<{
    canEditAnnotations: boolean;
    initialDate: string;
    initialMealZone?: MealZoneKey;
    initialSlotKey?: string;
    initialWeeklyMealZones: WeeklyMealZone[];
    initialWeekStart: string;
    ownerUserId: number;
}>): ReactElement => {
    const { goToDate } = useCurrentWeek();

    useEffect(() => {
        goToDate(parseISO(initialDate));
    }, [goToDate, initialDate]);

    return (
        <MealPlanOwnerProvider
            canEditAnnotations={canEditAnnotations}
            ownerUserId={ownerUserId}
        >
            <DeepLinkedMealModal
                date={initialDate}
                initialSchedule={{
                    ownerUserId,
                    weekStart: initialWeekStart,
                    zones: initialWeeklyMealZones,
                }}
                mealZone={initialMealZone}
                slotKey={initialSlotKey}
            />
            <Calendar
                initialDate={initialDate}
                initialSchedule={{
                    ownerUserId,
                    weekStart: initialWeekStart,
                    zones: initialWeeklyMealZones,
                }}
            />
        </MealPlanOwnerProvider>
    );
};
