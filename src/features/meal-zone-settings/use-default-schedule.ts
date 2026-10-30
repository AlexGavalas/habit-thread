import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';
import { type z } from 'zod';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import {
    scheduleTemplateResponseSchema,
    type ScheduleTemplate,
} from '~schemas/schedule-template';
import { mealMutationKey } from '~store/hooks/meal-mutation-state';
import { getScheduleTemplateQueryKey } from '~util/query-keys';
import { requireScheduleSuccess } from '~util/schedule-result';

import { saveDefaultSchedule } from '../../app/schedule-actions';

type DefaultScheduleVariables = {
    effectiveFrom: string;
    ownerUserId?: number;
    template: ScheduleTemplate;
};

export const useDefaultSchedule = (
    explicitOwnerUserId?: number,
    enabled = true,
): {
    mutation: UseMutationResult<void, Error, DefaultScheduleVariables>;
    query: UseQueryResult<z.infer<typeof scheduleTemplateResponseSchema>>;
    save: (template: ScheduleTemplate, effectiveFrom: string) => Promise<void>;
} => {
    const ownerUserId = useMealPlanOwnerId(explicitOwnerUserId);
    const client = useQueryClient();
    const query = useQuery({
        enabled: enabled && ownerUserId !== -1,
        queryFn: async ({ signal }) => {
            const queryString = ownerUserId
                ? `?ownerUserId=${ownerUserId}`
                : '';
            const response = await fetch(
                `/api/v1/schedule-template${queryString}`,
                { signal },
            );
            if (!response.ok) {
                throw new Error('Could not fetch default schedule');
            }
            return scheduleTemplateResponseSchema.parse(await response.json());
        },
        queryKey: getScheduleTemplateQueryKey(ownerUserId),
    });
    const mutation = useMutation({
        mutationFn: async (
            variables: DefaultScheduleVariables,
        ): Promise<void> => {
            if (
                client.isMutating({
                    mutationKey: mealMutationKey(variables.ownerUserId),
                }) > 1
            ) {
                throw new Error('Another meal operation is pending');
            }
            requireScheduleSuccess(await saveDefaultSchedule(variables));
        },
        mutationKey: mealMutationKey(ownerUserId),
        onSuccess: async (_data, variables): Promise<void> => {
            await Promise.all([
                client.invalidateQueries({
                    queryKey: getScheduleTemplateQueryKey(
                        variables.ownerUserId,
                    ),
                }),
                client.invalidateQueries({
                    queryKey: ['weekly-meal-zones', variables.ownerUserId],
                }),
            ]);
        },
        retry: false,
    });
    return {
        mutation,
        query,
        save: async (
            template: ScheduleTemplate,
            effectiveFrom: string,
        ): Promise<void> => {
            await mutation.mutateAsync({
                effectiveFrom,
                ownerUserId,
                template,
            });
        },
    };
};
