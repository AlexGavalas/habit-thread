import { createQueryTestContext } from '~test/query';
import { act, renderHook, waitFor } from '~test/utils';
import { showErrorNotification } from '~util/notification';

import { useCreateMealPool } from './use-create-meal-pool';

jest.mock('~util/notification');

describe('meal template writes', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('exposes failed HTTP writes as errors and completes only after a successful retry', async () => {
        expect.hasAssertions();
        const fetchMock = jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(new Response(null, { status: 500 }))
            .mockResolvedValueOnce(new Response(null, { status: 200 }));
        const onSuccess = jest.fn();
        const { client, Wrapper } = createQueryTestContext();
        const { result, unmount } = renderHook(
            () => useCreateMealPool({ onSuccess }),
            { wrapper: Wrapper },
        );
        const input = { templates: [{ content: 'Porridge', items: [] }] };
        act(() => {
            result.current.mutate(input);
        });
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(onSuccess).not.toHaveBeenCalled();
        expect(showErrorNotification).toHaveBeenCalled();
        act(() => {
            result.current.mutate(input);
        });
        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        unmount();
        client.clear();
    });
});
