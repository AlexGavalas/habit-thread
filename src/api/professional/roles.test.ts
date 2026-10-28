import { users } from '~db/schema';

import { setProfessionalRole } from './roles';

const mockSet = jest.fn(() => ({
    where: jest.fn().mockResolvedValue(undefined),
}));
const mockInsert = jest.fn(() => ({
    values: jest.fn(() => ({
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    })),
}));
const mockWhere = jest.fn().mockResolvedValue([{ value: 0 }]);
const mockDelete = jest.fn(() => ({
    where: jest.fn().mockResolvedValue(undefined),
}));
const mockTransaction = {
    delete: mockDelete,
    execute: jest.fn().mockResolvedValue(undefined),
    insert: mockInsert,
    select: jest.fn(() => ({
        from: jest.fn(() => ({ where: mockWhere })),
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

describe('professional role visibility', () => {
    beforeEach(() => {
        mockWhere.mockResolvedValue([{ value: 0 }]);
    });

    it('makes the profile visible in the same transaction as enabling the role', async () => {
        expect.hasAssertions();
        await setProfessionalRole({ enabled: true, userId: 7 });
        expect(mockInsert).toHaveBeenCalledTimes(1);
        expect(mockTransaction.update).toHaveBeenCalledWith(users);
        expect(mockSet).toHaveBeenCalledWith({ is_discoverable: true });
    });

    it('leaves visibility unchanged when disabling professional mode', async () => {
        expect.hasAssertions();
        await setProfessionalRole({ enabled: false, userId: 7 });
        expect(mockDelete).toHaveBeenCalledTimes(2);
        expect(mockTransaction.update).not.toHaveBeenCalled();
    });

    it('preserves the role when active clients prevent disabling it', async () => {
        expect.hasAssertions();
        mockWhere.mockResolvedValue([{ value: 1 }]);
        await expect(
            setProfessionalRole({ enabled: false, userId: 7 }),
        ).rejects.toThrow('active_clients');
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockTransaction.update).not.toHaveBeenCalled();
    });
});
