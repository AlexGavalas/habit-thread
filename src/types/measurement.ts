import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';

import type { measurements } from '~db/schema';
import type { measurementSummarySchema } from '~schemas/measurement';

export type Measurement = InferSelectModel<typeof measurements>;
export type EditedMeasurement = InferInsertModel<typeof measurements>;

export type MeasurementsMap = Record<string, Measurement | EditedMeasurement>;

export type MeasurementSummary = z.infer<typeof measurementSummarySchema>;
