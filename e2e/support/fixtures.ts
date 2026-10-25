import { z } from 'zod';

import { registrationSchema } from '../../src/schemas/auth';
import { type patchRequestSchema as measurementSchema } from '../../src/schemas/measurement';
import { type patchRequestSchema as profileSchema } from '../../src/schemas/user';

export const runIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/);
export type E2eUser = z.infer<typeof registrationSchema>;
export type E2eFixture = Readonly<{
    user: E2eUser;
    profile: z.infer<typeof profileSchema>;
    measurements: z.infer<typeof measurementSchema>[];
}>;
type FixtureName = 'client' | 'professional' | 'visual';

export const createE2eFixtures = (
    runId: string,
): Record<FixtureName, E2eFixture> => {
    const namespace = runIdSchema.parse(runId);
    const profile = {
        hasCompletedOnboarding: true,
        height: 180,
        isDiscoverable: false,
        language: 'en',
        targetWeight: 75,
    };

    return {
        client: {
            measurements: [],
            profile: { ...profile, isDiscoverable: true },
            user: registrationSchema.parse({
                email: `e2e-user-${namespace}@example.test`,
                fullName: `E2E ${namespace} User`,
                password: 'e2e-password',
            }),
        },
        professional: {
            measurements: [],
            profile: { ...profile },
            user: registrationSchema.parse({
                email: `professional-${namespace}@example.test`,
                fullName: 'Professional E2E User',
                password: 'professional-e2e-password',
                professional: true,
            }),
        },
        visual: {
            measurements: [
                { date: '2026-01-05', fatPercent: 21, weight: 82 },
                { date: '2026-01-08', fatPercent: 20, weight: 80 },
                { date: '2026-01-12', fatPercent: 19, weight: 78 },
            ],
            profile: { ...profile },
            user: registrationSchema.parse({
                email: `visual-${namespace}@example.test`,
                fullName: 'Visual E2E User',
                password: 'visual-e2e-password',
            }),
        },
    };
};

export const isRunAccount = (email: string, runId: string): boolean =>
    z.email().safeParse(email).success &&
    email.endsWith(`-${runIdSchema.parse(runId)}@example.test`);
