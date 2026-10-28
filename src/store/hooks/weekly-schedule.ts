import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { useStore } from 'jotai';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { currentWeekAtom } from '~store/atoms';
import { requireActionSuccess } from '~util/action-result';
import { showErrorNotification } from '~util/notification';
import { getMealsQueryKey, getWeeklyMealZonesQueryKey } from '~util/query-keys';

import { copyMealPlanWeek } from '../../app/meal-mutation-actions';
import { useCurrentWeek } from './current-week';
import {
    affectsMealWeek,
    mealMutationKey,
    useMealMutationState,
} from './meal-mutation-state';

type CopyWeekVariables = {
    affectedWeeks: string[];
    ownerUserId: number;
    weekStart: string;
};

export const useWeeklyScheduleOps = (): {
    copyToNextWeek: () => Promise<void>;
    isCopyBlocked: boolean;
} => {
    const { t } = useTranslation();
    const { currentWeek } = useCurrentWeek();
    const store = useStore();
    const ownerUserId = useMealPlanOwnerId();
    const visibleOwner = useRef(ownerUserId);
    useEffect(() => {
        visibleOwner.current = ownerUserId;
    }, [ownerUserId]);
    const queryClient = useQueryClient();
    const mutationKey = mealMutationKey(ownerUserId);
    const weekStart = format(
        startOfWeek(currentWeek, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    const nextWeekStart = format(
        addWeeks(parseISO(weekStart), 1),
        'yyyy-MM-dd',
    );
    const sourceState = useMealMutationState(ownerUserId, weekStart);
    const destinationState = useMealMutationState(ownerUserId, nextWeekStart);
    const isCopyBlocked = sourceState.isSaving || destinationState.isSaving;
    const mutation = useMutation({
        mutationFn: async (variables: CopyWeekVariables): Promise<void> => {
            const result = await copyMealPlanWeek({
                ownerUserId: variables.ownerUserId,
                sourceWeek: variables.weekStart,
            });
            requireActionSuccess(result);
        },
        mutationKey,
        onError: (): void => {
            showErrorNotification({
                message: `${t('errors.meal_save')}. ${t('try_again')}`,
                title: t('notification.error.title'),
            });
        },
        onSuccess: async (_data, variables): Promise<void> => {
            const destination = format(
                addWeeks(parseISO(variables.weekStart), 1),
                'yyyy-MM-dd',
            );
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: getMealsQueryKey(
                        variables.ownerUserId,
                        destination,
                    ),
                }),
                queryClient.invalidateQueries({
                    queryKey: getWeeklyMealZonesQueryKey(
                        variables.ownerUserId,
                        destination,
                    ),
                }),
            ]);
            const visibleWeek = format(
                startOfWeek(store.get(currentWeekAtom), { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            );
            if (
                visibleWeek === variables.weekStart &&
                visibleOwner.current === variables.ownerUserId
            ) {
                store.set(currentWeekAtom, parseISO(destination));
            }
        },
        retry: false,
    });
    const copyToNextWeek = async (): Promise<void> => {
        if (
            !ownerUserId ||
            queryClient.isMutating({
                mutationKey,
                predicate: (write) =>
                    affectsMealWeek(write.state.variables, weekStart) ||
                    affectsMealWeek(write.state.variables, nextWeekStart),
            }) ||
            !window.confirm(t('meal_plan.persistence.confirm_copy'))
        ) {
            return;
        }
        // Errors are surfaced by the mutation. There is no editor to retain.
        await mutation
            .mutateAsync({
                affectedWeeks: [weekStart, nextWeekStart],
                ownerUserId,
                weekStart,
            })
            .catch(() => undefined);
    };
    return { copyToNextWeek, isCopyBlocked };
};
