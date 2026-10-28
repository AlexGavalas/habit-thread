import { renderWithUser, screen, within } from '~test/utils';
import { type MealTemplate } from '~types/meal-pool';

import type { useCreateMealPool } from './hooks/use-create-meal-pool';
import type { useGetMealPool } from './hooks/use-get-meal-pool';
import { ManualInputTab } from './manual-input';

const mockCreateMealPool = jest.fn<
    Pick<
        ReturnType<typeof useCreateMealPool>,
        'error' | 'isPending' | 'mutate' | 'reset'
    >,
    []
>();
const mockGetMealPool = jest.fn<
    Pick<ReturnType<typeof useGetMealPool>, 'data' | 'isError' | 'isFetching'>,
    []
>();
jest.mock('./hooks/use-create-meal-pool', () => ({
    useCreateMealPool: (): ReturnType<typeof mockCreateMealPool> =>
        mockCreateMealPool(),
}));
jest.mock('./hooks/use-get-meal-pool', () => ({
    useGetMealPool: (): ReturnType<typeof mockGetMealPool> => mockGetMealPool(),
}));

const template: MealTemplate = {
    content: 'Yogurt and oats',
    id: 12,
    items: [
        {
            alternative_name: null,
            basis_grams: 100,
            brand: null,
            calories: 350,
            carbohydrates: 60,
            fat: 5,
            fiber: 10,
            id: 'e7aa8cef-777d-43bd-8510-687732536242',
            name: 'Oats',
            position: 0,
            protein: 12,
            provider_food_id: 'oats',
            quantity_grams: 80,
            salt: null,
            source: 'bls',
            sugar: null,
        },
    ],
};
const mutate = jest.fn();
const reset = jest.fn();

const renderManualInput = (): ReturnType<typeof renderWithUser> =>
    renderWithUser(<ManualInputTab onDone={jest.fn()} />);

const openAndSearch = async (
    user: ReturnType<typeof renderWithUser>['user'],
): Promise<void> => {
    await user.click(
        screen.getByRole('button', { name: 'Use a previous meal…' }),
    );
    await user.type(
        screen.getByRole('textbox', { name: 'Search previous meals' }),
        'oats',
    );
    await screen.findByRole('button', { name: 'Use this meal' });
};

describe('manual meal entry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateMealPool.mockReturnValue({
            error: null,
            isPending: false,
            mutate,
            reset,
        });
        mockGetMealPool.mockReturnValue({
            data: [template],
            isError: false,
            isFetching: false,
        });
    });

    it('starts with an empty editor and saves a new meal without a source id', async () => {
        expect.hasAssertions();
        const { user } = renderManualInput();
        expect(
            screen.queryByRole('textbox', { name: 'Search previous meals' }),
        ).not.toBeInTheDocument();
        const footer = within(screen.getByRole('contentinfo'));
        expect(
            footer.queryByRole('button', { name: 'Use a previous meal…' }),
        ).not.toBeInTheDocument();
        expect(footer.getByRole('button', { name: 'Cancel' })).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Save new meal' }),
        ).toBeDisabled();
        await user.type(
            screen.getByRole('textbox', { name: /Meal description/ }),
            '  Banana toast  ',
        );
        await user.click(screen.getByRole('button', { name: 'Save new meal' }));
        expect(mutate).toHaveBeenCalledWith({
            templates: [{ content: 'Banana toast', items: [] }],
        });
    });

    it('copies a previous meal and its items, closes the picker and returns focus', async () => {
        expect.hasAssertions();
        const { user } = renderManualInput();
        await openAndSearch(user);
        await user.click(screen.getByRole('button', { name: 'Use this meal' }));
        const description = screen.getByRole('textbox', {
            name: /Meal description/,
        });
        expect(description).toHaveFocus();
        expect(
            screen.queryByRole('textbox', { name: 'Search previous meals' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Save new meal' }),
        ).toBeDisabled();
        await user.type(description, ' with banana');
        await user.click(screen.getByRole('button', { name: 'Save new meal' }));
        const copiedItems = template.items.map(({ id: _id, ...item }) => item);
        expect(mutate).toHaveBeenCalledWith({
            templates: [
                {
                    content: 'Yogurt and oats with banana',
                    items: copiedItems,
                },
            ],
        });
    });

    it('requires confirmation to replace a draft and Undo restores description and items', async () => {
        expect.hasAssertions();
        const { user } = renderManualInput();
        const description = screen.getByRole('textbox', {
            name: /Meal description/,
        });
        await user.type(description, 'My toast');
        await openAndSearch(user);
        await user.click(screen.getByRole('button', { name: 'Use this meal' }));
        await user.click(screen.getByRole('button', { name: 'Keep my draft' }));
        expect(description).toHaveValue('My toast');
        await user.type(
            screen.getByRole('textbox', { name: 'Search previous meals' }),
            'oats',
        );
        await user.click(
            await screen.findByRole('button', { name: 'Use this meal' }),
        );
        await user.click(screen.getByRole('button', { name: 'Replace draft' }));
        expect(
            screen.getByRole('textbox', { name: 'Quantity for Oats' }),
        ).toHaveValue('80 g');
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(description).toHaveValue('My toast');
        expect(
            screen.queryByRole('textbox', { name: 'Quantity for Oats' }),
        ).not.toBeInTheDocument();
    });

    it('leaves the editor available when a search returns no results', async () => {
        expect.hasAssertions();
        mockGetMealPool.mockReturnValue({
            data: [],
            isError: false,
            isFetching: false,
        });
        const { user } = renderManualInput();
        await user.click(
            screen.getByRole('button', { name: 'Use a previous meal…' }),
        );
        await user.type(
            screen.getByRole('textbox', { name: 'Search previous meals' }),
            'missing',
        );
        const noResults = await screen.findByText(/No meals found/);
        expect(noResults).toBeVisible();
        await user.type(
            screen.getByRole('textbox', { name: /Meal description/ }),
            'A new meal',
        );
        expect(
            screen.getByRole('button', { name: 'Save new meal' }),
        ).toBeEnabled();
    });
});
