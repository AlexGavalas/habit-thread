export type MealZoneKey = 'morning' | 'snack1' | 'lunch' | 'snack2' | 'dinner';

export type MealZoneTimes = Record<MealZoneKey, string>;

export type WeeklyMealZone = {
    day: string;
    label: string;
    legacyKey?: MealZoneKey;
    isOverride?: boolean;
    position: number;
    time: string;
    weekStart: string;
    zoneKey: string;
};
