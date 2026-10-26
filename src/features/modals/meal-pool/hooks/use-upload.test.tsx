import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactElement, type ReactNode, useMemo } from 'react';

import { MAX_IMPORT_FILE_SIZE } from '~schemas/meal-import';
import { showErrorNotification } from '~util/notification';

import { useUpload } from './use-upload';

jest.mock('react-i18next', () => ({
    useTranslation: jest.fn(() => ({ t: (key: string): string => key })),
}));
jest.mock('~util/notification', () => ({
    showErrorNotification: jest.fn(),
}));

type TestProviderProps = Readonly<{ children: ReactNode }>;

const TestProvider = ({ children }: TestProviderProps): ReactElement => {
    const client = useMemo(
        () =>
            new QueryClient({
                defaultOptions: { mutations: { retry: false } },
            }),
        [],
    );
    return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

describe('meal upload mutation', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('keeps expected failures in the error lifecycle instead of showing a successful preview', async () => {
        expect.hasAssertions();
        const onSuccess = jest.fn();
        jest.spyOn(global, 'fetch').mockResolvedValueOnce(
            Response.json({ code: 'unreadable_document' }, { status: 422 }),
        );
        const { result } = renderHook(() => useUpload({ onSuccess }), {
            wrapper: TestProvider,
        });
        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    file: new File(['pdf'], 'scan.pdf'),
                }),
            ).rejects.toThrow('upload.errors.unreadable_document');
        });
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it.each([{ data: [42] }, { data: [] }, { unexpected: [] }])(
        'rejects malformed successful responses: %j',
        async (body) => {
            expect.hasAssertions();
            const onSuccess = jest.fn();
            jest.spyOn(global, 'fetch').mockResolvedValueOnce(
                Response.json(body),
            );
            const { result } = renderHook(() => useUpload({ onSuccess }), {
                wrapper: TestProvider,
            });
            await act(async () => {
                await expect(
                    result.current.mutateAsync({
                        file: new File(['pdf'], 'plan.pdf'),
                    }),
                ).rejects.toThrow('notification.error.message');
            });
            expect(onSuccess).not.toHaveBeenCalled();
        },
    );

    it('rejects oversized files before sending a request', async () => {
        expect.hasAssertions();
        const fetch = jest.spyOn(global, 'fetch');
        const { result } = renderHook(
            () => useUpload({ onSuccess: jest.fn() }),
            { wrapper: TestProvider },
        );
        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    file: new File(
                        [new Uint8Array(MAX_IMPORT_FILE_SIZE + 1)],
                        'large.pdf',
                    ),
                }),
            ).rejects.toThrow('upload.errors.file_too_large');
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('translates network errors without exposing raw transport details', async () => {
        expect.hasAssertions();
        jest.spyOn(global, 'fetch').mockRejectedValueOnce(
            new TypeError('raw network failure'),
        );
        const { result } = renderHook(
            () => useUpload({ onSuccess: jest.fn() }),
            { wrapper: TestProvider },
        );
        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    file: new File(['pdf'], 'plan.pdf'),
                }),
            ).rejects.toThrow('notification.error.message');
        });
        expect(showErrorNotification).toHaveBeenCalledWith({
            message: 'notification.error.message',
            title: 'notification.error.title',
        });
    });
});
