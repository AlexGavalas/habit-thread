import { z } from 'zod';

import { type EditedMeasurement, type Measurement } from '~types/measurement';

type MeasurementSchema = z.ZodType<EditedMeasurement>;

export const measurementSchema: MeasurementSchema = z.object({
    date: z.string(),
    fat_percentage: z.number().nullable().optional(),
    id: z.string().optional(),
    user_id: z.number(),
    weight: z.number(),
});

export const patchRequestSchema = z.object({
    date: z.iso.date(),
    fatPercent: z.number().min(0).max(100).nullable().optional(),
    weight: z.number().positive(),
});

export const measurementSummarySchema = z.object({
    currentFat: z.number(),
    currentWeight: z.number(),
    fatTimeline: z
        .array(z.object({ x: z.string(), y: z.number().nullable() }))
        .nullable(),
    weightTimeline: z
        .array(z.object({ x: z.string(), y: z.number() }))
        .nullable(),
});

export const measurementSummaryResponseSchema = z.object({
    data: measurementSummarySchema,
});

export const measurementsResponseSchema = z.object({
    data: z.array(
        z.object({
            date: z.string(),
            fat_percentage: z.number().nullable(),
            id: z.string(),
            user_id: z.number(),
            weight: z.number(),
        }) satisfies z.ZodType<Measurement>,
    ),
});
