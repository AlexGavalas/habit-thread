import { createQueryTestContext } from '~test/query';
import { renderWithUser, screen, waitFor, within } from '~test/utils';
import { showErrorNotification } from '~util/notification';

import { FileUploadTab } from './file-upload';

jest.mock('~util/notification');

const renderImport = async (): Promise<
    ReturnType<typeof renderWithUser> & {
        onDone: jest.Mock;
        cleanup: () => void;
    }
> => {
    const { client, Wrapper } = createQueryTestContext();
    const onDone = jest.fn();
    const view = renderWithUser(<FileUploadTab onDone={onDone} />, {
        Wrapper,
    });
    // FileButton delegates selection to a hidden native input with no label.
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
        throw new Error('Expected the file picker input');
    }
    expect(input).toHaveAttribute('accept', '.docx,.pdf');
    await view.user.upload(
        input,
        new File(['%PDF-1.4'], 'plan.pdf', { type: 'application/pdf' }),
    );
    return {
        ...view,
        cleanup: () => {
            view.unmount();
            client.clear();
        },
        onDone,
    };
};

describe('meal library file import', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('undoes removal without losing edits or saving the preview', async () => {
        expect.hasAssertions();
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(
                Response.json({ data: ['Eggs', 'Γιαούρτι 200g', 'Rice 150g'] }),
            );
        const { user, cleanup } = await renderImport();
        await user.click(screen.getByRole('button', { name: 'Yes' }));
        const first = await screen.findByRole('textbox', { name: 'Meal 1' });
        await user.clear(first);
        await user.type(first, 'Eggs with toast');
        await user.click(screen.getByRole('button', { name: 'Remove meal 2' }));
        expect(screen.getByRole('textbox', { name: 'Meal 2' })).toHaveValue(
            'Rice 150g',
        );
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getByRole('textbox', { name: 'Meal 2' })).toHaveValue(
            'Γιαούρτι 200g',
        );
        await user.click(screen.getByRole('button', { name: 'Remove meal 2' }));
        expect(first).toHaveValue('Eggs with toast');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it('submits edited and retained meals only after explicitly creating the preview', async () => {
        expect.hasAssertions();
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(
                Response.json({ data: ['Eggs', 'Γιαούρτι 200g', 'Rice 150g'] }),
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        const { user, onDone, cleanup } = await renderImport();
        await user.click(screen.getByRole('button', { name: 'Yes' }));
        const first = await screen.findByRole('textbox', { name: 'Meal 1' });
        await user.clear(first);
        await user.type(first, 'Eggs with toast');
        await user.click(screen.getByRole('button', { name: 'Remove meal 2' }));
        expect(onDone).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const footer = within(screen.getByRole('contentinfo'));
        await user.click(footer.getByRole('button', { name: 'Create' }));
        await waitFor(() => {
            expect(onDone).toHaveBeenCalledTimes(1);
        });
        expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/pool/meal', {
            body: JSON.stringify({
                templates: [
                    { content: 'Eggs with toast', items: [] },
                    { content: 'Rice 150g', items: [] },
                ],
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        });
        cleanup();
    });

    it('retains edited meals after a failed save and completes only after a successful retry', async () => {
        expect.hasAssertions();
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(Response.json({ data: ['Eggs'] }))
            .mockResolvedValueOnce(new Response(null, { status: 500 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        const { user, onDone, cleanup } = await renderImport();
        await user.click(screen.getByRole('button', { name: 'Yes' }));
        const meal = await screen.findByRole('textbox', { name: 'Meal 1' });
        await user.clear(meal);
        await user.type(meal, 'Eggs with toast');
        const create = screen.getByRole('button', { name: 'Create' });
        await user.click(create);
        await waitFor(() => {
            expect(showErrorNotification).toHaveBeenCalledWith({
                message: 'We could not save your changes. Please try again.',
                position: 'top-right',
                title: 'Error',
            });
        });
        expect(onDone).not.toHaveBeenCalled();
        expect(meal).toHaveValue('Eggs with toast');
        expect(create).toBeEnabled();
        await user.click(create);
        await waitFor(() => {
            expect(onDone).toHaveBeenCalledTimes(1);
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[2]).toStrictEqual(fetchMock.mock.calls[1]);
        cleanup();
    });

    it('translates extraction errors, keeps the file retryable and does not display a successful preview', async () => {
        expect.hasAssertions();
        jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce(
                Response.json({ code: 'unreadable_document' }, { status: 422 }),
            )
            .mockResolvedValueOnce(Response.json({ data: ['Eggs'] }));
        const { user, onDone, cleanup } = await renderImport();
        const upload = screen.getByRole('button', { name: 'Yes' });
        await user.click(upload);
        await waitFor(() => {
            expect(showErrorNotification).toHaveBeenCalledWith({
                message:
                    "We couldn't read this document. Scanned, image-only and password-protected files are not supported. Upload a text-based PDF or DOCX.",
                position: 'top-right',
                title: 'Error',
            });
        });
        expect(upload).toBeEnabled();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(onDone).not.toHaveBeenCalled();
        await user.click(upload);
        const meal = await screen.findByRole('textbox', { name: 'Meal 1' });
        expect(meal).toHaveValue('Eggs');
        expect(onDone).not.toHaveBeenCalled();
        cleanup();
    });
});
