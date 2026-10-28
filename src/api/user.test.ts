import { updateProfile } from './user';

const mockLimit = jest.fn<Promise<{ userId: number }[]>, []>();
const mockSet = jest.fn(() => ({
    where: jest.fn().mockResolvedValue(undefined),
}));
const mockTransaction = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => ({
        from: jest.fn(() => ({
            where: jest.fn(() => ({ limit: mockLimit })),
        })),
    })),
    update: jest.fn(() => ({ set: mockSet })),
};

jest.mock('~db', () => ({
    getDb: (): {
        transaction: (
            operation: (tx: typeof mockTransaction) => Promise<void>,
        ) => Promise<void>;
    } => ({
        transaction: async (
            operation: (tx: typeof mockTransaction) => Promise<void>,
        ): Promise<void> => operation(mockTransaction),
    }),
}));

describe('profile visibility', () => {
    beforeEach(() => {
        mockLimit.mockResolvedValue([]);
    });

    it.each([true, false])(
        'allows a personal account to set visibility to %s',
        async (isDiscoverable) => {
            expect.hasAssertions();
            await updateProfile({ isDiscoverable, userId: 7 });
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({ is_discoverable: isDiscoverable }),
            );
        },
    );

    it('keeps a professional visible when a caller tries to hide the profile', async () => {
        expect.hasAssertions();
        mockLimit.mockResolvedValue([{ userId: 7 }]);
        await updateProfile({ isDiscoverable: false, userId: 7 });
        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({ is_discoverable: true }),
        );
    });

    it('does not reset personal visibility when updating unrelated fields', async () => {
        expect.hasAssertions();
        await updateProfile({ height: 180, userId: 7 });
        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({
                height: 180,
                is_discoverable: undefined,
            }),
        );
    });

    it('does not write if the role lookup fails', async () => {
        expect.hasAssertions();
        mockLimit.mockRejectedValueOnce(new Error('Database unavailable'));
        await expect(
            updateProfile({ isDiscoverable: false, userId: 7 }),
        ).rejects.toThrow('Database unavailable');
        expect(mockSet).not.toHaveBeenCalled();
    });
});
