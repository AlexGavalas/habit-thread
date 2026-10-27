import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { getResponseSchema } from '~schemas/meal';
import { type EditedMeal, type Meal } from '~types/meal';

import { useCurrentWeek } from './current-week';
import { getMealsQueryKey, useMealMutationState } from './meal-mutation-state';
import {
    type SaveEntryCell,
    createMealChange,
    getMealsMap,
    getWeekRange,
    swapMealSlots,
    type MealSlot,
} from './meal-operations';
import { useMealMutation } from './use-meal-mutation';

export const useMeals = (
    explicitOwnerUserId?: number,
): {
    meals: (Meal | EditedMeal)[];
    isLoading: boolean;
    isSaving: boolean;
    pendingSlots: string[];
    saveEntryCell: SaveEntryCell;
    deleteEntryCell: (params: { meal: Meal | EditedMeal }) => Promise<void>;
    swapEntries: (source: MealSlot, destination: MealSlot) => Promise<void>;
} => {
    const { currentWeek } = useCurrentWeek();
    const queryClient = useQueryClient();
    const ownerUserId = useMealPlanOwnerId(explicitOwnerUserId);
    const weekStart = format(
        startOfWeek(currentWeek, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    const queryKey = getMealsQueryKey(ownerUserId, weekStart);
    const state = useMealMutationState(ownerUserId, weekStart);
    const persist = useMealMutation(ownerUserId, weekStart);
    const query = useQuery({
        enabled: ownerUserId !== -1 && !state.isSaving,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        queryKey,
        queryFn: async ({ signal }): Promise<EditedMeal[]> => {
            const { endDate, startDate } = getWeekRange(currentWeek);
            const ownerQuery = ownerUserId ? `&ownerUserId=${ownerUserId}` : '';
            const response = await fetch(
                `/api/v1/meal?startDate=${startDate}&endDate=${endDate}${ownerQuery}`,
                { signal },
            );
            if (!response.ok) {
                throw new Error('Could not fetch meals');
            }
            const { data } = getResponseSchema.parse(await response.json());
            if (!data) {
                throw new Error('Missing meal data');
            }
            return data;
        },
    });
    const saveEntryCell: SaveEntryCell = async (params) => {
        const current = queryClient.getQueryData<EditedMeal[]>(queryKey);
        const meal =
            current?.find((entry) => entry.section_key === params.sectionKey) ??
            params.meal;
        await persist({
            [params.sectionKey]: createMealChange({ ...params, meal }),
        });
    };
    const deleteEntryCell = async ({
        meal,
    }: {
        meal: Meal | EditedMeal;
    }): Promise<void> => {
        await persist({ [meal.section_key]: { ...meal, meal: '' } }, false);
    };
    const swapEntries = async (
        source: MealSlot,
        destination: MealSlot,
    ): Promise<void> => {
        const meals = queryClient.getQueryData<EditedMeal[]>(queryKey) ?? [];
        if (!ownerUserId || source.sectionKey === destination.sectionKey) {
            return;
        }
        const changes = swapMealSlots({
            changes: {},
            destination,
            meals: getMealsMap(meals),
            source,
            userId: ownerUserId,
        });
        if (Object.keys(changes).length) {
            await persist(changes);
        }
    };
    return {
        deleteEntryCell,
        isLoading: query.isFetching,
        isSaving: state.isSaving,
        meals: query.data ?? [],
        pendingSlots: state.pendingSlots,
        saveEntryCell,
        swapEntries,
    };
};
