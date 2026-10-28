import { renderWithUser, screen, within } from '~test/utils';

import type { useCreateMealPool } from './hooks/use-create-meal-pool';
import type { useGetMealPool } from './hooks/use-get-meal-pool';
import { ManualInputTab } from './manual-input';

const mockMutate = jest.fn();
jest.mock('./hooks/use-create-meal-pool', () => ({
    useCreateMealPool: (): Pick<
        ReturnType<typeof useCreateMealPool>,
        'error' | 'isPending' | 'mutate' | 'reset'
    > => ({
        error: null,
        isPending: false,
        mutate: mockMutate,
        reset: jest.fn(),
    }),
}));
jest.mock('./hooks/use-get-meal-pool', () => ({
    useGetMealPool: (): Pick<
        ReturnType<typeof useGetMealPool>,
        'data' | 'isError' | 'isFetching'
    > => ({ data: [], isError: false, isFetching: false }),
}));

const renderManualInput = (): ReturnType<typeof renderWithUser> => {
    const handleDone = jest.fn();
    return renderWithUser(<ManualInputTab onDone={handleDone} />);
};

describe('new manual meal entry', () => {
    it('keeps the previous meal picker out of the editor and footer initially', () => {
        renderManualInput();
        expect(
            screen.queryByRole('textbox', { name: 'Search previous meals' }),
        ).not.toBeInTheDocument();
        const footer = within(screen.getByRole('contentinfo'));
        expect(
            footer.queryByRole('button', { name: 'Use a previous meal…' }),
        ).not.toBeInTheDocument();
        expect(footer.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    it('requires a description and saves a new meal without a source id', async () => {
        expect.hasAssertions();
        const { user } = renderManualInput();
        expect(
            screen.getByRole('button', { name: 'Save new meal' }),
        ).toBeDisabled();
        await user.type(
            screen.getByRole('textbox', { name: /Meal description/ }),
            '  Banana toast  ',
        );
        await user.click(screen.getByRole('button', { name: 'Save new meal' }));
        expect(mockMutate).toHaveBeenCalledWith({
            templates: [{ content: 'Banana toast', items: [] }],
        });
    });
});
