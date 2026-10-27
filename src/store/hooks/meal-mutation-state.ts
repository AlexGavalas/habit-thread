import { useMutationState } from '@tanstack/react-query';
import { z } from 'zod';

import { type EditedMeal } from '~types/meal';
export { getMealsQueryKey } from '~util/query-keys';

export type MealMutationVariables = {
    slots: string[];
    changes: Record<string, EditedMeal>;
    optimistic?: boolean;
    ownerUserId: number;
    weekStart: string;
};

const slotsSchema = z.object({ slots: z.array(z.string()) });
const weekScopeSchema = z.object({
    weekStart: z.string(),
    affectedWeeks: z.array(z.string()).optional(),
});

export const affectsMealWeek = (
    variables: unknown,
    weekStart: string,
): boolean => {
    const scope = weekScopeSchema.safeParse(variables).data;
    return (
        !scope || (scope.affectedWeeks ?? [scope.weekStart]).includes(weekStart)
    );
};

export const getMutationSlots = (variables: unknown): string[] | undefined =>
    slotsSchema.safeParse(variables).data?.slots;

export const mealMutationKey = (
    ownerUserId: number | undefined,
): readonly unknown[] => ['meal-plan-write', ownerUserId];

export const useMealMutationState = (
    ownerUserId: number | undefined,
    weekStart?: string,
): {
    pendingSlots: string[];
    isSaving: boolean;
    hasError: boolean;
} => {
    const writes = useMutationState({
        filters: {
            mutationKey: mealMutationKey(ownerUserId),
            predicate: (mutation) =>
                !weekStart ||
                affectsMealWeek(mutation.state.variables, weekStart),
        },
        select: (mutation) => ({
            status: mutation.state.status,
            submittedAt: mutation.state.submittedAt,
            slots: getMutationSlots(mutation.state.variables) ?? [],
        }),
    });
    const pending = writes.filter(({ status }) => status === 'pending');
    const latest = writes.toSorted((a, b) => b.submittedAt - a.submittedAt)[0];
    return {
        hasError: latest?.status === 'error',
        isSaving: pending.length > 0,
        pendingSlots: pending.flatMap(({ slots }) => slots),
    };
};
