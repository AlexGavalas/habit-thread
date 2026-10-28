import { ModalsProvider } from '@mantine/modals';
import type { ReactElement } from 'react';
import { type ReactNode } from 'react';

import { MealPlanOwnerProvider } from '~features/meal-plan-owner';
import { renderWithUser, screen } from '~test/utils';
import { type Meal } from '~types/meal';

import { Cell, type CellProps } from './cell';

jest.mock('~hooks/use-profile', () => ({
    useProfile: jest.fn().mockReturnValue({}),
}));

jest.mock('~store/hooks', () => ({
    ...jest.requireActual<typeof import('~store/hooks')>('~store/hooks'),
    useMeals: jest.fn().mockReturnValue({
        deleteEntryCell: jest.fn(),
        deleteEntryRow: jest.fn(),
        isLoading: false,
        meals: [],
        pendingSlots: [],
        revert: jest.fn(),
        saveEntryCell: jest.fn(),
        saveEntryRow: jest.fn(),
        savePlan: jest.fn(),
    }),
}));

describe('<Cell />', () => {
    const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
        <ModalsProvider>{children}</ModalsProvider>
    );
    const props: CellProps = {
        id: 'id',
        timestamp: new Date(),
    };
    it('renders', () => {
        const { container } = renderWithUser(<Cell {...props} />, { Wrapper });

        expect(container.querySelector('[tabindex="0"]')).toBeInTheDocument();
        expect(screen.queryByText('test meal')).not.toBeInTheDocument();
    });

    it('reveals the plan action on keyboard focus', async () => {
        expect.hasAssertions();
        const { user } = renderWithUser(<Cell {...props} />, { Wrapper });

        expect(
            screen.queryByRole('button', { name: 'Plan meal' }),
        ).not.toBeInTheDocument();

        await user.tab();

        expect(screen.getByRole('button', { name: 'Plan meal' })).toBeVisible();
    });

    describe('when the user has a meal', () => {
        const meal: Meal = {
            day: '2021-01-01',
            id: 'meal-id',
            meal: 'test meal',
            note: null,
            rating: null,
            section_key: 'section-key',
            user_id: 1,
        };

        const propsWithMeal: CellProps = {
            ...props,
            meal,
        };

        it('renders', () => {
            renderWithUser(<Cell {...propsWithMeal} />, {
                Wrapper,
            });

            expect(screen.getByText('test meal')).toBeVisible();
        });

        it('lets a managing professional read feedback without editing it', async () => {
            expect.hasAssertions();
            const { user } = renderWithUser(
                <MealPlanOwnerProvider
                    canEditAnnotations={false}
                    ownerUserId={1}
                >
                    <Cell
                        {...props}
                        meal={{ ...meal, note: 'Client feedback', rating: 3 }}
                    />
                </MealPlanOwnerProvider>,
                { Wrapper },
            );

            expect(screen.getByText('Rating: 3/5')).toBeVisible();
            await user.click(screen.getByRole('button', { name: 'Note' }));
            expect(screen.getByText('Client feedback')).toBeVisible();
            expect(
                screen.queryByRole('button', { name: 'Edit note' }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: 'Rate' }),
            ).not.toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        describe('when the meal has a note', () => {
            const propsWithMealNote: CellProps = {
                ...props,
                meal: {
                    ...meal,
                    note: 'test note',
                },
            };

            it('renders', () => {
                renderWithUser(<Cell {...propsWithMealNote} />, { Wrapper });
                expect(screen.getByText('Note')).toBeVisible();
                expect(screen.getByText('test meal')).toBeVisible();
            });
        });
    });
});
