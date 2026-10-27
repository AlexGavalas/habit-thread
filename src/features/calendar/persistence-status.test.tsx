import { useMealMutationState } from '~store/hooks/meal-mutation-state';
import { renderWithUser, screen } from '~test/utils';

import { PersistenceStatus } from './persistence-status';

jest.mock('~store/hooks/meal-mutation-state');

describe('calendar persistence feedback', () => {
    it('clears saving feedback on success without displaying Saved', () => {
        jest.mocked(useMealMutationState).mockReturnValue({
            hasError: false,
            isSaving: true,
            pendingSlots: ['monday'],
        });
        const { rerender } = renderWithUser(<PersistenceStatus />);
        expect(screen.getByRole('status')).toHaveTextContent('Saving…');

        jest.mocked(useMealMutationState).mockReturnValue({
            hasError: false,
            isSaving: false,
            pendingSlots: [],
        });
        rerender(<PersistenceStatus />);
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('still displays failed-save feedback', () => {
        jest.mocked(useMealMutationState).mockReturnValue({
            hasError: true,
            isSaving: false,
            pendingSlots: [],
        });
        renderWithUser(<PersistenceStatus />);
        expect(screen.getByRole('status')).toHaveTextContent(
            'Not saved. Please try again.',
        );
    });
});
