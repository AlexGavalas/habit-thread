import { requireMealPlanAccess } from '~api/professional';
import { fetchWeeklyMealZones } from '~api/weekly-meal-zone';
import { ownerWeekQuerySchema } from '~schemas/meal-plan';
import { withUser } from '~util/session';

export const GET = withUser(async ({ request, user }) => {
    const { weekStart, ownerUserId = user.id } = ownerWeekQuerySchema.parse(
        Object.fromEntries(request.nextUrl.searchParams),
    );

    await requireMealPlanAccess({ actorUserId: user.id, ownerUserId });

    return Response.json({
        data: await fetchWeeklyMealZones({ userId: ownerUserId, weekStart }),
    });
});
