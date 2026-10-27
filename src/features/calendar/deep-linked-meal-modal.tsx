'use client';

import { isSameWeek, parseISO } from 'date-fns';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { useWeeklyMealZones } from '~hooks/use-weekly-meal-zones';
import { useCurrentWeek, useMeals } from '~store/hooks';
import { type EditedMealItem } from '~types/meal';
import { type MealZoneKey, type WeeklyMealZone } from '~types/meal-zone';
import { useOpenContextModal } from '~util/modal';

import { MEAL_MODAL_OPTIONS } from '../modals/meal/meal-modal-options';

type DeepLinkedMealModalProps = Readonly<{
    date: string;
    initialSchedule: {
        ownerUserId?: number;
        weekStart: string;
        zones: WeeklyMealZone[];
    };
    mealZone?: MealZoneKey;
    slotKey?: string;
}>;

export const DeepLinkedMealModal = ({
    date,
    initialSchedule,
    mealZone,
    slotKey,
}: DeepLinkedMealModalProps): null => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    const { currentWeek } = useCurrentWeek();
    const { deleteEntryCell, meals, saveEntryCell, isLoading, isError } =
        useMeals();
    const schedule = useWeeklyMealZones(currentWeek, initialSchedule);
    const { zones } = schedule;
    const openMealModal = useOpenContextModal('meal');
    const openedTarget = useRef<string | null>(null);
    const targetDate = useMemo(() => parseISO(date), [date]);

    useEffect(() => {
        if (
            (!mealZone && !slotKey) ||
            isLoading ||
            isError ||
            schedule.isError ||
            schedule.isLoading ||
            !ownerUserId ||
            !isSameWeek(currentWeek, targetDate, { weekStartsOn: 1 })
        ) {
            return;
        }

        const zone = zones.find(
            (candidate) =>
                candidate.day === date &&
                (candidate.zoneKey === slotKey ||
                    candidate.legacyKey === mealZone),
        );
        if (!zone) {
            return;
        }
        const timestamp = targetDate;
        const sectionKey = zone.zoneKey;
        const targetKey = `${date}:${zone.zoneKey}`;

        if (openedTarget.current === targetKey) {
            return;
        }

        const meal = meals.find((item) => item.section_key === sectionKey);

        openedTarget.current = targetKey;
        openMealModal({
            ...MEAL_MODAL_OPTIONS,
            innerProps: {
                initialItems: meal?.items ?? [],
                initialMeal: meal?.meal ?? '',
                onDelete: async (): Promise<void> => {
                    if (!meal) {
                        return;
                    }
                    await deleteEntryCell({ meal });
                },
                onSave: async (
                    value: string,
                    items: EditedMealItem[],
                ): Promise<void> => {
                    await saveEntryCell({
                        items,
                        meal,
                        note: meal?.note,
                        rating: meal?.rating,
                        sectionKey,
                        timestamp,
                        userId: ownerUserId,
                        value,
                    });
                },
                ownerUserId,
            },
            title: t('edit_meal'),
        });
    }, [
        currentWeek,
        date,
        deleteEntryCell,
        isLoading,
        isError,
        schedule.isError,
        schedule.isLoading,
        mealZone,
        meals,
        openMealModal,
        ownerUserId,
        saveEntryCell,
        slotKey,
        t,
        targetDate,
        zones,
    ]);

    return null;
};
