import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import {
    endOfWeek,
    format,
    isMatch,
    isValid,
    parseISO,
    startOfWeek,
} from 'date-fns';
import type { ReactElement } from 'react';
import { Suspense } from 'react';

import { fetchActivities } from '~api/activity';
import { fetchMeals } from '~api/meal';
import { fetchMealZoneTimes } from '~api/meal-zone';
import { getRequestDate, requireUser } from '~api/session';
import { fetchWeeklyMealZones } from '~api/weekly-meal-zone';
import { MealPlanPageSkeleton } from '~components/loading-skeleton';
import { MEAL_ZONE_KEYS } from '~constants/meal-zones';
import { MealPlan } from '~features/screens/meal-plan';
import { type MealZoneKey } from '~types/meal-zone';
import { createQueryClient } from '~util/query-client';
import {
    getMealsQueryKey,
    getWeekActivitiesQueryKey,
    getMealZoneTimesQueryKey,
    getWeeklyMealZonesQueryKey,
} from '~util/query-keys';

type MealPlanPageProps = Readonly<{
    searchParams: Promise<{ date?: string; meal?: string; slot?: string }>;
}>;

const isMealZoneKey = (value?: string): value is MealZoneKey =>
    MEAL_ZONE_KEYS.some((key) => key === value);

const MealPlanContent = async ({
    searchParams,
}: MealPlanPageProps): Promise<ReactElement> => {
    const profile = await requireUser();
    const { date, meal, slot } = await searchParams;
    const parsedDate =
        date && isMatch(date, 'yyyy-MM-dd') ? parseISO(date) : null;

    const requestedDate = parsedDate && isValid(parsedDate) ? parsedDate : null;
    const now = requestedDate ?? (await getRequestDate());

    const startDate = format(
        startOfWeek(now, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );

    const endDate = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const [meals, activities, mealZoneTimes, weeklyMealZones] =
        await Promise.all([
            fetchMeals({ endDate, startDate, userId: profile.id }),
            fetchActivities({ endDate, startDate, userId: profile.id }),
            fetchMealZoneTimes({ effectiveOn: startDate, userId: profile.id }),
            fetchWeeklyMealZones({ userId: profile.id, weekStart: startDate }),
        ]);

    const client = createQueryClient();

    client.setQueryData(getMealsQueryKey(profile.id, startDate), meals.data);
    client.setQueryData(
        getWeekActivitiesQueryKey(profile.id, startDate),
        activities,
    );
    client.setQueryData(getMealZoneTimesQueryKey(profile.id, startDate), {
        data: mealZoneTimes,
        effectiveFrom: startDate,
    });
    client.setQueryData(
        getWeeklyMealZonesQueryKey(profile.id, startDate),
        weeklyMealZones,
    );

    return (
        <HydrationBoundary state={dehydrate(client)}>
            <MealPlan
                canEditAnnotations
                initialDate={format(now, 'yyyy-MM-dd')}
                initialMealZone={isMealZoneKey(meal) ? meal : undefined}
                initialSlotKey={slot?.slice(0, 100)}
                initialWeeklyMealZones={weeklyMealZones}
                initialWeekStart={startDate}
                ownerUserId={profile.id}
            />
        </HydrationBoundary>
    );
};

const Page = ({ searchParams }: MealPlanPageProps): ReactElement => {
    return (
        <Suspense fallback={<MealPlanPageSkeleton />}>
            <MealPlanContent searchParams={searchParams} />
        </Suspense>
    );
};

export default Page;
