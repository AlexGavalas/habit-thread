import { createMealPlanTestContext, deferred, porridge } from '~test/meal-plan';
import { act, renderHook, waitFor } from '~test/utils';

import { saveMealOperation } from '../../app/meal-mutation-actions';
import { useMeals } from './meals';

jest.mock('~util/notification');

describe('immediate meal saves', () => {
    it('shares pending state and saves an edit without a second submit', async () => {
        expect.hasAssertions();
        const response =
            deferred<Awaited<ReturnType<typeof saveMealOperation>>>();
        jest.mocked(saveMealOperation).mockReturnValueOnce(response.promise);
        const { Wrapper, queryClient } = createMealPlanTestContext();
        const { result } = renderHook(
            () => ({
                first: useMeals(),
                second: useMeals(),
            }),
            { wrapper: Wrapper },
        );
        let saving: Promise<void>;
        act(() => {
            saving = result.current.first.saveEntryCell({
                meal: porridge,
                note: porridge.note,
                rating: porridge.rating,
                sectionKey: porridge.section_key,
                timestamp: new Date(porridge.day),
                userId: 7,
                value: 'Banana porridge',
            });
        });
        await waitFor(() => {
            expect(result.current.second.pendingSlots).toStrictEqual([
                'monday',
            ]);
        });
        expect(saveMealOperation).toHaveBeenCalledWith(
            expect.objectContaining({
                editedMeals: [
                    expect.objectContaining({
                        id: porridge.id,
                        meal: 'Banana porridge',
                    }),
                ],
                ownerUserId: 7,
                weekStart: '2026-01-12',
            }),
        );
        await act(async () => {
            response.resolve({
                meals: [{ ...porridge, meal: 'Banana porridge' }],
                ok: true,
            });
            await saving;
        });
        await waitFor(() => {
            expect(result.current.second.isSaving).toBe(false);
        });
        queryClient.clear();
    });

    it('keeps a deleting meal visible and restores it on failure', async () => {
        expect.hasAssertions();
        const response =
            deferred<Awaited<ReturnType<typeof saveMealOperation>>>();
        jest.mocked(saveMealOperation).mockReturnValueOnce(response.promise);
        const { Wrapper, queryClient } = createMealPlanTestContext();
        const { result } = renderHook(useMeals, { wrapper: Wrapper });
        let outcome: Promise<unknown>;
        act(() => {
            outcome = result.current
                .deleteEntryCell({ meal: porridge })
                .catch((error: unknown) => error);
        });
        await waitFor(() => {
            expect(result.current.isSaving).toBe(true);
        });
        expect(result.current.meals).toStrictEqual([porridge]);
        await act(async () => {
            response.resolve({ ok: false, reason: 'invalid' });
            await outcome;
        });
        expect(result.current.meals).toStrictEqual([porridge]);
        queryClient.clear();
    });

    it('uses the generated ID when editing a newly created meal again', async () => {
        expect.hasAssertions();
        const { Wrapper, queryClient } = createMealPlanTestContext([]);
        jest.mocked(saveMealOperation).mockResolvedValue({
            meals: [porridge],
            ok: true,
        });
        const { result } = renderHook(useMeals, { wrapper: Wrapper });
        await act(async () => {
            await result.current.saveEntryCell({
                note: null,
                rating: null,
                sectionKey: 'monday',
                timestamp: new Date(porridge.day),
                userId: 7,
                value: 'Porridge',
            });
        });
        await act(async () => {
            await result.current.saveEntryCell({
                meal: result.current.meals[0],
                note: 'New note',
                rating: 4,
                sectionKey: 'monday',
                timestamp: new Date(porridge.day),
                userId: 7,
                value: 'Porridge',
            });
        });
        expect(saveMealOperation).toHaveBeenLastCalledWith(
            expect.objectContaining({
                editedMeals: [
                    expect.objectContaining({
                        id: porridge.id,
                        note: 'New note',
                    }),
                ],
                newMeals: [],
            }),
        );
        queryClient.clear();
    });
});
