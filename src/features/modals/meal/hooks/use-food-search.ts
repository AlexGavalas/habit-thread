import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { foodSearchResponseSchema } from '~schemas/food-search';
import {
    type FoodSearchCountry,
    type FoodSearchResponse,
} from '~types/food-search';
import { parseResponse } from '~util/parse-response';

const emptyResponse: FoodSearchResponse = {
    data: { bls: [], openFoodFacts: [] },
    warnings: [],
};

export const useFoodSearch = ({
    country,
    query,
}: {
    country: FoodSearchCountry;
    query: string;
}): UseQueryResult<FoodSearchResponse> =>
    useQuery({
        enabled: query.length >= 2,
        placeholderData: emptyResponse,
        queryFn: async (): Promise<FoodSearchResponse> => {
            const parameters = new URLSearchParams({ country, q: query });
            const response = await fetch(`/api/v1/food/search?${parameters}`);

            if (!response.ok) {
                throw new Error('Food search failed');
            }
            return parseResponse(response, foodSearchResponseSchema);
        },
        queryKey: ['food-search', query, country],
        retry: false,
        staleTime: 60 * 60 * 1000,
    });
