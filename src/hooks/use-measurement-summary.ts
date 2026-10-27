import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { measurementSummaryResponseSchema } from '~schemas/measurement';
import { type MeasurementSummary } from '~types/measurement';
import { getMeasurementSummaryQueryKey } from '~util/query-keys';

import { useProfile } from './use-profile';

export const useMeasurementSummary = (): UseQueryResult<MeasurementSummary> => {
    const { profile } = useProfile();

    return useQuery({
        enabled: Boolean(profile),
        queryFn: async ({ signal }): Promise<MeasurementSummary> => {
            const response = await fetch('/api/v1/measurement?type=summary', {
                signal,
            });

            if (!response.ok) {
                throw new Error('Could not load measurements');
            }

            return measurementSummaryResponseSchema.parse(await response.json())
                .data;
        },
        queryKey: getMeasurementSummaryQueryKey(profile?.id),
    });
};
