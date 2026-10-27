import { createMealPlanHarness, deferred, porridge } from '~test/meal-plan';
import { act, renderHook, waitFor } from '~test/utils';

import { saveMealOperation } from '../../app/meal-mutation-actions';
import { useMeals } from './meals';

jest.mock('~util/notification');

describe('immediate meal moves', () => {
    it('rolls back both slots without reverting an unrelated successful edit', async () => {
        expect.hasAssertions();
        const response =
            deferred<Awaited<ReturnType<typeof saveMealOperation>>>();
        const soup = {
            ...porridge,
            id: 'soup-id',
            section_key: 'tuesday',
            meal: 'Soup',
        };
        const salad = {
            ...porridge,
            id: 'salad-id',
            section_key: 'wednesday',
            meal: 'Salad',
        };
        const { Wrapper, queryClient } = createMealPlanHarness([
            porridge,
            soup,
            salad,
        ]);
        jest.mocked(saveMealOperation)
            .mockReturnValueOnce(response.promise)
            .mockResolvedValueOnce({
                meals: [{ ...salad, meal: 'Green salad' }],
                ok: true,
            });
        const { result } = renderHook(useMeals, { wrapper: Wrapper });
        let outcome: Promise<unknown>;
        act(() => {
            outcome = result.current
                .swapEntries(
                    { day: porridge.day, sectionKey: 'monday' },
                    { day: porridge.day, sectionKey: 'tuesday' },
                )
                .catch((error: unknown) => error);
        });
        await waitFor(() => {
            expect(
                result.current.meals.find(
                    (meal) => meal.section_key === 'tuesday',
                ),
            ).toMatchObject({
                id: porridge.id,
                note: 'Oat milk',
                rating: 5,
            });
        });
        await act(async () => {
            await expect(
                result.current.swapEntries(
                    { day: porridge.day, sectionKey: 'tuesday' },
                    { day: porridge.day, sectionKey: 'thursday' },
                ),
            ).rejects.toThrow('Meal operation is not available');
            await result.current.saveEntryCell({
                meal: salad,
                note: null,
                rating: null,
                sectionKey: salad.section_key,
                timestamp: new Date(salad.day),
                userId: 7,
                value: 'Green salad',
            });
        });
        await act(async () => {
            response.reject(new Error('Network failure'));
            await outcome;
        });
        await waitFor(() => {
            expect(result.current.meals).toStrictEqual(
                expect.arrayContaining([
                    porridge,
                    soup,
                    { ...salad, meal: 'Green salad' },
                ]),
            );
        });
        queryClient.clear();
    });

    it('persists a move to an empty slot without creating an empty meal', async () => {
        expect.hasAssertions();
        const moved = {
            ...porridge,
            section_key: 'tuesday',
            day: '2026-01-13',
        };
        const { Wrapper, queryClient } = createMealPlanHarness();
        jest.mocked(saveMealOperation).mockResolvedValueOnce({
            meals: [moved],
            ok: true,
        });
        const { result } = renderHook(useMeals, { wrapper: Wrapper });
        await act(async () => {
            await result.current.swapEntries(
                { day: porridge.day, sectionKey: 'monday' },
                { day: moved.day, sectionKey: 'tuesday' },
            );
        });
        expect(saveMealOperation).toHaveBeenCalledWith(
            expect.objectContaining({
                deletedIds: [],
                editedMeals: [moved],
                newMeals: [],
            }),
        );
        await waitFor(() => {
            expect(result.current.meals).toStrictEqual([moved]);
        });
        queryClient.clear();
    });
});
