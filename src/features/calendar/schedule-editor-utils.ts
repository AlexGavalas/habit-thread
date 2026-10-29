import { addMinutes, format, parse } from 'date-fns';

import { type WeeklyMealZone } from '~types/meal-zone';

export const getNextMealTime = (zones: readonly { time: string }[]): string => {
    const last = zones.toSorted((a, b) => a.time.localeCompare(b.time)).at(-1);
    if (!last) {
        return '12:00';
    }
    const parsed = parse(last.time, 'HH:mm', new Date(2000, 0, 1));
    const value = format(addMinutes(parsed, 60), 'HH:mm');
    return value === '00:00' ? '23:59' : value;
};

export const normalizeSchedule = (
    zones: readonly WeeklyMealZone[],
    days: readonly { timestamp: Date }[],
): WeeklyMealZone[] =>
    days.flatMap(({ timestamp }) => {
        const day = format(timestamp, 'yyyy-MM-dd');
        return zones
            .filter((zone) => zone.day === day)
            .toSorted((a, b) => a.time.localeCompare(b.time))
            .map((zone, position) => ({
                ...zone,
                label: zone.label.trim(),
                position,
            }));
    });

export const getDuplicateTimes = (
    zones: readonly WeeklyMealZone[],
): Set<string> =>
    new Set(
        zones
            .filter(
                (zone, index) =>
                    zones.findIndex(({ time }) => time === zone.time) !== index,
            )
            .map(({ time }) => time),
    );
