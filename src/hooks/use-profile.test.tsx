import { createQueryTestContext } from '~test/query';
import { testUser } from '~test/user';
import { renderHook, waitFor } from '~test/utils';
import { getProfileQueryKey } from '~util/query-keys';

import { useProfile } from './use-profile';
import { useUser } from './use-user';

jest.mock('./use-user');

describe('profile query', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('rejects malformed profile JSON rather than trusting its type', async () => {
        expect.hasAssertions();
        jest.mocked(useUser).mockReturnValue({
            isLoading: false,
            user: { email: testUser.email },
        });
        jest.spyOn(global, 'fetch').mockResolvedValue(
            Response.json({ data: { id: 7 } }),
        );
        const { client, Wrapper } = createQueryTestContext();
        const { unmount } = renderHook(useProfile, { wrapper: Wrapper });
        await waitFor(() => {
            expect(
                client.getQueryState(getProfileQueryKey(testUser.email))
                    ?.status,
            ).toBe('error');
        });
        unmount();
        client.clear();
    });

    it('does not reuse another account profile when the identity changes', async () => {
        expect.hasAssertions();
        const second = { ...testUser, email: 'second@example.com', id: 42 };
        jest.mocked(useUser).mockReturnValue({
            isLoading: false,
            user: { email: testUser.email },
        });
        jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce(Response.json({ data: testUser }))
            .mockResolvedValueOnce(Response.json({ data: second }));
        const { client, Wrapper } = createQueryTestContext();
        const { result, rerender, unmount } = renderHook(useProfile, {
            wrapper: Wrapper,
        });
        await waitFor(() => {
            expect(result.current.profile?.id).toBe(testUser.id);
        });
        jest.mocked(useUser).mockReturnValue({
            isLoading: false,
            user: { email: second.email },
        });
        rerender();
        expect(result.current.profile).toBeUndefined();
        await waitFor(() => {
            expect(result.current.profile?.id).toBe(second.id);
        });
        unmount();
        client.clear();
    });
});
