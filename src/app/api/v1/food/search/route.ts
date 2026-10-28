import { searchFoods } from '~api/food-search';
import { foodSearchQuerySchema } from '~schemas/food-search';
import { withUser } from '~util/session';

export const GET = withUser(async ({ request }) => {
    const query = foodSearchQuerySchema.parse(
        Object.fromEntries(request.nextUrl.searchParams),
    );

    return Response.json(
        await searchFoods({ country: query.country, query: query.q }),
    );
});
