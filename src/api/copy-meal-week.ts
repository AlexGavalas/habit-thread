import { addWeeks, endOfWeek, format, parseISO } from 'date-fns';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { meals } from '~db/schema';

import { createMeals, fetchMeals } from './meal';
import { fetchWeeklyMealZones, saveWeeklyMealZones } from './weekly-meal-zone';

export const copyMealWeek = async ({
    sourceWeek,
    userId,
    allowAnnotations,
}: {
    sourceWeek: string;
    userId: number;
    allowAnnotations: boolean;
}): Promise<void> => {
    const shift = (day: string): string =>
        format(addWeeks(parseISO(day), 1), 'yyyy-MM-dd');
    const weekStart = shift(sourceWeek);
    const endDate = format(
        endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    await getDb().transaction(async (db) => {
        // Serialize repeat copies for this owner/destination; replacing the week
        // is idempotent in content and must never leave duplicate meals.
        await db.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${weekStart}`}))`,
        );
        const zones = await fetchWeeklyMealZones({
            db,
            userId,
            weekStart: sourceWeek,
        });
        const source = await fetchMeals({
            db,
            endDate: format(
                endOfWeek(parseISO(sourceWeek), { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            ),
            startDate: sourceWeek,
            userId,
        });
        const keyMap = new Map<string, string>();
        const nextZones = zones.map((zone) => {
            const zoneKey = crypto.randomUUID();
            keyMap.set(zone.zoneKey, zoneKey);
            return {
                ...zone,
                day: shift(zone.day),
                weekStart,
                zoneKey,
            };
        });
        await db
            .delete(meals)
            .where(
                and(
                    eq(meals.user_id, userId),
                    gte(meals.day, weekStart),
                    lte(meals.day, endDate),
                ),
            );
        await saveWeeklyMealZones({ db, userId, weekStart, zones: nextZones });
        await createMeals({
            allowAnnotations,
            db,
            newMeals: source.data.flatMap(({ id: _id, ...meal }) => {
                const sectionKey = keyMap.get(meal.section_key);
                return sectionKey
                    ? [
                          {
                              ...meal,
                              day: shift(meal.day),
                              section_key: sectionKey,
                          },
                      ]
                    : [];
            }),
            userId,
        });
    });
};
