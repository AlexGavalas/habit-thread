import { type APIRequestContext, type Page, expect } from '@playwright/test';
import { z } from 'zod';

import { measurementSchema } from '../../src/schemas/measurement';
import { authenticateE2eUser } from './auth';
import { type E2eFixture } from './fixtures';

const profileResponseSchema = z.object({
    data: z.object({
        email: z.email(),
        full_name: z.string(),
        has_completed_onboarding: z.boolean(),
        height: z.number().nullable(),
        id: z.number(),
        is_discoverable: z.boolean(),
        language: z.string(),
        roles: z.array(z.string()),
        target_weight: z.number().nullable(),
    }),
});

export const readFixtureProfile = async (
    request: APIRequestContext,
): Promise<z.infer<typeof profileResponseSchema>['data']> => {
    const response = await request.get('/api/v1/user');
    await expect(response).toBeOK();
    return profileResponseSchema.parse(await response.json()).data;
};

export const provisionFixture = async (
    page: Page,
    fixture: E2eFixture,
): Promise<void> => {
    await authenticateE2eUser(page, fixture.user);
    const response = await page.request.patch('/api/v1/user', {
        data: fixture.profile,
    });
    await expect(response).toBeOK();
    for (const measurement of fixture.measurements) {
        const saved = await page.request.post('/api/v1/measurement', {
            data: measurement,
        });
        await expect(saved).toBeOK();
    }

    const profile = await readFixtureProfile(page.request);
    expect(profile).toMatchObject({
        email: fixture.user.email,
        full_name: fixture.user.fullName,
        has_completed_onboarding: fixture.profile.hasCompletedOnboarding,
        height: fixture.profile.height,
        is_discoverable:
            fixture.user.professional || fixture.profile.isDiscoverable,
        language: fixture.profile.language,
        roles: fixture.user.professional ? ['professional'] : [],
        target_weight: fixture.profile.targetWeight,
    });
    const measurements = await page.request.get(
        '/api/v1/measurement?start=0&end=99',
    );
    await expect(measurements).toBeOK();
    const actual = z
        .object({ data: z.array(measurementSchema) })
        .parse(await measurements.json())
        .data.map(({ date, fat_percentage, weight }) => ({
            date,
            fatPercent: fat_percentage,
            weight,
        }))
        .toSorted((a, b) => a.date.localeCompare(b.date));
    expect(actual).toEqual(fixture.measurements);

    await page.goto(fixture.user.professional ? '/professional' : '/home');
    await expect(
        page.getByRole('heading', {
            name: fixture.user.professional
                ? 'Professional dashboard'
                : 'Today’s meals',
        }),
    ).toBeVisible();
};
