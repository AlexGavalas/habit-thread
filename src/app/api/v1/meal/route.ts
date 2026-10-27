import { fetchMeals } from '~api/meal';
import { saveMealPlanChanges } from '~api/meal-plan';
import { requireMealPlanAccess } from '~api/professional';
import { mealRangeQuerySchema } from '~schemas/meal-plan';
import { withUser } from '~util/session';

export const GET = withUser(async ({ request, user }) => {
    const {
        endDate,
        startDate,
        ownerUserId = user.id,
    } = mealRangeQuerySchema.parse(
        Object.fromEntries(request.nextUrl.searchParams),
    );

    await requireMealPlanAccess({
        actorUserId: user.id,
        ownerUserId,
    });

    const { data } = await fetchMeals({
        endDate,
        startDate,
        userId: ownerUserId,
    });

    return Response.json({ data });
});

export const PATCH = withUser(async ({ request, user }) => {
    const result = await saveMealPlanChanges(user.id, await request.json());
    if (!result.ok) {
        return Response.json(result, {
            status: result.reason === 'forbidden' ? 404 : 400,
        });
    }

    return Response.json({ message: 'OK' }, { status: 200 });
});
