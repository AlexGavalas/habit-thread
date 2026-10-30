import { addWeeks, format, startOfWeek } from 'date-fns';

import { type ScheduleTemplate } from '~schemas/schedule-template';
import { type MealZoneKey, type WeeklyMealZone } from '~types/meal-zone';
import { getDaysOfWeek } from '~util/date';

export const getNextScheduleStart = (date: Date): string =>
    format(addWeeks(startOfWeek(date, { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');

export const findScheduleZone = (
    zones: readonly WeeklyMealZone[],
    target: { day: string; slotKey?: string; mealZone?: MealZoneKey },
): WeeklyMealZone | undefined =>
    zones.find(
        (zone) =>
            zone.day === target.day &&
            (target.slotKey
                ? zone.zoneKey === target.slotKey
                : target.mealZone !== undefined &&
                  (zone.legacyKey === target.mealZone ||
                      zone.zoneKey.startsWith(`${target.mealZone}_`))),
    );

export const resolveWeekSchedule = (
    week: Date,
    template: ScheduleTemplate,
    overrides: readonly WeeklyMealZone[],
): WeeklyMealZone[] => {
    const weekStart = format(
        startOfWeek(week, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );
    return getDaysOfWeek(week).flatMap<WeeklyMealZone>(
        ({ label: dayLabel, timestamp }) => {
            const day = format(timestamp, 'yyyy-MM-dd');
            const custom = overrides.filter((zone) => zone.day === day);
            if (custom.length) {
                return custom.map((zone) => ({ ...zone, isOverride: true }));
            }
            return template.slots.map(({ key, ...slot }, position) => ({
                ...slot,
                day,
                isOverride: false,
                position,
                weekStart,
                // Retain the legacy slot keys so existing meals and deep links work.
                zoneKey: `${key}_${dayLabel}`,
            }));
        },
    );
};
