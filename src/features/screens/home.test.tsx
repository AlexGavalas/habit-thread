import { ContextModalsProvider } from '~features/context-modals';
import { useUser } from '~hooks/use-user';
import { respondFrom } from '~test/fetch';
import { createQueryTestContext } from '~test/query';
import { testUser } from '~test/user';
import { renderWithUser, screen, waitFor, within } from '~test/utils';

import { Home } from './home';

jest.mock('~hooks/use-user');

describe('dashboard creation actions', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('opens the measurement and activity editors from their advertised actions', async () => {
        expect.hasAssertions();
        jest.mocked(useUser).mockReturnValue({
            isLoading: false,
            user: { email: testUser.email },
        });
        const responses = new Map<RequestInfo | URL, Response>([
            ['/api/v1/user', Response.json({ data: testUser })],
            [
                '/api/v1/measurement?type=summary',
                Response.json({
                    data: {
                        currentFat: 19,
                        currentWeight: 81,
                        fatTimeline: null,
                        weightTimeline: [{ x: '2026-01-12', y: 81 }],
                    },
                }),
            ],
        ]);
        jest.spyOn(global, 'fetch').mockImplementation(respondFrom(responses));
        const { client, Wrapper } = createQueryTestContext();
        const { user, unmount } = renderWithUser(
            <ContextModalsProvider>
                <Home
                    dailyMeals={{}}
                    date="2026-01-12T12:00:00Z"
                    fullName="Test User"
                    targetWeight={75}
                    weeklyMealZones={[]}
                />
            </ContextModalsProvider>,
            { Wrapper },
        );
        await waitFor(() => {
            expect(
                screen.getAllByRole('button', { name: 'Add measurement' }),
            ).toHaveLength(1);
        });
        await user.click(
            screen.getByRole('button', { name: 'Add measurement' }),
        );
        const measurement = await screen.findByRole('dialog', {
            name: 'Add a new measurement',
        });
        expect(within(measurement).getByLabelText('Weight')).toBeVisible();
        expect(
            within(measurement).getByLabelText('Fat percentage'),
        ).toBeVisible();
        await user.click(
            within(measurement).getByRole('button', { name: 'Cancel' }),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Add an activity' }),
        );
        const activity = await screen.findByRole('dialog', {
            name: 'Add a new activity',
        });
        expect(within(activity).getByLabelText('Activity')).toBeVisible();
        await user.click(
            within(activity).getByRole('button', { name: 'Cancel' }),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        unmount();
        client.clear();
    });
});
