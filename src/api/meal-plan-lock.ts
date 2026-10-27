import { sql } from 'drizzle-orm';
import 'server-only';

import { type getDb } from '~db';

export const lockMealPlan = async (
    db: ReturnType<typeof getDb>,
    ownerUserId: number,
): Promise<void> => {
    // A legacy bulk edit can move records across weeks. Lock the owner before
    // reading record locations so edits, schedule replacement, and copies share
    // one ordering without racing week discovery or acquiring locks out of order.
    await db.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`meal-plan:${ownerUserId}`}))`,
    );
};
