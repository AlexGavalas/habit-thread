import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { endOfDay, format, startOfDay, startOfWeek } from 'date-fns';
import type { ReactElement } from 'react';
import { Suspense } from 'react';

import { fetchMeals } from '~api/meal';
import { fetchMeasurementSummary } from '~api/measurement';
import { getRequestDate, requireUser } from '~api/session';
import { fetchWeeklyMealZones } from '~api/weekly-meal-zone';
import { HomePageSkeleton } from '~components/loading-skeleton';
import { Home } from '~features/screens/home';
import type { Meal } from '~types/meal';
import { createQueryClient } from '~util/query-client';
import { getMeasurementSummaryQueryKey } from '~util/query-keys';

const HomeContent = async (): Promise<ReactElement> => {
    const profile = await requireUser();
    const now = await getRequestDate();
    const [meals, weeklyMealZones, measurementSummary] = await Promise.all([
        fetchMeals({
            endDate: format(endOfDay(now), 'yyyy-MM-dd HH:mm'),
            startDate: format(startOfDay(now), 'yyyy-MM-dd HH:mm'),
            userId: profile.id,
        }),
        fetchWeeklyMealZones({
            userId: profile.id,
            weekStart: format(
                startOfWeek(now, { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            ),
        }),
        fetchMeasurementSummary({ userId: profile.id }),
    ]);

    const client = createQueryClient();
    client.setQueryData(
        getMeasurementSummaryQueryKey(profile.id),
        measurementSummary,
    );

    return (
        <HydrationBoundary state={dehydrate(client)}>
            <Home
                dailyMeals={Object.fromEntries(
                    meals.data.map((meal): [string, Meal] => [
                        meal.section_key,
                        meal,
                    ]),
                )}
                date={format(now, "yyyy-MM-dd'T'HH:mm:ss")}
                fullName={profile.full_name}
                weeklyMealZones={weeklyMealZones}
                targetWeight={profile.target_weight}
            />
        </HydrationBoundary>
    );
};

const Page = (): ReactElement => {
    return (
        <Suspense fallback={<HomePageSkeleton />}>
            <HomeContent />
        </Suspense>
    );
};

export default Page;
