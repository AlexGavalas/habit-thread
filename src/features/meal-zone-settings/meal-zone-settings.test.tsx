import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { type PropsWithChildren } from 'react';

import { DEFAULT_MEAL_ZONE_TIMES } from '~constants/calendar';
import { useMealZoneTimes } from '~hooks/use-meal-zone-times';
import { renderWithUser, screen, waitFor } from '~test/utils';

import { saveMealZoneTimes } from '../../app/actions';
import { MealZoneSettings } from './meal-zone-settings';

jest.mock('~hooks/use-meal-zone-times');
jest.mock('~util/notification');

describe('meal zone settings', () => {
    it('captures a changed native time value before saving', async () => {
        expect.hasAssertions();

        jest.mocked(useMealZoneTimes).mockReturnValue({
            effectiveFrom: '2026-10-12',
            isError: false,
            isFetching: false,
            retry: jest.fn(),
            times: DEFAULT_MEAL_ZONE_TIMES,
        });
        jest.mocked(saveMealZoneTimes).mockResolvedValue({
            effectiveFrom: '2026-10-12',
            ok: true,
        });

        const client = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        );
        const { user } = renderWithUser(<MealZoneSettings />, { Wrapper });

        const morningInput = screen.getByLabelText('Morning');
        await user.clear(morningInput);
        await user.type(morningInput, '08:30');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(saveMealZoneTimes).toHaveBeenCalledWith({
                times: {
                    ...DEFAULT_MEAL_ZONE_TIMES,
                    morning: '08:30',
                },
            });
        });

        client.clear();
    });

    it('offers retry instead of editing defaults after a failed read', async () => {
        expect.hasAssertions();
        const retry = jest.fn();
        jest.mocked(useMealZoneTimes).mockReturnValue({
            isError: true,
            isFetching: false,
            retry,
            times: DEFAULT_MEAL_ZONE_TIMES,
        });
        const client = new QueryClient();
        const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        );
        const { user } = renderWithUser(<MealZoneSettings />, { Wrapper });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'We could not load your data.',
        );
        expect(
            screen.queryByRole('button', { name: 'Save' }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Please try again' }),
        );
        expect(retry).toHaveBeenCalledTimes(1);
        client.clear();
    });
});
