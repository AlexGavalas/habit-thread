import { z } from 'zod';

import { type EditedActivity } from '~types/activity';

type ActivitySchema = z.ZodType<EditedActivity>;

export const activitySchema: ActivitySchema = z.object({
    activity: z.string(),
    date: z.string(),
    id: z.string().optional(),
    user_id: z.number(),
});

export const patchRequestSchema = z.object({
    activity: z.string().trim().min(1),
    date: z.iso.date(),
});

export const activitiesResponseSchema = z.object({
    data: z.array(activitySchema),
});
