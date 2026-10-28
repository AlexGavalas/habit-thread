import { useModals } from '@mantine/modals';
import { type ReactElement } from 'react';

import { ContextModalsProvider } from '~features/context-modals';
import { deferred } from '~test/meal-plan';
import { createQueryTestContext } from '~test/query';
import { act, renderWithUser, screen, waitFor } from '~test/utils';

jest.mock('~util/notification');

type TrackingEditorOpenerProps = Readonly<{
    resource: 'activity' | 'measurement';
    onSave: () => Promise<void>;
}>;

const TrackingEditorOpener = ({
    resource,
    onSave,
}: TrackingEditorOpenerProps): ReactElement => {
    const modals = useModals();
    const handleOpen = (): void => {
        modals.openContextModal(resource, {
            innerProps: { onSave },
            title: 'Tracking editor',
        });
    };
    return (
        <button type="button" onClick={handleOpen}>
            Open editor
        </button>
    );
};

describe('tracking editors', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each([
        { label: 'Activity', resource: 'activity', value: 'Walk in the park' },
        { label: 'Weight', resource: 'measurement', value: '75' },
    ] satisfies {
        label: string;
        resource: 'activity' | 'measurement';
        value: string;
    }[])(
        'disables pending $resource submissions and retains input on failure',
        async ({ label, resource, value }) => {
            expect.hasAssertions();
            const response = deferred<Response>();
            jest.spyOn(global, 'fetch').mockReturnValueOnce(response.promise);
            const onSave = jest
                .fn<Promise<void>, []>()
                .mockResolvedValue(undefined);
            const { client, Wrapper } = createQueryTestContext();
            const { user, unmount } = renderWithUser(
                <ContextModalsProvider>
                    <TrackingEditorOpener resource={resource} onSave={onSave} />
                </ContextModalsProvider>,
                { Wrapper },
            );
            await user.click(
                screen.getByRole('button', { name: 'Open editor' }),
            );
            const input = screen.getByLabelText(label);
            await user.type(input, value);
            await user.click(screen.getByRole('button', { name: 'Save' }));
            expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
            await act(async () => {
                response.reject(new Error('Offline'));
                await response.promise.catch(() => undefined);
            });
            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: 'Save' }),
                ).toBeEnabled();
            });
            expect(input).toHaveValue(value);
            expect(onSave).not.toHaveBeenCalled();
            unmount();
            client.clear();
        },
    );

    it.each([
        { label: 'Activity', resource: 'activity', value: 'Walk in the park' },
        { label: 'Weight', resource: 'measurement', value: '75' },
    ] satisfies {
        label: string;
        resource: 'activity' | 'measurement';
        value: string;
    }[])(
        'retains $resource input on failure and closes only after a successful retry',
        async ({ label, resource, value }) => {
            expect.hasAssertions();
            const response = deferred<Response>();
            const fetchMock = jest
                .spyOn(global, 'fetch')
                .mockReturnValueOnce(response.promise)
                .mockResolvedValueOnce(new Response(null, { status: 200 }));
            const onSave = jest
                .fn<Promise<void>, []>()
                .mockResolvedValue(undefined);
            const { client, Wrapper } = createQueryTestContext();
            const { user, unmount } = renderWithUser(
                <ContextModalsProvider>
                    <TrackingEditorOpener resource={resource} onSave={onSave} />
                </ContextModalsProvider>,
                { Wrapper },
            );
            await user.click(
                screen.getByRole('button', { name: 'Open editor' }),
            );
            const input = screen.getByLabelText(label);
            await user.type(input, value);
            await user.click(screen.getByRole('button', { name: 'Save' }));
            await act(async () => {
                response.reject(new Error('Offline'));
                await response.promise.catch(() => undefined);
            });
            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: 'Save' }),
                ).toBeEnabled();
            });
            expect(input).toHaveValue(value);
            await user.click(screen.getByRole('button', { name: 'Save' }));
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock.mock.calls[1]).toStrictEqual(
                fetchMock.mock.calls[0],
            );
            expect(onSave).toHaveBeenCalledTimes(1);
            unmount();
            client.clear();
        },
    );
});
