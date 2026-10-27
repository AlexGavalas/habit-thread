import { endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import { and, eq, inArray } from 'drizzle-orm';
import 'server-only';

import { getDb } from '~db';
import { meals } from '~db/schema';
import { mealPlanChangesSchema } from '~schemas/meal-plan';
import { type ActionResult } from '~types/action-result';
import { type Meal } from '~types/meal';

import { fetchMeals, saveMeals } from './meal';
import { lockMealPlan } from './meal-plan-lock';
import { canAccessMealPlan } from './professional';
import { fetchWeeklyMealZones } from './weekly-meal-zone';

export const saveMealPlanChanges = async (
    actorUserId: number,
    input: unknown,
): Promise<ActionResult<{ meals: Meal[] }>> => {
    const parsed = mealPlanChangesSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }
    const { ownerUserId = actorUserId, weekStart, ...changes } = parsed.data;
    if (!(await canAccessMealPlan({ actorUserId, ownerUserId }))) {
        return { ok: false, reason: 'forbidden' };
    }
    const endDate = weekStart
        ? format(
              endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
              'yyyy-MM-dd',
          )
        : undefined;
    if (
        weekStart &&
        endDate &&
        [...changes.editedMeals, ...changes.newMeals].some(
            (meal) => meal.day < weekStart || meal.day > endDate,
        )
    ) {
        return { ok: false, reason: 'invalid' };
    }
    return getDb().transaction(async (db) => {
        await lockMealPlan(db, ownerUserId);
        const ids = [
            ...new Set([
                ...changes.deletedIds,
                ...changes.editedMeals.map(({ id }) => id),
            ]),
        ];
        const existing = ids.length
            ? await db
                  .select()
                  .from(meals)
                  .where(
                      and(
                          eq(meals.user_id, ownerUserId),
                          inArray(meals.id, ids),
                      ),
                  )
            : [];
        // Missing deletes are idempotent. Missing/foreign edits must not be
        // reported as saved, and week-scoped writes cannot reach other weeks.
        if (
            changes.editedMeals.some(
                ({ id }) => !existing.some((meal) => meal.id === id),
            ) ||
            (weekStart &&
                endDate &&
                existing.some(
                    (meal) => meal.day < weekStart || meal.day > endDate,
                ))
        ) {
            return { ok: false, reason: 'invalid' };
        }
        const writtenMeals = [...changes.editedMeals, ...changes.newMeals];
        const weeks = [
            ...new Set(
                writtenMeals.map(({ day }) =>
                    format(
                        startOfWeek(parseISO(day), { weekStartsOn: 1 }),
                        'yyyy-MM-dd',
                    ),
                ),
            ),
        ];
        for (const week of weeks) {
            const zones = await fetchWeeklyMealZones({
                db,
                userId: ownerUserId,
                weekStart: week,
            });
            if (
                writtenMeals.some(
                    (meal) =>
                        format(
                            startOfWeek(parseISO(meal.day), {
                                weekStartsOn: 1,
                            }),
                            'yyyy-MM-dd',
                        ) === week &&
                        !zones.some(
                            (zone) =>
                                zone.day === meal.day &&
                                zone.zoneKey === meal.section_key,
                        ),
                )
            ) {
                return { ok: false, reason: 'invalid' };
            }
        }
        const newDays = [...new Set(changes.newMeals.map(({ day }) => day))];
        const occupied = newDays.length
            ? await db
                  .select()
                  .from(meals)
                  .where(
                      and(
                          eq(meals.user_id, ownerUserId),
                          inArray(meals.day, newDays),
                      ),
                  )
            : [];
        const retained = occupied.filter(
            (meal) => !changes.deletedIds.includes(meal.id),
        );
        const repeatedCreates = changes.newMeals.flatMap((meal) => {
            const saved = retained.find(
                (entry) =>
                    entry.day === meal.day &&
                    entry.section_key === meal.section_key,
            );
            return saved ? [{ ...meal, id: saved.id }] : [];
        });
        await saveMeals({
            allowAnnotations: ownerUserId === actorUserId,
            db,
            deletedIds: changes.deletedIds,
            editedMeals: [...changes.editedMeals, ...repeatedCreates],
            newMeals: changes.newMeals.filter(
                (meal) =>
                    !retained.some(
                        (entry) =>
                            entry.day === meal.day &&
                            entry.section_key === meal.section_key,
                    ),
            ),
            userId: ownerUserId,
        });
        const canonical =
            weekStart && endDate
                ? await fetchMeals({
                      db,
                      endDate,
                      startDate: weekStart,
                      userId: ownerUserId,
                  })
                : { data: [] };
        return { meals: canonical.data, ok: true };
    });
};
