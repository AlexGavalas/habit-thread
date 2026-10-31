import { z } from 'zod';

import { type EditedUser, type UserProfile } from '~types/user';

type UserSchema = z.ZodType<EditedUser>;

export const userRoleSchema = z.literal('professional');

export const userSummarySchema = z.object({
    full_name: z.string(),
    id: z.number().int().positive(),
});

export const userSummaryResponseSchema = z.object({
    data: z.array(userSummarySchema),
});

export const userSearchResponseSchema = z.object({
    data: z.array(z.object({ label: z.string(), value: z.string() })),
});

export const profileResponseSchema = z.object({
    data: z.object({
        created_at: z.string(),
        email: z.string(),
        food_preferences_negative: z.string().nullable(),
        food_preferences_positive: z.string().nullable(),
        full_name: z.string(),
        has_completed_onboarding: z.boolean().nullable(),
        height: z.number().nullable(),
        id: z.number().int().positive(),
        is_discoverable: z.boolean(),
        language: z.string(),
        roles: z.array(userRoleSchema),
        target_weight: z.number().nullable(),
    }) satisfies z.ZodType<UserProfile>,
});

export const userSchema: UserSchema = z.object({
    created_at: z.string().optional(),
    email: z.string().optional(),
    food_preferences_negative: z.string().nullable().optional(),
    food_preferences_positive: z.string().nullable().optional(),
    full_name: z.string().optional(),
    has_completed_onboarding: z.boolean().nullable().optional(),
    height: z.number().nullable().optional(),
    id: z.number().optional(),
    is_discoverable: z.boolean().optional(),
    language: z.string().optional(),
    target_weight: z.number().nullable().optional(),
});

export const patchRequestSchema = z.object({
    foodPreferencesNegative: z.string().nullable().optional(),
    foodPreferencesPositive: z.string().nullable().optional(),
    hasCompletedOnboarding: z.boolean().nullable().optional(),
    height: z.number().nullable().optional(),
    isDiscoverable: z.boolean().optional(),
    language: z.string().optional(),
    targetWeight: z.number().nullable().optional(),
});
