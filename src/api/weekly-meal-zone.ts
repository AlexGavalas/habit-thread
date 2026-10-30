import { endOfWeek, format, parseISO } from 'date-fns';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { meals, weeklyMealZones } from '~db/schema';
import { weeklyMealZoneSchema } from '~schemas/weekly-meal-zone';
import { type WeeklyMealZone } from '~types/meal-zone';
import { resolveWeekSchedule } from '~util/schedule';
import { ScheduleConflictError } from '~util/schedule-result';

import { lockMealPlan } from './meal-plan-lock';
import { fetchScheduleTemplate } from './schedule-template';

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

    const overrides = rows.map((row) =>
        weeklyMealZoneSchema.parse({
            day: row.day,
            label: row.label,
            ...(row.legacy_key && {
                legacyKey: row.legacy_key,
            }),
            position: row.position,
            time: normalizeTime(row.time),
            weekStart: row.week_start,
            zoneKey: row.zone_key,
        }),
    );

    const template = await fetchScheduleTemplate({
        db,
        effectiveOn: weekStart,
        userId,
    });

    return resolveWeekSchedule(parseISO(weekStart), template, overrides);
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
        const removedMeals = weekMeals.filter(
            ({ sectionKey }) => !retainedKeys.includes(sectionKey),
        );
        if (removedMeals.length) {
            throw new ScheduleConflictError([weekStart]);
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

export const saveDayMealZones = async ({
    userId,
    weekStart,
    day,
    zones,
}: {
    userId: number;
    weekStart: string;
    day: string;
    // null removes the override rather than saving a snapshot of the default.
    zones: WeeklyMealZone[] | null;
}): Promise<void> => {
    await getDb().transaction(async (db) => {
        await lockMealPlan(db, userId);
        await db
            .delete(weeklyMealZones)
            .where(
                and(
                    eq(weeklyMealZones.user_id, userId),
                    eq(weeklyMealZones.day, day),
                ),
            );
        if (zones) {
            await db.insert(weeklyMealZones).values(
                zones.map((zone) => ({
                    day,
                    label: zone.label,
                    legacy_key: zone.legacyKey ?? null,
                    position: zone.position,
                    time: zone.time,
                    user_id: userId,
                    week_start: weekStart,
                    zone_key: zone.zoneKey,
                })),
            );
        }
        const effective = await fetchWeeklyMealZones({ db, userId, weekStart });
        const dayMeals = await db
            .select({ sectionKey: meals.section_key })
            .from(meals)
            .where(and(eq(meals.user_id, userId), eq(meals.day, day)));
        if (
            dayMeals.some(
                (meal) =>
                    !effective.some(
                        (zone) =>
                            zone.day === day &&
                            zone.zoneKey === meal.sectionKey,
                    ),
            )
        ) {
            throw new ScheduleConflictError([day]);
        }
    });
};
