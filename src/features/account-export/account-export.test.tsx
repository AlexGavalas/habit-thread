import { act } from 'react';

import { deferred } from '~test/meal-plan';
import { renderWithUser, screen } from '~test/utils';

import { AccountExport } from './account-export';

describe('account export control', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('disables duplicate downloads while pending and allows retry after a failure', async () => {
        expect.hasAssertions();
        const request = deferred<Response>();
        const fetchMock = jest
            .spyOn(globalThis, 'fetch')
            .mockReturnValueOnce(request.promise)
            .mockRejectedValueOnce(new Error('offline'));
        const { user } = renderWithUser(<AccountExport />);
        await user.click(
            screen.getByRole('button', { name: 'Download my data' }),
        );
        expect(
            screen.getByRole('button', { name: 'Preparing your download…' }),
        ).toBeDisabled();
        await act(async () => {
            request.resolve(new Response(null, { status: 401 }));
            await request.promise;
        });
        await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
            'Your export could not be prepared',
        );
        await user.click(
            screen.getByRole('button', { name: 'Download my data' }),
        );
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledWith('/api/account-export', {
            cache: 'no-store',
        });
    });

    it('starts the archive download and announces completion', async () => {
        expect.hasAssertions();
        const createObjectURL = jest.fn(() => 'blob:export');
        const revokeObjectURL = jest.fn();
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: createObjectURL,
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: revokeObjectURL,
        });
        jest.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('ZIP', {
                headers: { 'Content-Type': 'application/zip' },
            }),
        );
        const click = jest
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);
        const { user } = renderWithUser(<AccountExport />);
        await user.click(
            screen.getByRole('button', { name: 'Download my data' }),
        );
        await expect(screen.findByRole('status')).resolves.toHaveTextContent(
            'Your archive is ready',
        );
        expect(click).toHaveBeenCalledTimes(1);
        expect(createObjectURL).toHaveBeenCalledWith(
            expect.objectContaining({ size: 3, type: 'application/zip' }),
        );
        expect(
            screen.getByRole('button', { name: 'Download my data' }),
        ).toBeEnabled();
    });
});
