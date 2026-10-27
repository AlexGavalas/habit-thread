import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { mealPoolSearchResponseSchema } from '~schemas/meal-pool';
import { type MealTemplate } from '~types/meal-pool';

export type MealPoolSearchResults = {
    client: MealTemplate[];
    own: MealTemplate[];
};

type UseGetMealPool = (params: {
    includeClient?: boolean;
    ownerUserId?: number;
    searchQuery: string;
}) => UseQueryResult<MealTemplate[] | MealPoolSearchResults>;

export const useGetMealPool: UseGetMealPool = ({
    includeClient = false,
    ownerUserId,
    searchQuery,
}) => {
    return useQuery({
        enabled: Boolean(searchQuery),
        queryFn: async (): Promise<MealTemplate[] | MealPoolSearchResults> => {
            const query = new URLSearchParams({ q: searchQuery });
            if (includeClient && ownerUserId) {
                query.set('includeClient', 'true');
                query.set('ownerUserId', String(ownerUserId));
            }
            const response = await fetch(`/api/v1/pool/meal?${query}`);

            if (!response.ok) {
                throw new Error('Could not fetch previous meals');
            }
            const { data } = mealPoolSearchResponseSchema.parse(
                await response.json(),
            );

            return data;
        },
        queryKey: [
            'pool-meal',
            includeClient ? ownerUserId : 'own',
            searchQuery,
        ],
    });
};
