import { renderWithUser, screen } from '~test/utils';

import { MealFoodWorkspace } from './meal-food-workspace';

describe('meal workspace navigation', () => {
    it.each([
        {
            initialLabel: 'Search',
            initialView: 'search',
            nextView: 'Selected (0)',
        },
        {
            initialLabel: 'Selected (0)',
            initialView: 'selected',
            nextView: 'Search',
        },
    ] as const)(
        'starts on %s and allows switching views',
        async ({ initialLabel, initialView, nextView }) => {
            expect.hasAssertions();
            const handleItemsChange = jest.fn();
            const { user } = renderWithUser(
                <MealFoodWorkspace
                    details={null}
                    initialView={initialView}
                    items={[]}
                    onItemsChange={handleItemsChange}
                    recentlyAddedIndex={null}
                >
                    <p>Search content</p>
                </MealFoodWorkspace>,
            );
            const search = screen.getByRole('button', { name: 'Search' });
            const selected = screen.getByRole('button', {
                name: 'Selected (0)',
            });
            expect(
                screen.getByRole('button', { pressed: true }),
            ).toHaveAccessibleName(initialLabel);
            await user.click(screen.getByRole('button', { name: nextView }));
            expect(search).toHaveAttribute(
                'aria-pressed',
                String(initialView !== 'search'),
            );
            expect(selected).toHaveAttribute(
                'aria-pressed',
                String(initialView !== 'selected'),
            );
        },
    );
});
