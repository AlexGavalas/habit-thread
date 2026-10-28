import { act, renderWithUser, screen, within } from '~test/utils';

import { FileUploadTab } from './file-upload';
import type { useCreateMealPool } from './hooks/use-create-meal-pool';
import type { useUpload } from './hooks/use-upload';

const mockCreate = jest.fn();
let mockIsSuccess: boolean;
let completeUpload: Parameters<typeof useUpload>[0]['onSuccess'];

jest.mock('./hooks/use-create-meal-pool', () => ({
    useCreateMealPool: (): Pick<
        ReturnType<typeof useCreateMealPool>,
        'isPending' | 'mutate'
    > => ({ isPending: false, mutate: mockCreate }),
}));
jest.mock('./hooks/use-upload', () => ({
    useUpload: ({
        onSuccess,
    }: Parameters<typeof useUpload>[0]): Pick<
        ReturnType<typeof useUpload>,
        'isPending' | 'isSuccess' | 'mutate' | 'reset'
    > => {
        completeUpload = onSuccess;
        return {
            isPending: false,
            isSuccess: mockIsSuccess,
            mutate: jest.fn(),
            reset: jest.fn(),
        };
    },
}));

describe('meal library file import', () => {
    it('submits edited imported meals using the footer Create button', async () => {
        expect.hasAssertions();
        mockIsSuccess = false;
        const handleDone = jest.fn();
        const { user, rerender } = renderWithUser(
            <FileUploadTab onDone={handleDone} />,
        );
        const footer = within(screen.getByRole('contentinfo'));
        expect(footer.getByRole('button', { name: 'Cancel' })).toBeVisible();
        act(() => {
            completeUpload({ data: ['Porridge'] });
        });
        mockIsSuccess = true;
        rerender(<FileUploadTab onDone={handleDone} />);
        await user.clear(screen.getByRole('textbox'));
        await user.type(screen.getByRole('textbox'), 'Porridge with berries');
        await user.click(footer.getByRole('button', { name: 'Create' }));
        expect(mockCreate).toHaveBeenCalledWith({
            templates: [{ content: 'Porridge with berries', items: [] }],
        });
    });
});
