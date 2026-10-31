import { persistedActivitiesResponseSchema } from './activity';
import { connectionsResponseSchema } from './connection';
import {
    foodSearchCountrySchema,
    foodSearchResponseSchema,
} from './food-search';
import { mealZoneKeySchema } from './meal-zone';
import { measurementsResponseSchema } from './measurement';
import { connectionRequestsResponseSchema } from './notification';
import {
    professionalConnectionsResponseSchema,
    professionalSearchResponseSchema,
} from './professional';
import { notificationPreferencesResponseSchema } from './push-notification';
import {
    userRoleSchema,
    userSearchResponseSchema,
    userSummaryResponseSchema,
} from './user';

describe('read response contracts', () => {
    it.each([
        ['activities', persistedActivitiesResponseSchema],
        ['measurements', measurementsResponseSchema],
        ['connections', connectionsResponseSchema],
        ['connection requests', connectionRequestsResponseSchema],
        ['user search', userSearchResponseSchema],
        ['user summaries', userSummaryResponseSchema],
        ['professional search', professionalSearchResponseSchema],
    ])('accepts an explicit empty %s list', (_, schema) => {
        expect(schema.parse({ data: [] })).toStrictEqual({ data: [] });
    });

    it.each([
        ['activities', persistedActivitiesResponseSchema],
        ['measurements', measurementsResponseSchema],
        ['connections', connectionsResponseSchema],
        ['connection requests', connectionRequestsResponseSchema],
        ['user search', userSearchResponseSchema],
        ['user summaries', userSummaryResponseSchema],
        ['professional search', professionalSearchResponseSchema],
    ])('rejects a missing %s list', (_, schema) => {
        expect(schema.safeParse({}).success).toBe(false);
    });

    it('accepts the actual selected-user projection without requiring a full profile', () => {
        const response = { data: [{ full_name: 'Alex', id: 1 }] };

        expect(userSummaryResponseSchema.parse(response)).toStrictEqual(
            response,
        );
    });

    it('requires persisted activity IDs rather than accepting draft rows', () => {
        expect(
            persistedActivitiesResponseSchema.safeParse({
                data: [{ activity: 'Walk', date: '2026-01-12', user_id: 1 }],
            }).success,
        ).toBe(false);
    });

    it('preserves a nullable measurement fat percentage', () => {
        const response = {
            data: [
                {
                    date: '2026-01-12',
                    fat_percentage: null,
                    id: 'measurement-id',
                    user_id: 1,
                    weight: 80,
                },
            ],
        };

        expect(measurementsResponseSchema.parse(response)).toStrictEqual(
            response,
        );
    });

    it('preserves an absent current professional and empty invitations', () => {
        const response = {
            data: {
                currentProfessional: null,
                incomingInvitations: [],
                outgoingInvitations: [],
            },
        };

        expect(
            professionalConnectionsResponseSchema.parse(response),
        ).toStrictEqual(response);
    });

    it('preserves absent reminder preferences', () => {
        expect(
            notificationPreferencesResponseSchema.parse({ data: null }),
        ).toStrictEqual({ data: null });
    });

    it('accepts database reminder times with seconds without changing the value', () => {
        const response = {
            data: {
                meal_reminder_enabled: false,
                meal_reminder_time: '20:00:00',
                next_notification_at: null,
                timezone: 'Europe/Athens',
                user_id: 1,
            },
        };

        expect(
            notificationPreferencesResponseSchema.parse(response),
        ).toStrictEqual(response);
    });

    it('preserves partial nutrition and provider availability warnings', () => {
        const response = {
            data: {
                bls: [
                    {
                        alternativeName: null,
                        brand: null,
                        id: 'food-id',
                        name: 'Food',
                        nutrition: {
                            calories: 0,
                            carbohydrates: null,
                            fat: null,
                            fiber: null,
                            protein: null,
                            salt: null,
                            sugar: null,
                        },
                        quantity: null,
                        source: 'bls',
                    },
                ],
                openFoodFacts: [],
            },
            warnings: ['open-food-facts-unavailable'],
        };

        expect(foodSearchResponseSchema.parse(response)).toStrictEqual(
            response,
        );
    });

    it.each(['all', 'de', 'gr'])(
        'accepts the supported food country %s',
        (country) => {
            expect(foodSearchCountrySchema.parse(country)).toBe(country);
        },
    );

    it('rejects unsupported food countries and roles', () => {
        expect(foodSearchCountrySchema.safeParse('fr').success).toBe(false);
        expect(userRoleSchema.safeParse('admin').success).toBe(false);
    });

    it('recognizes legacy meal zones without treating custom zones as legacy', () => {
        expect(mealZoneKeySchema.parse('morning')).toBe('morning');
        expect(mealZoneKeySchema.safeParse('custom-zone').success).toBe(false);
    });
});
