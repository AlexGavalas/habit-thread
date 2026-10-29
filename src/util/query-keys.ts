export const getProfileQueryKey = (
    email: string | null | undefined,
): readonly ['user', string | null | undefined] => ['user', email];

export const getMeasurementSummaryQueryKey = (
    ownerUserId: number | undefined,
): readonly ['measurement-summary', number | undefined] => [
    'measurement-summary',
    ownerUserId,
];

export const getMealsQueryKey = (
    ownerUserId: number | undefined,
    weekStart: string,
): readonly ['meals', number | undefined, string] => [
    'meals',
    ownerUserId,
    weekStart,
];

export const getWeeklyMealZonesQueryKey = (
    ownerUserId: number | undefined,
    weekStart: string,
): readonly ['weekly-meal-zones', number | undefined, string] => [
    'weekly-meal-zones',
    ownerUserId,
    weekStart,
];

export const getMealZoneTimesQueryKey = (
    ownerUserId: number | undefined,
    weekStart?: string,
): readonly ['meal-zone-times', number | undefined, string] => [
    'meal-zone-times',
    ownerUserId,
    weekStart ?? 'next-week',
];

export const getScheduleTemplateQueryKey = (
    ownerUserId: number | undefined,
): readonly ['schedule-template', number | undefined] => [
    'schedule-template',
    ownerUserId,
];

export const getWeekActivitiesQueryKey = (
    ownerUserId: number | undefined,
    weekStart: string,
): readonly ['activities', 'week', number | undefined, string] => [
    'activities',
    'week',
    ownerUserId,
    weekStart,
];
