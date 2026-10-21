import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { type PropsWithChildren, type ReactElement } from 'react';

import { MealPlanOwnerProvider } from '~features/meal-plan-owner';
import { currentWeekAtom, unsavedChangesAtom } from '~store/atoms';
import { act, renderHook } from '~test/utils';
import { type Meal } from '~types/meal';

import { useMeals } from './meals';

describe('useMeals swaps', () => {
    it('applies repeated swaps atomically and isolates the plan owner drafts', () => {
        const source = { day: '2026-01-12', sectionKey: 'monday' };
        const destination = { day: '2026-01-13', sectionKey: 'tuesday' };
        const empty = { day: '2026-01-14', sectionKey: 'wednesday' };
        const meal: Meal = {
            day: source.day,
            id: 'meal-id',
            meal: 'Porridge',
            note: 'Client annotation',
            rating: 5,
            section_key: source.sectionKey,
            user_id: 7,
        };
        const otherMeal: Meal = {
            ...meal,
            day: destination.day,
            id: 'other-meal-id',
            meal: 'Soup',
            section_key: destination.sectionKey,
        };
        const otherOwnerChanges = { untouched: { ...meal, user_id: 8 } };
        const store = createStore();
        store.set(currentWeekAtom, new Date('2026-01-12T12:00:00Z'));
        store.set(unsavedChangesAtom, {
            '7': { [source.sectionKey]: { ...meal, meal: 'Edited porridge' } },
            '8': otherOwnerChanges,
        });
        const queryClient = new QueryClient({
            defaultOptions: { queries: { staleTime: Infinity } },
        });
        queryClient.setQueryData(['meals', 7, source.day], [meal, otherMeal]);
        const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
            <Provider store={store}>
                <MealPlanOwnerProvider
                    canEditAnnotations={false}
                    ownerUserId={7}
                >
                    <QueryClientProvider client={queryClient}>
                        {children}
                    </QueryClientProvider>
                </MealPlanOwnerProvider>
            </Provider>
        );
        const { result } = renderHook(useMeals, { wrapper: Wrapper });

        act(() => {
            result.current.swapEntries(source, destination);
            result.current.swapEntries(destination, empty);
        });

        expect(store.get(unsavedChangesAtom)).toStrictEqual({
            '7': {
                [source.sectionKey]: {
                    ...otherMeal,
                    day: source.day,
                    section_key: source.sectionKey,
                },
                [destination.sectionKey]: {
                    day: destination.day,
                    meal: '',
                    section_key: destination.sectionKey,
                    user_id: 7,
                },
                [empty.sectionKey]: {
                    ...meal,
                    day: empty.day,
                    meal: 'Edited porridge',
                    section_key: empty.sectionKey,
                },
            },
            '8': otherOwnerChanges,
        });

        act(() => {
            result.current.revert();
        });

        expect(store.get(unsavedChangesAtom)).toStrictEqual({
            '8': otherOwnerChanges,
        });
        queryClient.clear();
    });
});
