import { format, parseISO, startOfWeek } from 'date-fns';
import { and, eq, gte } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { meals, scheduleTemplates } from '~db/schema';
import { type ScheduleTemplate } from '~schemas/schedule-template';
import { ScheduleConflictError } from '~util/schedule-result';

import { lockMealPlan } from './meal-plan-lock';
import { fetchWeeklyMealZones } from './weekly-meal-zone';

export const saveScheduleTemplate = async ({
    userId,
    effectiveFrom,
    template,
}: {
    userId: number;
    effectiveFrom: string;
    template: ScheduleTemplate;
}): Promise<void> => {
    await getDb().transaction(async (db) => {
        await lockMealPlan(db, userId);
        await db
            .insert(scheduleTemplates)
            .values({
                effective_from: effectiveFrom,
                template,
                user_id: userId,
            })
            .onConflictDoUpdate({
                set: { template },
                target: [
                    scheduleTemplates.user_id,
                    scheduleTemplates.effective_from,
                ],
            });
        const futureMeals = await db
            .select({
                day: meals.day,
                sectionKey: meals.section_key,
            })
            .from(meals)
            .where(
                and(eq(meals.user_id, userId), gte(meals.day, effectiveFrom)),
            );
        const byWeek = Map.groupBy(futureMeals, ({ day }) =>
            format(
                startOfWeek(parseISO(day), { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            ),
        );
        const conflicts = new Set<string>();
        for (const [weekStart, weekMeals] of byWeek) {
            const zones = await fetchWeeklyMealZones({ db, userId, weekStart });
            for (const meal of weekMeals) {
                if (
                    !zones.some(
                        (zone) =>
                            zone.day === meal.day &&
                            zone.zoneKey === meal.sectionKey,
                    )
                ) {
                    conflicts.add(meal.day);
                }
            }
        }
        if (conflicts.size) {
            // Throw inside the transaction: the candidate version is rolled back.
            throw new ScheduleConflictError([...conflicts].sort());
        }
    });
};
