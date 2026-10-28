import { deferred } from '~test/meal-plan';
import { act, renderHook } from '~test/utils';

import { useEditorSubmit } from './use-editor-submit';

describe('editor submission', () => {
    it('blocks duplicate submissions and returns failure without closing the editor', async () => {
        expect.hasAssertions();
        const response = deferred<undefined>();
        const operation = jest.fn().mockReturnValue(response.promise);
        const { result } = renderHook(useEditorSubmit);
        let saving: Promise<boolean> | undefined;
        act(() => {
            saving = result.current.submit(operation);
        });
        await act(async () => {
            await result.current.submit(operation);
        });
        expect(operation).toHaveBeenCalledTimes(1);
        await act(async () => {
            response.reject(new Error('Offline'));
            await saving;
        });
        await expect(saving).resolves.toBe(false);
        expect(result.current).toMatchObject({
            error: expect.any(String),
            isSaving: false,
        });
    });
});
