import { renderWithUser, screen } from '~test/utils';

import type { useGetMealPool } from './hooks/use-get-meal-pool';
import { PreviousMealPicker } from './previous-meal-picker';

const mockGetMealPool = jest.fn<
    Pick<ReturnType<typeof useGetMealPool>, 'data' | 'isError' | 'isFetching'>,
    []
>();
jest.mock('./hooks/use-get-meal-pool', () => ({
    useGetMealPool: (): ReturnType<typeof mockGetMealPool> => mockGetMealPool(),
}));

describe('previous meal picker', () => {
    it('shows a search error rather than an empty-results message', () => {
        mockGetMealPool.mockReturnValue({
            data: [],
            isError: true,
            isFetching: false,
        });
        const handleSelect = jest.fn();
        renderWithUser(<PreviousMealPicker onSelect={handleSelect} />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            "Couldn't load previous meals",
        );
        expect(screen.queryByText(/No meals found/)).not.toBeInTheDocument();
    });
});
