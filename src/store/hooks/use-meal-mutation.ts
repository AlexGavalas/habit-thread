import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { type EditedMeal, type Meal } from '~types/meal';
import { requireActionSuccess } from '~util/action-result';
import { showErrorNotification } from '~util/notification';

import { saveMealOperation } from '../../app/meal-mutation-actions';
import {
    affectsMealWeek,
    getMealsQueryKey,
    getMutationSlots,
    mealMutationKey,
    type MealMutationVariables,
} from './meal-mutation-state';
import { getMealPlanChanges } from './meal-operations';

export const useMealMutation = (
    ownerUserId: number | undefined,
    weekStart: string,
): ((
    changes: Record<string, EditedMeal>,
    optimistic?: boolean,
) => Promise<void>) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const mutationKey = mealMutationKey(ownerUserId);
    const mutation = useMutation<
        Meal[],
        Error,
        MealMutationVariables,
        { previous: EditedMeal[] }
    >({
        mutationFn: async (
            variables: MealMutationVariables,
        ): Promise<Meal[]> => {
            const result = await saveMealOperation({
                ...getMealPlanChanges(variables.changes, variables.ownerUserId),
                ownerUserId: variables.ownerUserId,
                weekStart: variables.weekStart,
            });
            return requireActionSuccess(result).meals;
        },
        mutationKey,
        onError: (_error, variables, context) => {
            const queryKey = getMealsQueryKey(
                variables.ownerUserId,
                variables.weekStart,
            );
            queryClient.setQueryData<EditedMeal[]>(queryKey, (current = []) => [
                ...current.filter(
                    (meal) => !variables.slots.includes(meal.section_key),
                ),
                ...(context?.previous ?? []),
            ]);
            showErrorNotification({
                message: `${t('errors.meal_save')}. ${t('try_again')}`,
                title: t('notification.error.title'),
            });
        },
        onMutate: async ({
            slots,
            changes,
            optimistic = true,
            ownerUserId: owner,
            weekStart: week,
        }) => {
            const queryKey = getMealsQueryKey(owner, week);
            await queryClient.cancelQueries({ queryKey });
            const previous =
                queryClient.getQueryData<EditedMeal[]>(queryKey) ?? [];
            if (optimistic) {
                queryClient.setQueryData<EditedMeal[]>(
                    queryKey,
                    (current = []) => [
                        ...current.filter(
                            (meal) => !slots.includes(meal.section_key),
                        ),
                        ...Object.values(changes).filter((meal) => meal.meal),
                    ],
                );
            }
            return {
                previous: previous.filter((meal) =>
                    slots.includes(meal.section_key),
                ),
            };
        },
        onSuccess: (saved, variables) => {
            const queryKey = getMealsQueryKey(
                variables.ownerUserId,
                variables.weekStart,
            );
            queryClient.setQueryData<EditedMeal[]>(queryKey, (current = []) => [
                ...current.filter(
                    (meal) => !variables.slots.includes(meal.section_key),
                ),
                ...saved.filter((meal) =>
                    variables.slots.includes(meal.section_key),
                ),
            ]);
        },
        retry: false,
    });
    const persist = async (
        changes: Record<string, EditedMeal>,
        optimistic = true,
    ): Promise<void> => {
        const slots = Object.keys(changes);
        const conflictingWrite = queryClient
            .getMutationCache()
            .findAll({
                mutationKey,
                status: 'pending',
            })
            .some((write) => {
                if (!affectsMealWeek(write.state.variables, weekStart)) {
                    return false;
                }
                const pendingSlots = getMutationSlots(write.state.variables);
                return (
                    pendingSlots?.some((slot) => slots.includes(slot)) ?? true
                );
            });
        if (conflictingWrite || !ownerUserId || ownerUserId === -1) {
            throw new Error('Meal operation is not available');
        }
        await mutation.mutateAsync({
            changes,
            optimistic,
            ownerUserId,
            slots,
            weekStart,
        });
    };
    return persist;
};
