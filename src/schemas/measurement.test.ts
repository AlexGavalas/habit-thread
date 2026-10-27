import { patchRequestSchema } from './measurement';

describe('measurement writes', () => {
    it.each([undefined, null])(
        'allows an unrecorded body-fat value (%s)',
        (fatPercent) => {
            expect(
                patchRequestSchema.parse({
                    date: '2026-01-12',
                    fatPercent,
                    weight: 79,
                }).fatPercent,
            ).toBe(fatPercent);
        },
    );

    it.each([-1, 101])(
        'rejects invalid body-fat percentages (%s)',
        (fatPercent) => {
            expect(
                patchRequestSchema.safeParse({
                    date: '2026-01-12',
                    fatPercent,
                    weight: 79,
                }).success,
            ).toBe(false);
        },
    );
});
