import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { endOfWeek, format, parseISO } from 'date-fns';
import { type z } from 'zod';

import { activitiesResponseSchema } from '~schemas/activity';
import { getWeekActivitiesQueryKey } from '~util/query-keys';

export const useWeekActivities = (
    ownerUserId: number | undefined,
    weekStart: string,
    enabled: boolean,
): UseQueryResult<z.infer<typeof activitiesResponseSchema>['data']> =>
    useQuery({
        enabled: Boolean(ownerUserId) && enabled,
        queryFn: async ({ signal }) => {
            const endDate = format(
                endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            );
            const response = await fetch(
                `/api/v1/activity?startDate=${weekStart}&endDate=${endDate}`,
                { signal },
            );
            if (!response.ok) {
                throw new Error('Could not fetch activities');
            }
            return activitiesResponseSchema.parse(await response.json()).data;
        },
        queryKey: getWeekActivitiesQueryKey(ownerUserId, weekStart),
    });
