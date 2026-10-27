import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { weeklyMealZoneSchema } from '~schemas/weekly-meal-zone';
import {
    affectsMealWeek,
    mealMutationKey,
} from '~store/hooks/meal-mutation-state';
import { type WeeklyMealZone } from '~types/meal-zone';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';

import { saveWeeklyMealSchedule } from '../app/weekly-meal-zone-actions';

type ScheduleMutationVariables = {
    ownerUserId?: number;
    weekStart: string;
    zones: WeeklyMealZone[];
};
const responseSchema = z.object({ data: z.array(weeklyMealZoneSchema) });

export const useWeeklyMealZones = (
    currentWeek: Date,
    initialSchedule?: Readonly<{
        weekStart: string;
        zones: WeeklyMealZone[];
    }>,
    explicitOwnerUserId?: number,
): {
    isLoading: boolean;
    save: (zones: WeeklyMealZone[]) => Promise<void>;
    weekStart: string;
    zones: WeeklyMealZone[];
} => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId(explicitOwnerUserId);
    const queryClient = useQueryClient();
    const weekStart = format(
        startOfWeek(currentWeek, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    const queryKey = ['weekly-meal-zones', ownerUserId, weekStart] as const;
    const query = useQuery({
        enabled: ownerUserId !== -1,
        initialData:
            initialSchedule?.weekStart === weekStart
                ? initialSchedule.zones
                : undefined,
        queryFn: async (): Promise<WeeklyMealZone[]> => {
            const ownerQuery = ownerUserId ? `&ownerUserId=${ownerUserId}` : '';
            const response = await fetch(
                `/api/v1/weekly-meal-zones?weekStart=${weekStart}${ownerQuery}`,
            );
            if (!response.ok) {
                throw new Error('Could not fetch weekly meal zones');
            }
            return responseSchema.parse(await response.json()).data;
        },
        queryKey,
    });
    const mutation = useMutation({
        mutationKey: mealMutationKey(ownerUserId),
        mutationFn: async (
            variables: ScheduleMutationVariables,
        ): Promise<void> => {
            if (
                queryClient.isMutating({
                    mutationKey: mealMutationKey(variables.ownerUserId),
                    predicate: (write) =>
                        affectsMealWeek(
                            write.state.variables,
                            variables.weekStart,
                        ),
                }) > 1
            ) {
                throw new Error('Another meal operation is pending');
            }
            const response = await saveWeeklyMealSchedule({
                ...(variables.ownerUserId
                    ? { ownerUserId: variables.ownerUserId }
                    : {}),
                weekStart: variables.weekStart,
                zones: variables.zones,
            });
            if (!response.ok) {
                throw new Error('Could not save weekly meal zones');
            }
        },
        onError: (): void => {
            showErrorNotification({
                message: t('meal_plan.schedule.save_error'),
                title: t('notification.error.title'),
            });
        },
        onSuccess: async (_data, variables): Promise<void> => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: [
                        'weekly-meal-zones',
                        variables.ownerUserId,
                        variables.weekStart,
                    ],
                }),
                queryClient.invalidateQueries({
                    queryKey: [
                        'meals',
                        variables.ownerUserId,
                        variables.weekStart,
                    ],
                }),
            ]);
            showSuccessNotification({
                message: t('meal_plan.schedule.save_success'),
                title: t('notification.success.title'),
            });
        },
    });
    const save = async (zones: WeeklyMealZone[]): Promise<void> => {
        await mutation.mutateAsync({ ownerUserId, weekStart, zones });
    };

    return {
        isLoading:
            query.isFetching ||
            (mutation.isPending && mutation.variables.weekStart === weekStart),
        save,
        weekStart,
        zones: query.data ?? [],
    };
};
