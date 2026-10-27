import { createMealPlanHarness, deferred, porridge } from '~test/meal-plan';
import { act, renderHook, waitFor } from '~test/utils';

import { copyMealPlanWeek } from '../../app/meal-mutation-actions';
import { useCurrentWeek } from './current-week';
import { useWeeklyScheduleOps } from './weekly-schedule';

jest.mock('~util/notification');

describe('copy week', () => {
    it('confirms replacement and navigates only after persistence succeeds', async () => {
        expect.hasAssertions();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        jest.mocked(copyMealPlanWeek)
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true });
        const { Wrapper, queryClient } = createMealPlanHarness();
        const { result } = renderHook(
            () => ({
                operations: useWeeklyScheduleOps(),
                week: useCurrentWeek(),
            }),
            { wrapper: Wrapper },
        );
        await act(async () => {
            await result.current.operations.copyToNextWeek();
        });
        expect(result.current.week.currentWeek.toISOString()).toContain(
            porridge.day,
        );
        await act(async () => {
            await result.current.operations.copyToNextWeek();
        });
        expect(result.current.week.currentWeek.toISOString()).toContain(
            '2026-01-19',
        );
        expect(copyMealPlanWeek).toHaveBeenCalledWith({
            ownerUserId: 7,
            sourceWeek: porridge.day,
        });
        confirm.mockRestore();
        queryClient.clear();
    });

    it('does not redirect when a copy finishes after navigating to another week', async () => {
        expect.hasAssertions();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const response = deferred<{ ok: boolean }>();
        jest.mocked(copyMealPlanWeek).mockReturnValueOnce(response.promise);
        const { Wrapper, queryClient } = createMealPlanHarness();
        const { result } = renderHook(
            () => ({
                operations: useWeeklyScheduleOps(),
                week: useCurrentWeek(),
            }),
            { wrapper: Wrapper },
        );
        let copying: Promise<void>;
        act(() => {
            copying = result.current.operations.copyToNextWeek();
        });
        await waitFor(() => {
            expect(copyMealPlanWeek).toHaveBeenCalledWith({
                ownerUserId: 7,
                sourceWeek: porridge.day,
            });
        });
        act(() => {
            result.current.week.goToDate(new Date('2026-02-02T12:00:00Z'));
        });
        await act(async () => {
            response.resolve({ ok: true });
            await copying;
        });
        expect(result.current.week.currentWeek.toISOString()).toContain(
            '2026-02-02',
        );
        confirm.mockRestore();
        queryClient.clear();
    });
});
