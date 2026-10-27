import { createMealPlanTestContext, deferred, porridge } from '~test/meal-plan';
import { act, renderHook, waitFor } from '~test/utils';

import { saveMealOperation } from '../../app/meal-mutation-actions';
import { useCurrentWeek } from './current-week';
import { useMeals } from './meals';

jest.mock('~util/notification');

describe('navigation during meal saves', () => {
    it.each<{
        expected: typeof porridge;
        label: string;
        responseValue: Awaited<ReturnType<typeof saveMealOperation>>;
    }>([
        {
            expected: { ...porridge, meal: 'Banana porridge' },
            label: 'success',
            responseValue: {
                meals: [{ ...porridge, meal: 'Banana porridge' }],
                ok: true,
            },
        },
        {
            expected: porridge,
            label: 'failure',
            responseValue: { ok: false, reason: 'invalid' },
        },
    ])(
        'keeps $label in the originating week',
        async ({ expected, responseValue }) => {
            expect.hasAssertions();
            const response =
                deferred<Awaited<ReturnType<typeof saveMealOperation>>>();
            const changed = { ...porridge, meal: 'Banana porridge' };
            const nextMeal = {
                ...porridge,
                day: '2026-01-19',
                id: 'next-id',
                meal: 'Soup',
            };
            const nextSaved = { ...nextMeal, meal: 'Tomato soup' };
            const fetchMock = jest
                .spyOn(global, 'fetch')
                .mockResolvedValueOnce(Response.json({ data: [nextMeal] }));
            jest.mocked(saveMealOperation)
                .mockReturnValueOnce(response.promise)
                .mockResolvedValueOnce({ meals: [nextSaved], ok: true });
            const { Wrapper, queryClient } = createMealPlanTestContext();
            const { result } = renderHook(
                () => ({
                    meals: useMeals(),
                    week: useCurrentWeek(),
                }),
                { wrapper: Wrapper },
            );
            let outcome: Promise<unknown>;
            act(() => {
                outcome = result.current.meals
                    .saveEntryCell({
                        meal: porridge,
                        note: porridge.note,
                        rating: porridge.rating,
                        sectionKey: porridge.section_key,
                        timestamp: new Date(porridge.day),
                        userId: 7,
                        value: changed.meal,
                    })
                    .catch((error: unknown) => error);
            });
            await waitFor(() => {
                expect(result.current.meals.isSaving).toBe(true);
            });
            act(() => {
                result.current.week.goToDate(new Date('2026-01-19T12:00:00Z'));
            });
            await waitFor(() => {
                expect(result.current.meals).toMatchObject({
                    isSaving: false,
                    meals: [nextMeal],
                });
            });
            await act(async () => {
                await result.current.meals.saveEntryCell({
                    meal: nextMeal,
                    note: nextMeal.note,
                    rating: nextMeal.rating,
                    sectionKey: nextMeal.section_key,
                    timestamp: new Date(nextMeal.day),
                    userId: 7,
                    value: nextSaved.meal,
                });
            });
            await act(async () => {
                response.resolve(responseValue);
                await outcome;
            });
            await waitFor(() => {
                expect({
                    current: result.current.meals.meals,
                    original: queryClient.getQueryData([
                        'meals',
                        7,
                        porridge.day,
                    ]),
                }).toStrictEqual({
                    current: [nextSaved],
                    original: [expected],
                });
            });
            fetchMock.mockRestore();
            queryClient.clear();
        },
    );
});
