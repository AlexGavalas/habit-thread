import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';

import { DEFAULT_MEAL_ZONE_TIMES } from '~constants/calendar';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { mealZoneTimesResponseSchema } from '~schemas/meal-zone';
import { type MealZoneTimes } from '~types/meal-zone';
import { getMealZoneTimesQueryKey } from '~util/query-keys';

export const useMealZoneTimes = (
    date?: Date,
    explicitOwnerUserId?: number,
): {
    effectiveFrom?: string;
    isFetching: boolean;
    isError: boolean;
    retry: () => void;
    times: MealZoneTimes;
} => {
    const ownerUserId = useMealPlanOwnerId(explicitOwnerUserId);
    const weekStart = date
        ? format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        : undefined;

    const { data, isFetching, isError, refetch } = useQuery({
        enabled: ownerUserId !== -1,
        queryFn: async ({
            signal,
        }): Promise<{
            data?: MealZoneTimes;
            effectiveFrom?: string;
        }> => {
            const query = new URLSearchParams();
            if (weekStart) {
                query.set('weekStart', weekStart);
            }
            if (ownerUserId) {
                query.set('ownerUserId', String(ownerUserId));
            }
            const queryString = query.toString();
            const response = await fetch(
                `/api/v1/meal-zone-times${queryString ? `?${queryString}` : ''}`,
                { signal },
            );

            if (!response.ok) {
                throw new Error('Could not fetch meal zone times');
            }

            return mealZoneTimesResponseSchema.parse(await response.json());
        },
        queryKey: getMealZoneTimesQueryKey(ownerUserId, weekStart),
    });

    return {
        effectiveFrom: data?.effectiveFrom,
        isError,
        isFetching,
        retry: () => {
            void refetch();
        },
        times: data?.data ?? DEFAULT_MEAL_ZONE_TIMES,
    };
};
