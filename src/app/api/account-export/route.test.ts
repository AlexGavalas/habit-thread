import { createAccountArchive } from '~api/account-export/archive';
import { readAccountExport } from '~api/account-export/data';
import { getCurrentUser } from '~api/session';
import { emptyAccountExport, exportUser } from '~test/account-export';

import { GET } from './route';

jest.mock('~api/session', () => ({ getCurrentUser: jest.fn() }));
jest.mock('~api/account-export/data', () => ({ readAccountExport: jest.fn() }));
jest.mock('~api/account-export/archive', () => ({
    createAccountArchive: jest.fn(),
}));

describe('authenticated account download', () => {
    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(exportUser);
        jest.mocked(readAccountExport).mockResolvedValue({
            ...emptyAccountExport(),
            profile: [
                {
                    createdAt: exportUser.created_at,
                    email: exportUser.email,
                    foodPreferencesNegative: null,
                    foodPreferencesPositive: 'Ελληνικά',
                    fullName: exportUser.full_name,
                    hasCompletedOnboarding: true,
                    height: 170,
                    id: 7,
                    isDiscoverable: false,
                    language: 'gr',
                    targetWeight: null,
                },
            ],
        });
        jest.mocked(createAccountArchive).mockResolvedValue(
            new Uint8Array([80, 75]),
        );
    });

    it('rejects unauthenticated downloads before reading data', async () => {
        expect.hasAssertions();
        jest.mocked(getCurrentUser).mockResolvedValue(null);
        const response = await GET();
        expect(response.status).toBe(401);
        expect(readAccountExport).not.toHaveBeenCalled();
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    });

    it('uses only the session identity and returns a private ZIP with a safe attachment name', async () => {
        expect.hasAssertions();
        const response = await GET();
        expect(readAccountExport).toHaveBeenCalledWith(7);
        expect(response.headers.get('Content-Disposition')).toMatch(
            /^attachment; filename="habitthread-export-v1-\d{4}-\d{2}-\d{2}\.zip"$/u,
        );
        expect(response.headers.get('Content-Type')).toBe('application/zip');
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        expect(new Uint8Array(await response.arrayBuffer())).toStrictEqual(
            new Uint8Array([80, 75]),
        );
    });

    it('fails closed when the account disappears during the export', async () => {
        expect.hasAssertions();
        jest.mocked(readAccountExport).mockResolvedValue(emptyAccountExport());
        const response = await GET();
        expect(response.status).toBe(401);
        expect(createAccountArchive).not.toHaveBeenCalled();
    });

    it('returns no partial data or internal error details on infrastructure failure', async () => {
        expect.hasAssertions();
        const log = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        jest.mocked(readAccountExport).mockRejectedValueOnce(
            new Error('secret database address'),
        );
        const response = await GET();
        expect(response.status).toBe(500);
        await expect(response.text()).resolves.toBe('');
        expect(response.headers.get('Cache-Control')).toBe('private, no-store');
        log.mockRestore();
    });
});
