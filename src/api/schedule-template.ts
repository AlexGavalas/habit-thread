import { and, desc, eq, lte } from 'drizzle-orm';
import 'server-only';

import {
    DEFAULT_MEAL_ZONE_LABELS,
    MEAL_ZONE_KEYS,
} from '~constants/meal-zones';
import { getDb } from '~db';
import { scheduleTemplates } from '~db/schema';
import {
    scheduleTemplateSchema,
    type ScheduleTemplate,
} from '~schemas/schedule-template';

import { fetchMealZoneTimes } from './meal-zone';

export const fetchScheduleTemplate = async ({
    userId,
    effectiveOn,
    db = getDb(),
}: {
    userId: number;
    effectiveOn: string;
    db?: ReturnType<typeof getDb>;
}): Promise<ScheduleTemplate> => {
    const [row] = await db
        .select()
        .from(scheduleTemplates)
        .where(
            and(
                eq(scheduleTemplates.user_id, userId),
                lte(scheduleTemplates.effective_from, effectiveOn),
            ),
        )
        .orderBy(desc(scheduleTemplates.effective_from))
        .limit(1);
    if (row) {
        return scheduleTemplateSchema.parse(row.template);
    }
    // Keep historical time versions as the fallback. There is no lossy data
    // rewrite, and existing saved weekly rows become explicit day overrides.
    const times = await fetchMealZoneTimes({ db, effectiveOn, userId });
    return {
        kind: 'daily',
        slots: MEAL_ZONE_KEYS.map((key) => ({
            key,
            label: DEFAULT_MEAL_ZONE_LABELS[key],
            legacyKey: key,
            time: times[key],
        })),
    };
};
