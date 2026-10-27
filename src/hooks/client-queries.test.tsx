import { createQueryTestContext } from '~test/query';
import { testUser } from '~test/user';
import { renderHook, waitFor } from '~test/utils';

import { useMealZoneTimes } from './use-meal-zone-times';
import { useMeasurementSummary } from './use-measurement-summary';
import { useProfile } from './use-profile';
import { useWeekActivities } from './use-week-activities';

jest.mock('./use-profile');

describe('validated client reads', () => {
    beforeEach(() => {
        jest.mocked(useProfile).mockReturnValue({
            deleteProfile: jest.fn(),
            isDeleting: false,
            isFetching: false,
            profile: testUser,
            updateProfile: jest.fn(),
            user: { email: testUser.email },
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each<
        () =>
            | ReturnType<typeof useMeasurementSummary>
            | ReturnType<typeof useWeekActivities>
    >([
        (): ReturnType<typeof useMeasurementSummary> => useMeasurementSummary(),
        (): ReturnType<typeof useWeekActivities> =>
            useWeekActivities(testUser.id, '2026-01-12', true),
    ])('rejects malformed successful JSON (%#)', async (useRead) => {
        expect.hasAssertions();
        jest.spyOn(global, 'fetch').mockResolvedValue(
            Response.json({ data: 'invalid' }),
        );
        const { client, Wrapper } = createQueryTestContext();
        const { result, unmount } = renderHook(useRead, { wrapper: Wrapper });
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        unmount();
        client.clear();
    });

    it('distinguishes failed zone-time reads from a successful default schedule', async () => {
        expect.hasAssertions();
        jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(null, { status: 500 }),
        );
        const { client, Wrapper } = createQueryTestContext();
        const { result, unmount } = renderHook(
            () => useMealZoneTimes(undefined, testUser.id),
            { wrapper: Wrapper },
        );
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        unmount();
        client.clear();
    });

    it('scopes measurement summaries to the current profile', async () => {
        expect.hasAssertions();
        const summary = {
            currentFat: 0,
            currentWeight: 80,
            fatTimeline: null,
            weightTimeline: null,
        };
        jest.spyOn(global, 'fetch').mockResolvedValue(
            Response.json({ data: summary }),
        );
        const { client, Wrapper } = createQueryTestContext();
        const { result, rerender, unmount } = renderHook(
            useMeasurementSummary,
            { wrapper: Wrapper },
        );
        await waitFor(() => {
            expect(result.current.data?.currentWeight).toBe(80);
        });
        jest.mocked(useProfile).mockReturnValue({
            ...jest.mocked(useProfile)(),
            profile: { ...testUser, id: 42 },
        });
        rerender();
        expect(result.current.data).toBeUndefined();
        unmount();
        client.clear();
    });
});
