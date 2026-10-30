import 'server-only';
import { type AnyColumn, type GetColumnData, eq, or } from 'drizzle-orm';

import { getDb } from '~db';
import {
    activities,
    connections,
    mealImportUsage,
    mealItems,
    mealPool,
    mealPoolItems,
    mealReminderDeliveries,
    meals,
    mealZoneTimes,
    measurements,
    notificationPreferences,
    notifications,
    professionalClients,
    scheduleTemplates,
    userRoles,
    users,
    userSignupOrigins,
    weeklyMealZones,
} from '~db/schema';
import {
    type ScheduleTemplate,
    scheduleTemplateSchema,
} from '~schemas/schedule-template';

import { exportColumns as columns } from './columns';

// A repeatable-read snapshot keeps parent/child records consistent during edits.
// Only ownership is considered: delegated professional access never widens exports.
type ExportRow<Selection extends Record<string, AnyColumn>> = {
    [Field in keyof Selection]: GetColumnData<Selection[Field]>;
};
type RawExportData = {
    [Table in keyof typeof columns]: ExportRow<(typeof columns)[Table]>[];
};
export type AccountExportData = Omit<RawExportData, 'scheduleTemplates'> & {
    scheduleTemplates: (Omit<
        RawExportData['scheduleTemplates'][number],
        'template'
    > & {
        template: ScheduleTemplate;
    })[];
};

export const readAccountExport = async (
    userId: number,
): Promise<AccountExportData> => {
    return getDb().transaction(
        async (tx) => {
            const templates = await tx
                .select(columns.scheduleTemplates)
                .from(scheduleTemplates)
                .where(eq(scheduleTemplates.user_id, userId));
            return {
                activities: await tx
                    .select(columns.activities)
                    .from(activities)
                    .where(eq(activities.user_id, userId)),
                connections: await tx
                    .select(columns.connections)
                    .from(connections)
                    .where(
                        or(
                            eq(connections.user_id, userId),
                            eq(connections.connection_user_id, userId),
                        ),
                    ),
                importUsage: await tx
                    .select(columns.importUsage)
                    .from(mealImportUsage)
                    .where(eq(mealImportUsage.user_id, userId)),
                library: await tx
                    .select(columns.library)
                    .from(mealPool)
                    .where(eq(mealPool.user_id, userId)),
                libraryItems: await tx
                    .select(columns.libraryItems)
                    .from(mealPoolItems)
                    .innerJoin(
                        mealPool,
                        eq(mealPool.id, mealPoolItems.meal_pool_id),
                    )
                    .where(eq(mealPool.user_id, userId)),
                mealItems: await tx
                    .select(columns.mealItems)
                    .from(mealItems)
                    .innerJoin(meals, eq(meals.id, mealItems.meal_id))
                    .where(eq(meals.user_id, userId)),
                meals: await tx
                    .select(columns.meals)
                    .from(meals)
                    .where(eq(meals.user_id, userId)),
                measurements: await tx
                    .select(columns.measurements)
                    .from(measurements)
                    .where(eq(measurements.user_id, userId)),
                notificationPreferences: await tx
                    .select(columns.notificationPreferences)
                    .from(notificationPreferences)
                    .where(eq(notificationPreferences.user_id, userId)),
                notifications: await tx
                    .select(columns.notifications)
                    .from(notifications)
                    .where(
                        or(
                            eq(notifications.request_user_id, userId),
                            eq(notifications.target_user_id, userId),
                        ),
                    ),
                professionalRelationships: await tx
                    .select(columns.professionalRelationships)
                    .from(professionalClients)
                    .where(
                        or(
                            eq(professionalClients.client_user_id, userId),
                            eq(
                                professionalClients.professional_user_id,
                                userId,
                            ),
                        ),
                    ),
                profile: await tx
                    .select(columns.profile)
                    .from(users)
                    .where(eq(users.id, userId)),
                reminderDeliveries: await tx
                    .select(columns.reminderDeliveries)
                    .from(mealReminderDeliveries)
                    .where(eq(mealReminderDeliveries.user_id, userId)),
                roles: await tx
                    .select(columns.roles)
                    .from(userRoles)
                    .where(eq(userRoles.user_id, userId)),
                scheduleTemplates: templates.map((row) => ({
                    ...row,
                    template: scheduleTemplateSchema.parse(row.template),
                })),
                signupOrigins: await tx
                    .select(columns.signupOrigins)
                    .from(userSignupOrigins)
                    .where(eq(userSignupOrigins.user_id, userId)),
                zoneTimes: await tx
                    .select(columns.zoneTimes)
                    .from(mealZoneTimes)
                    .where(eq(mealZoneTimes.user_id, userId)),
                zones: await tx
                    .select(columns.zones)
                    .from(weeklyMealZones)
                    .where(eq(weeklyMealZones.user_id, userId)),
            };
        },
        { accessMode: 'read only', isolationLevel: 'repeatable read' },
    );
};
