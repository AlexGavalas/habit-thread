import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { type PropsWithChildren, type ReactElement } from 'react';

import { MealPlanOwnerProvider } from '~features/meal-plan-owner';
import { currentWeekAtom } from '~store/atoms';
import { type Meal } from '~types/meal';

export const porridge: Meal = {
    day: '2026-01-12',
    id: '10accc9d-f0b7-4225-87df-3e91d5639d75',
    meal: 'Porridge',
    note: 'Oat milk',
    rating: 5,
    section_key: 'monday',
    user_id: 7,
};

export const createMealPlanTestContext = (
    initialMeals: Meal[] = [porridge],
): {
    queryClient: QueryClient;
    Wrapper: (props: PropsWithChildren) => ReactElement;
} => {
    const store = createStore();
    store.set(currentWeekAtom, new Date('2026-01-12T12:00:00Z'));
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(['meals', 7, '2026-01-12'], initialMeals);
    const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
        <Provider store={store}>
            <MealPlanOwnerProvider canEditAnnotations ownerUserId={7}>
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            </MealPlanOwnerProvider>
        </Provider>
    );
    return { queryClient, Wrapper };
};

export const deferred = <Value,>(): {
    promise: Promise<Value>;
    resolve: (value: Value) => void;
    reject: (error: Error) => void;
} => {
    let resolve: (value: Value) => void = () => {
        throw new Error('Promise not initialized');
    };
    let reject: (error: Error) => void = () => {
        throw new Error('Promise not initialized');
    };
    const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
};
