import { ContextModalsProvider } from '~features/context-modals';
import { useCurrentWeek } from '~store/hooks/current-week';
import { respondFrom } from '~test/fetch';
import { createMealPlanTestContext, porridge } from '~test/meal-plan';
import { act, renderHook, renderWithUser, screen, waitFor } from '~test/utils';
import { type Meal } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';

import { Calendar } from './calendar';

// jsdom has no carousel geometry; real scrolling/layout stays in Playwright.
jest.mock('embla-carousel-react', () => ({
    __esModule: true,
    default: jest.fn(() => [jest.fn(), undefined]),
}));

const zones: WeeklyMealZone[] = [
    {
        day: '2026-01-12',
        label: 'Morning',
        position: 0,
        time: '08:00',
        weekStart: '2026-01-12',
        zoneKey: porridge.section_key,
    },
];

const renderMealPlan = (): ReturnType<typeof renderWithUser> & {
    cleanup: () => void;
    goToNextWeek: () => void;
    respondWithMeals: (meals: Meal[]) => void;
} => {
    const mealsUrl =
        '/api/v1/meal?startDate=2026-01-19&endDate=2026-01-25&ownerUserId=7';
    const nextZones = zones.map((zone) => ({
        ...zone,
        day: '2026-01-19',
        weekStart: '2026-01-19',
    }));
    const responses = new Map<RequestInfo | URL, Response>([
        [mealsUrl, new Response(null, { status: 500 })],
        [
            '/api/v1/weekly-meal-zones?weekStart=2026-01-19&ownerUserId=7',
            Response.json({ data: nextZones }),
        ],
    ]);
    jest.spyOn(global, 'fetch').mockImplementation(respondFrom(responses));
    const { Wrapper, queryClient } = createMealPlanTestContext();
    const week = renderHook(useCurrentWeek, { wrapper: Wrapper });
    const view = renderWithUser(
        <ContextModalsProvider>
            <Calendar
                initialDate="2026-01-12"
                initialSchedule={{
                    ownerUserId: 7,
                    weekStart: '2026-01-12',
                    zones,
                }}
            />
        </ContextModalsProvider>,
        { Wrapper },
    );
    return {
        ...view,
        cleanup: () => {
            view.unmount();
            week.unmount();
            queryClient.clear();
        },
        goToNextWeek: () => {
            act(() => {
                week.result.current.nextWeek();
            });
        },
        respondWithMeals: (meals) => {
            responses.set(mealsUrl, Response.json({ data: meals }));
        },
    };
};

describe('meal-plan read recovery', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('shows a failed next-week read instead of stale meals or an empty plan', async () => {
        expect.hasAssertions();
        const { cleanup, goToNextWeek } = renderMealPlan();
        expect(screen.getAllByText('Porridge')).not.toHaveLength(0);
        goToNextWeek();
        const error = await screen.findByRole('alert');
        expect(error).toHaveTextContent('We could not load your data.');
        expect(screen.queryByText('Porridge')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Plan meal' }),
        ).not.toBeInTheDocument();
        cleanup();
    });

    it('retries a failed read and restores the saved meals and week controls', async () => {
        expect.hasAssertions();
        const { cleanup, goToNextWeek, respondWithMeals, user } =
            renderMealPlan();
        goToNextWeek();
        await screen.findByRole('alert');
        respondWithMeals([{ ...porridge, day: '2026-01-19', meal: 'Soup' }]);
        await user.click(
            screen.getByRole('button', { name: 'Please try again' }),
        );
        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
        const meals = await screen.findAllByText('Soup');
        expect(meals).not.toHaveLength(0);
        expect(
            screen.getAllByRole('button', { name: 'Next week' }),
        ).not.toHaveLength(0);
        cleanup();
    });
});
