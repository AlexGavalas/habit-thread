import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { useStore } from 'jotai';
import { useTranslation } from 'react-i18next';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { currentWeekAtom } from '~store/atoms';
import { showErrorNotification } from '~util/notification';

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
        mutationKey,
        retry: false,
        mutationFn: async (variables: CopyWeekVariables): Promise<void> => {
            const result = await copyMealPlanWeek({
                ownerUserId: variables.ownerUserId,
                sourceWeek: variables.weekStart,
            });
            if (!result.ok) {
                throw new Error('Could not copy meal week');
            }
        },
        onSuccess: async (_data, variables): Promise<void> => {
            const destination = format(
                addWeeks(parseISO(variables.weekStart), 1),
                'yyyy-MM-dd',
            );
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ['meals', variables.ownerUserId, destination],
                }),
                queryClient.invalidateQueries({
                    queryKey: [
                        'weekly-meal-zones',
                        variables.ownerUserId,
                        destination,
                    ],
                }),
            ]);
            const visibleWeek = format(
                startOfWeek(store.get(currentWeekAtom), { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            );
            if (visibleWeek === variables.weekStart) {
                store.set(currentWeekAtom, parseISO(destination));
            }
        },
        onError: (): void => {
            showErrorNotification({
                title: t('notification.error.title'),
                message: `${t('errors.meal_save')}. ${t('try_again')}`,
            });
        },
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
