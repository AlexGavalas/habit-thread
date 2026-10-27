import { revalidatePath } from 'next/cache';

import { setProfessionalRole as updateProfessionalRole } from '~api/professional';
import { getCurrentUser } from '~api/session';
import { testUser } from '~test/user';

import { setProfessionalRole } from './professional-actions';

jest.mock('next/cache');
jest.mock('~api/professional');
jest.mock('~api/session', () => ({
    getCurrentUser: jest.fn(),
}));

describe('professional server actions', () => {
    beforeEach(() => {
        jest.mocked(getCurrentUser).mockResolvedValue(testUser);
    });

    it('updates the professional role for the authenticated account', async () => {
        expect.hasAssertions();

        await expect(
            setProfessionalRole({ enabled: true }),
        ).resolves.toStrictEqual({ ok: true });

        expect(updateProfessionalRole).toHaveBeenCalledWith({
            enabled: true,
            userId: 7,
        });
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('propagates infrastructure failures instead of returning an ordinary rejection', async () => {
        expect.hasAssertions();
        jest.mocked(updateProfessionalRole).mockRejectedValueOnce(
            new Error('Database unavailable'),
        );
        await expect(setProfessionalRole({ enabled: true })).rejects.toThrow(
            'Database unavailable',
        );
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
