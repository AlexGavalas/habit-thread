import { z } from 'zod';

import { requireMealPlanAccess } from '~api/professional';
import { fetchScheduleTemplate } from '~api/schedule-template';
import { getRequestDate } from '~api/session';
import { getNextScheduleStart } from '~util/schedule';
import { withUser } from '~util/session';

export const GET = withUser(async ({ request, user }) => {
    const { ownerUserId = user.id } = z
        .object({
            ownerUserId: z.coerce.number().int().positive().optional(),
        })
        .parse(Object.fromEntries(request.nextUrl.searchParams));
    await requireMealPlanAccess({ actorUserId: user.id, ownerUserId });
    const effectiveFrom = getNextScheduleStart(await getRequestDate());
    return Response.json({
        effectiveFrom,
        template: await fetchScheduleTemplate({
            effectiveOn: effectiveFrom,
            userId: ownerUserId,
        }),
    });
});
