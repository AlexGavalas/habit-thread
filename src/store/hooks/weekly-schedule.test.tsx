import { type ReactElement } from 'react';

import { MealPlanOwnerProvider } from '~features/meal-plan-owner';
import { createMealPlanTestContext, deferred, porridge } from '~test/meal-plan';
import { act, renderHook, waitFor } from '~test/utils';
import { renderWithUser, screen } from '~test/utils';
import { getMealsQueryKey } from '~util/query-keys';

import { copyMealPlanWeek } from '../../app/meal-mutation-actions';
import { useCurrentWeek } from './current-week';
import { useWeeklyScheduleOps } from './weekly-schedule';

jest.mock('~util/notification');

const CopyWeekView = (): ReactElement => {
    const { copyToNextWeek } = useWeeklyScheduleOps();
    const { currentWeek } = useCurrentWeek();
    const handleCopy = (): void => {
        void copyToNextWeek();
    };
    return (
        <>
            <button type="button" onClick={handleCopy}>
                Copy week
            </button>
            <output aria-label="Visible week">
                {currentWeek.toISOString()}
            </output>
        </>
    );
};

describe('copy week', () => {
    it('confirms replacement and navigates only after persistence succeeds', async () => {
        expect.hasAssertions();
        const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
        jest.mocked(copyMealPlanWeek)
            .mockResolvedValueOnce({ ok: false, reason: 'invalid' })
            .mockResolvedValueOnce({ ok: true });
        const { Wrapper, queryClient } = createMealPlanTestContext();
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
        const response =
            deferred<Awaited<ReturnType<typeof copyMealPlanWeek>>>();
        jest.mocked(copyMealPlanWeek).mockReturnValueOnce(response.promise);
        const { Wrapper, queryClient } = createMealPlanTestContext();
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

    it('reconciles the original owner without navigating a newly selected owner', async () => {
        expect.hasAssertions();
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        const response =
            deferred<Awaited<ReturnType<typeof copyMealPlanWeek>>>();
        jest.mocked(copyMealPlanWeek).mockReturnValueOnce(response.promise);
        const { Wrapper, queryClient } = createMealPlanTestContext();
        queryClient.setQueryData(getMealsQueryKey(7, '2026-01-19'), []);
        queryClient.setQueryData(getMealsQueryKey(42, '2026-01-19'), []);
        const View = ({
            ownerUserId,
        }: Readonly<{ ownerUserId: number }>): ReactElement => (
            <Wrapper>
                <MealPlanOwnerProvider
                    canEditAnnotations={false}
                    ownerUserId={ownerUserId}
                >
                    <CopyWeekView />
                </MealPlanOwnerProvider>
            </Wrapper>
        );
        const { user, rerender, unmount } = renderWithUser(
            <View ownerUserId={7} />,
        );
        await user.click(screen.getByRole('button', { name: 'Copy week' }));
        await waitFor(() => {
            expect(copyMealPlanWeek).toHaveBeenCalledWith({
                ownerUserId: 7,
                sourceWeek: porridge.day,
            });
        });
        rerender(<View ownerUserId={42} />);
        await act(async () => {
            response.resolve({ ok: true });
            await response.promise;
        });
        await waitFor(() => {
            expect(queryClient.isMutating()).toBe(0);
        });
        expect(screen.getByLabelText('Visible week')).toHaveTextContent(
            '2026-01-12',
        );
        expect(
            queryClient.getQueryState(getMealsQueryKey(7, '2026-01-19'))
                ?.isInvalidated,
        ).toBe(true);
        expect(
            queryClient.getQueryState(getMealsQueryKey(42, '2026-01-19'))
                ?.isInvalidated,
        ).toBe(false);
        unmount();
        queryClient.clear();
        jest.restoreAllMocks();
    });
});
