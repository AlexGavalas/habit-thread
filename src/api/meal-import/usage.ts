import { sql } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { mealImportUsage } from '~db/schema';
import { DAILY_IMPORT_LIMIT } from '~schemas/meal-import';

import { MealImportError } from './errors';

export const consumeMealImportAttempt = async (
    userId: number,
): Promise<void> => {
    // Atomic across serverless instances. Provider failures count too, bounding retries/cost.
    const today = sql`(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`;
    const rows = await getDb()
        .insert(mealImportUsage)
        .values({ attempts: 1, usage_date: today, user_id: userId })
        .onConflictDoUpdate({
            set: {
                attempts: sql`CASE WHEN ${mealImportUsage.usage_date} = ${today} THEN ${mealImportUsage.attempts} + 1 ELSE 1 END`,
                usage_date: today,
            },
            setWhere: sql`${mealImportUsage.usage_date} <> ${today} OR ${mealImportUsage.attempts} < ${DAILY_IMPORT_LIMIT}`,
            target: mealImportUsage.user_id,
        })
        .returning({ userId: mealImportUsage.user_id });
    if (!rows.length) {
        throw new MealImportError('rate_limited');
    }
};
