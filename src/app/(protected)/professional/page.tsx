import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { Suspense } from 'react';

import { fetchMeals } from '~api/meal';
import { fetchMealZoneTimes } from '~api/meal-zone';
import {
    fetchProfessionalClient,
    fetchProfessionalClients,
} from '~api/professional';
import { getRequestDate, requireUser } from '~api/session';
import { fetchWeeklyMealZones } from '~api/weekly-meal-zone';
import { MealPlanPageSkeleton } from '~components/loading-skeleton';
import { ProfessionalDashboard } from '~features/professional-dashboard';
import { MealPlan } from '~features/screens/meal-plan';
import { createQueryClient } from '~util/query-client';
import {
    getMealsQueryKey,
    getMealZoneTimesQueryKey,
    getWeeklyMealZonesQueryKey,
} from '~util/query-keys';

type ProfessionalPageProps = Readonly<{
    searchParams: Promise<{
        client?: string;
        page?: string;
        q?: string;
    }>;
}>;

const ProfessionalDashboardContent = async ({
    searchParams,
}: ProfessionalPageProps): Promise<ReactElement> => {
    const user = await requireUser();
    if (!user.roles.includes('professional')) {
        redirect('/home');
    }

    const params = await searchParams;
    const page = Math.max(1, Number(params.page) || 1);
    const query = params.q?.trim() ?? '';
    const clientId = params.client ? Number(params.client) : null;
    const [clients, selectedClient] = await Promise.all([
        fetchProfessionalClients({
            page,
            professionalUserId: user.id,
            query,
        }),
        clientId
            ? fetchProfessionalClient({
                  clientUserId: clientId,
                  professionalUserId: user.id,
              })
            : null,
    ]);

    if (clientId && !selectedClient) {
        notFound();
    }

    let detail = null;

    if (selectedClient) {
        const now = await getRequestDate();
        const startDate = format(
            startOfWeek(now, { weekStartsOn: 1 }),
            'yyyy-MM-dd',
        );
        const endDate = format(
            endOfWeek(now, { weekStartsOn: 1 }),
            'yyyy-MM-dd',
        );
        const [meals, mealZoneTimes, weeklyMealZones] = await Promise.all([
            fetchMeals({
                endDate,
                startDate,
                userId: selectedClient.id,
            }),
            fetchMealZoneTimes({
                effectiveOn: startDate,
                userId: selectedClient.id,
            }),
            fetchWeeklyMealZones({
                userId: selectedClient.id,
                weekStart: startDate,
            }),
        ]);
        const queryClient = createQueryClient();
        queryClient.setQueryData(
            getMealsQueryKey(selectedClient.id, startDate),
            meals.data,
        );
        queryClient.setQueryData(
            getMealZoneTimesQueryKey(selectedClient.id, startDate),
            { data: mealZoneTimes, effectiveFrom: startDate },
        );
        queryClient.setQueryData(
            getWeeklyMealZonesQueryKey(selectedClient.id, startDate),
            weeklyMealZones,
        );

        detail = (
            <HydrationBoundary state={dehydrate(queryClient)}>
                <MealPlan
                    canEditAnnotations={false}
                    initialDate={format(now, 'yyyy-MM-dd')}
                    initialWeeklyMealZones={weeklyMealZones}
                    initialWeekStart={startDate}
                    ownerUserId={selectedClient.id}
                />
            </HydrationBoundary>
        );
    }

    return (
        <ProfessionalDashboard
            clients={clients}
            detail={detail}
            query={query}
            selectedClient={selectedClient}
        />
    );
};

const Page = ({ searchParams }: ProfessionalPageProps): ReactElement => {
    return (
        <Suspense fallback={<MealPlanPageSkeleton />}>
            <ProfessionalDashboardContent searchParams={searchParams} />
        </Suspense>
    );
};

export default Page;
