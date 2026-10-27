'use server';

import { endOfWeek, format, parseISO } from 'date-fns';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { copyMealWeek } from '~api/copy-meal-week';
import { fetchMeals, saveMeals } from '~api/meal';
import { canAccessMealPlan } from '~api/professional';
import { getCurrentUser } from '~api/session';
import { getDb } from '~db';
import { mealSchema, patchRequestSchema } from '~schemas/meal';
import { type Meal } from '~types/meal';

const operationMealSchema = mealSchema.and(
    z.object({
        day: z.iso.date(),
        section_key: z.string().min(1),
    }),
);
const operationSchema = patchRequestSchema.extend({
    deletedIds: z.array(z.uuid()),
    editedMeals: z.array(operationMealSchema.and(z.object({ id: z.uuid() }))),
    newMeals: z.array(operationMealSchema),
    ownerUserId: z.number().int().positive(),
    weekStart: z.iso.date().refine((day) => parseISO(day).getDay() === 1),
});

type MealOperationResult =
    | { ok: true; meals: Meal[] }
    | { ok: false; reason: 'unauthorized' | 'invalid' };

export const saveMealOperation = async (
    input: unknown,
): Promise<MealOperationResult> => {
    const user = await getCurrentUser();
    if (!user) {
        return { ok: false, reason: 'unauthorized' };
    }
    const parsed = operationSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, reason: 'invalid' };
    }
    const { ownerUserId, weekStart, ...changes } = parsed.data;
    if (!(await canAccessMealPlan({ actorUserId: user.id, ownerUserId }))) {
        return { ok: false, reason: 'unauthorized' };
    }
    const endDate = format(
        endOfWeek(parseISO(weekStart), { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    if (
        [...changes.editedMeals, ...changes.newMeals].some(
            (meal) => meal.day < weekStart || meal.day > endDate,
        )
    ) {
        return { ok: false, reason: 'invalid' };
    }
    const { data } = await getDb().transaction(async (db) => {
        // Serialize this week's operations with week-copy. A retried create
        // updates its slot instead of inserting a duplicate after a lost reply.
        await db.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`${ownerUserId}:${weekStart}`}))`,
        );
        const existing = await fetchMeals({
            db,
            endDate,
            startDate: weekStart,
            userId: ownerUserId,
        });
        const bySlot = new Map(
            existing.data.map((meal) => [meal.section_key, meal]),
        );
        const repeatedCreates = changes.newMeals.flatMap((meal) => {
            const saved = bySlot.get(meal.section_key);
            return saved ? [{ ...meal, id: saved.id }] : [];
        });
        await saveMeals({
            ...changes,
            editedMeals: [...changes.editedMeals, ...repeatedCreates],
            newMeals: changes.newMeals.filter(
                (meal) => !bySlot.has(meal.section_key),
            ),
            allowAnnotations: ownerUserId === user.id,
            db,
            userId: ownerUserId,
        });
        return fetchMeals({
            db,
            endDate,
            startDate: weekStart,
            userId: ownerUserId,
        });
    });
    revalidatePath('/home');
    revalidatePath('/meal-plan');
    return { ok: true, meals: data };
};

const copySchema = z.object({
    ownerUserId: z.number().int().positive(),
    sourceWeek: z.iso.date().refine((day) => parseISO(day).getDay() === 1),
});

export const copyMealPlanWeek = async (
    input: unknown,
): Promise<{ ok: boolean }> => {
    const user = await getCurrentUser();
    const parsed = copySchema.safeParse(input);
    if (!user || !parsed.success) {
        return { ok: false };
    }
    const { ownerUserId, sourceWeek } = parsed.data;
    if (!(await canAccessMealPlan({ actorUserId: user.id, ownerUserId }))) {
        return { ok: false };
    }
    await copyMealWeek({
        allowAnnotations: ownerUserId === user.id,
        sourceWeek,
        userId: ownerUserId,
    });
    revalidatePath('/home');
    revalidatePath('/meal-plan');
    return { ok: true };
};
