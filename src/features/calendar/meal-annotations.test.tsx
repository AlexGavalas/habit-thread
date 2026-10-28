import { renderWithUser, screen, within } from '~test/utils';
import { type Meal } from '~types/meal';

import { MealAnnotations } from './meal-annotations';
import { MobileMealDetails } from './mobile-meal-details';

const meal: Meal = {
    day: '2026-01-12',
    id: 'meal-id',
    meal: 'Client meal',
    note: 'A little too salty',
    rating: 4,
    section_key: 'morning_12/01/2026',
    user_id: 1,
};

describe('meal feedback', () => {
    it.each([MealAnnotations, MobileMealDetails])(
        'shows the rating and opens the full note as read-only content',
        async (Component) => {
            expect.hasAssertions();
            const { user } = renderWithUser(<Component meal={meal} />);

            expect(screen.getByText('Rating: 4/5')).toBeVisible();
            expect(
                screen.queryByText('A little too salty'),
            ).not.toBeInTheDocument();

            await user.tab();
            expect(screen.getByRole('button', { name: 'Note' })).toHaveFocus();
            await user.keyboard('{Enter}');

            const note = screen.getByRole('dialog', { name: 'Note' });
            expect(within(note).getByText('A little too salty')).toBeVisible();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        },
    );

    it('omits badges when there is no feedback', () => {
        renderWithUser(
            <MealAnnotations meal={{ ...meal, note: null, rating: null }} />,
        );

        expect(
            screen.queryByRole('button', { name: 'Note' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Rating/)).not.toBeInTheDocument();
    });

    it('shows a rating without requiring a note', () => {
        renderWithUser(<MealAnnotations meal={{ ...meal, note: null }} />);

        expect(screen.getByText('Rating: 4/5')).toBeVisible();
        expect(
            screen.queryByRole('button', { name: 'Note' }),
        ).not.toBeInTheDocument();
    });
});
