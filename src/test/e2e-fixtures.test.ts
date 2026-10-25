import { createE2eFixtures, isRunAccount } from '../../e2e/support/fixtures';

describe('e2e fixtures', () => {
    it('reproduces the same scenario for the same namespace', () => {
        expect(createE2eFixtures('run-1')).toStrictEqual(
            createE2eFixtures('run-1'),
        );
    });

    it('isolates emails and discoverable names between runs', () => {
        const first = createE2eFixtures('run-1');
        const second = createE2eFixtures('run-2');
        expect(first.client.user.fullName).not.toBe(
            second.client.user.fullName,
        );
        expect(
            new Set(Object.values(first).map(({ user }) => user.email)).size,
        ).toBe(3);
        expect(
            Object.values(first).every(({ user }) =>
                isRunAccount(user.email, 'run-1'),
            ),
        ).toBe(true);
    });

    it('keeps professional access and visual measurements explicit', () => {
        const fixtures = createE2eFixtures('run-1');
        expect({
            client: fixtures.client.user.professional,
            professional: fixtures.professional.user.professional,
        }).toStrictEqual({ client: false, professional: true });
        expect(fixtures.visual.profile.isDiscoverable).toBe(false);
        expect(fixtures.visual.measurements).toStrictEqual([
            { date: '2026-01-05', fatPercent: 21, weight: 82 },
            { date: '2026-01-08', fatPercent: 20, weight: 80 },
            { date: '2026-01-12', fatPercent: 19, weight: 78 },
        ]);
    });

    it.each(['../other', '', 'UPPERCASE', 'x'.repeat(33)])(
        'rejects unsafe namespace %s',
        (runId) => {
            expect(() => createE2eFixtures(runId)).toThrow(/Invalid/);
        },
    );

    it.each([
        'real@example.com',
        'e2e-user-run-10@example.test',
        'e2e-user-run-1@example.test.evil',
    ])('does not claim ownership of %s', (email) => {
        expect(isRunAccount(email, 'run-1')).toBe(false);
    });
});
