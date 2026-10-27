import { endOfWeek, format, parseISO } from 'date-fns';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import 'server-only';

import {
    DEFAULT_MEAL_ZONE_LABELS,
    MEAL_ZONE_KEYS,
} from '~constants/meal-zones';
import { getDb } from '~db';
import { meals, weeklyMealZones } from '~db/schema';
import { type WeeklyMealZone } from '~types/meal-zone';
import { getDaysOfWeek } from '~util/date';

import { lockMealPlan } from './meal-plan-lock';
import { fetchMealZoneTimes } from './meal-zone';

const normalizeTime = (value: string): string => value.slice(0, 5);

export const fetchWeeklyMealZones = async ({
    userId,
    weekStart,
    db = getDb(),
}: {
    db?: ReturnType<typeof getDb>;
    userId: number;
    weekStart: string;
}): Promise<WeeklyMealZone[]> => {
    const rows = await db
        .select()
        .from(weeklyMealZones)
        .where(
            and(
                eq(weeklyMealZones.user_id, userId),
                eq(weeklyMealZones.week_start, weekStart),
            ),
        )
        .orderBy(asc(weeklyMealZones.day), asc(weeklyMealZones.position));

    if (rows.length) {
        return rows.map((row) => ({
            day: row.day,
            label: row.label,
            ...(row.legacy_key && {
                legacyKey: row.legacy_key as WeeklyMealZone['legacyKey'],
            }),
            position: row.position,
            time: normalizeTime(row.time),
            weekStart: row.week_start,
            zoneKey: row.zone_key,
        }));
    }

    const times = await fetchMealZoneTimes({
        db,
        effectiveOn: weekStart,
        userId,
    });

    return getDaysOfWeek(parseISO(weekStart)).flatMap(
        ({ label: dayLabel, timestamp }) => {
            const day = format(timestamp, 'yyyy-MM-dd');
            return MEAL_ZONE_KEYS.map((legacyKey, position) => ({
                day,
                label: DEFAULT_MEAL_ZONE_LABELS[legacyKey],
                legacyKey,
                position,
                time: times[legacyKey],
                weekStart,
                zoneKey: `${legacyKey}_${dayLabel}`,
            }));
        },
    );
};

export const saveWeeklyMealZones = async ({
    userId,
    weekStart,
    zones,
    db = getDb(),
}: {
    db?: ReturnType<typeof getDb>;
    userId: number;
    weekStart: string;
    zones: WeeklyMealZone[];
}): Promise<void> => {
    const endDate = format(
        endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    const retainedKeys = zones.map(({ zoneKey }) => zoneKey);

    await db.transaction(async (tx) => {
        await lockMealPlan(tx, userId);
        const weekMeals = await tx
            .select({ id: meals.id, sectionKey: meals.section_key })
            .from(meals)
            .where(
                and(
                    eq(meals.user_id, userId),
                    gte(meals.day, weekStart),
                    lte(meals.day, endDate),
                ),
            );
        const removedMealIds = weekMeals
            .filter(({ sectionKey }) => !retainedKeys.includes(sectionKey))
            .map(({ id }) => id);

        if (removedMealIds.length) {
            await tx.delete(meals).where(inArray(meals.id, removedMealIds));
        }

        await tx
            .delete(weeklyMealZones)
            .where(
                and(
                    eq(weeklyMealZones.user_id, userId),
                    eq(weeklyMealZones.week_start, weekStart),
                ),
            );

        await tx.insert(weeklyMealZones).values(
            zones.map((zone) => ({
                day: zone.day,
                label: zone.label,
                legacy_key: zone.legacyKey ?? null,
                position: zone.position,
                time: zone.time,
                user_id: userId,
                week_start: weekStart,
                zone_key: zone.zoneKey,
            })),
        );
    });
};
