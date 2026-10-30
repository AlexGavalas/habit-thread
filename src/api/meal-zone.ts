import { and, desc, eq, lte } from 'drizzle-orm';
import 'server-only';

import { DEFAULT_MEAL_ZONE_TIMES, MEAL_ZONE_KEYS } from '~constants/meal-zones';
import { getDb } from '~db';
import { mealZoneTimes } from '~db/schema';
import { type MealZoneKey, type MealZoneTimes } from '~types/meal-zone';

const normalizeTime = (time: string): string => time.slice(0, 5);

export const fetchMealZoneTimes = async ({
    db = getDb(),
    effectiveOn,
    userId,
}: {
    db?: ReturnType<typeof getDb>;
    effectiveOn: string;
    userId: number;
}): Promise<MealZoneTimes> => {
    const rows = await db
        .select({
            effectiveFrom: mealZoneTimes.effective_from,
            time: mealZoneTimes.time,
            zoneKey: mealZoneTimes.zone_key,
        })
        .from(mealZoneTimes)
        .where(
            and(
                eq(mealZoneTimes.user_id, userId),
                lte(mealZoneTimes.effective_from, effectiveOn),
            ),
        )
        .orderBy(desc(mealZoneTimes.effective_from))
        .limit(MEAL_ZONE_KEYS.length);

    const effectiveFrom = rows[0]?.effectiveFrom;

    if (!effectiveFrom) {
        return { ...DEFAULT_MEAL_ZONE_TIMES };
    }

    const result = { ...DEFAULT_MEAL_ZONE_TIMES };

    for (const row of rows) {
        if (row.effectiveFrom !== effectiveFrom) {
            break;
        }

        if (MEAL_ZONE_KEYS.some((key) => key === row.zoneKey)) {
            result[row.zoneKey as MealZoneKey] = normalizeTime(row.time);
        }
    }

    return result;
};
