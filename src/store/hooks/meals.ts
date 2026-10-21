import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { type Meal } from '~types/meal';
import { getDaysOfWeek } from '~util/date';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';

import { saveMealPlan } from '../../app/actions';
import { useCurrentWeek } from './current-week';
import {
    type DeleteEntryCell,
    type DeleteEntryRow,
    type SaveEntryCell,
    type SaveEntryRow,
    type SwapEntries,
    type UseMeals,
    createMealChange,
    getMealPlanChanges,
    getMealsMap,
    getWeekRange,
    swapMealSlots,
} from './meal-operations';
import { useUnsavedChanges } from './unsaved-changes';

export const useMeals: UseMeals = (explicitOwnerUserId) => {
    const { t } = useTranslation();
    const { currentWeek } = useCurrentWeek();
    const queryClient = useQueryClient();

    const ownerUserId = useMealPlanOwnerId(explicitOwnerUserId);
    const { unsavedChanges, removeChanges, addChange, updateChanges } =
        useUnsavedChanges(ownerUserId);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentWeekKey = format(
        startOfWeek(currentWeek, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );

    const { data: meals = [], isFetching: isFetchingMeals } = useQuery({
        enabled: ownerUserId !== -1,
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<Meal[]> => {
            const { endDate, startDate } = getWeekRange(currentWeek);

            const ownerQuery = ownerUserId ? `&ownerUserId=${ownerUserId}` : '';
            const response = await fetch(
                `/api/v1/meal?startDate=${startDate}&endDate=${endDate}${ownerQuery}`,
            );

            const result = (await response.json()) as { data?: Meal[] };

            setIsSubmitting(false);

            return result.data ?? [];
        },
        queryKey: ownerUserId
            ? ['meals', ownerUserId, currentWeekKey]
            : ['meals', currentWeekKey],
    });

    const mealsMap = getMealsMap(meals);

    const savePlan = async (): Promise<boolean> => {
        setIsSubmitting(true);

        const mealPlan = getMealPlanChanges(unsavedChanges, ownerUserId);
        const response = await saveMealPlan(mealPlan).catch(() => ({
            ok: false,
        }));

        if (!response.ok) {
            setIsSubmitting(false);

            showErrorNotification({
                message: `${t('errors.meal_save')}. ${t('try_again')}`,
                title: t('notification.error.title'),
            });
            return false;
        }
        await queryClient.invalidateQueries({
            queryKey: ownerUserId ? ['meals', ownerUserId] : ['meals'],
        });
        setIsSubmitting(false);

        removeChanges();

        showSuccessNotification({
            message: t('notification.success.message'),
            title: t('notification.success.title'),
        });
        return true;
    };

    const deleteEntryCell: DeleteEntryCell = ({ meal }) => {
        const deletedMeal = {
            ...meal,
            meal: '',
        };

        addChange(deletedMeal);
    };

    const deleteEntryRow: DeleteEntryRow = (id) => {
        const [row] = id.split('_');
        const daysOfWeek = getDaysOfWeek(currentWeek);

        for (const { label } of daysOfWeek) {
            const sectionKey = `${row}_${label}`;
            const meal = meals.find((m) => m.section_key === sectionKey);

            if (!meal) {
                console.warn('No meal found for row', row);
                continue;
            }

            deleteEntryCell({ meal });
        }
    };

    const saveEntryCell: SaveEntryCell = (params) => {
        addChange(createMealChange(params));
    };

    const saveEntryRow: SaveEntryRow = ({
        sectionKey,
        userId,
        value,
        items,
        note,
        rating,
    }) => {
        const [row] = sectionKey.split('_');
        const daysOfWeek = getDaysOfWeek(currentWeek);

        for (const { label, timestamp } of daysOfWeek) {
            const key = `${row}_${label}`;

            const meal = mealsMap[key];

            saveEntryCell({
                items,
                meal,
                note,
                rating,
                sectionKey: key,
                timestamp,
                userId,
                value,
            });
        }
    };

    const swapEntries: SwapEntries = (source, destination) => {
        if (!ownerUserId) {
            return;
        }

        updateChanges((changes) =>
            swapMealSlots({
                changes,
                destination,
                meals: mealsMap,
                source,
                userId: ownerUserId,
            }),
        );
    };

    return {
        deleteEntryCell,
        deleteEntryRow,
        isLoading: isFetchingMeals || isSubmitting,
        meals,
        revert: removeChanges,
        saveEntryCell,
        saveEntryRow,
        savePlan,
        swapEntries,
    };
};
