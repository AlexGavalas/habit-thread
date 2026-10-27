import { format, parseISO } from 'date-fns';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type WeeklyMealZone } from '~types/meal-zone';
import { getDaysOfWeek } from '~util/date';

import { useEditorSubmit } from '../modals/use-editor-submit';
import {
    getDuplicateTimes,
    getNextMealTime,
    normalizeSchedule,
    type ScheduleEditorOptions,
} from './schedule-editor-utils';

type ScheduleEditor = {
    copySource: string | null;
    dayZones: WeeklyMealZone[];
    days: ReturnType<typeof getDaysOfWeek>;
    duplicateTimes: Set<string>;
    handleAdd: () => void;
    handleCopy: () => void;
    handleRemove: (zoneKey: string) => void;
    handleSave: () => Promise<void>;
    handleZoneChange: (
        zoneKey: string,
        field: 'label' | 'time',
    ) => (event: ChangeEvent<HTMLInputElement>) => void;
    hasErrors: boolean;
    removedMealCount: number;
    selectedDay: string;
    setCopySource: (source: string | null) => void;
    setSelectedDay: (day: string) => void;
};

export const useScheduleEditor = ({
    initialDay,
    meals,
    onClose,
    onSave,
    opened,
    weekStart,
    zones,
}: ScheduleEditorOptions): ScheduleEditor => {
    const { i18n, t } = useTranslation();
    const submission = useEditorSubmit();
    const days = useMemo(
        () =>
            getDaysOfWeek(
                parseISO(weekStart),
                'EEEE dd/MM',
                i18n.language === 'gr' ? 'gr' : 'en',
            ),
        [i18n.language, weekStart],
    );
    const [draft, setDraft] = useState<WeeklyMealZone[]>(zones);
    const [selectedDay, setSelectedDay] = useState(zones[0]?.day ?? weekStart);
    const [copySource, setCopySource] = useState<string | null>(null);

    useEffect(() => {
        if (!opened) {
            return;
        }
        setDraft(
            zones.map((zone) => ({
                ...zone,
                label: zone.legacyKey
                    ? t(`meal_zone_settings.labels.${zone.legacyKey}`)
                    : zone.label,
            })),
        );
        setSelectedDay(
            zones.some(({ day }) => day === initialDay)
                ? initialDay
                : (zones[0]?.day ?? weekStart),
        );
        setCopySource(null);
    }, [initialDay, opened, t, weekStart, zones]);

    const dayZones = draft
        .filter(({ day }) => day === selectedDay)
        .toSorted((a, b) => a.position - b.position);
    const duplicateTimes = getDuplicateTimes(dayZones);
    const hasErrors =
        draft.some(({ label }) => !label.trim()) ||
        days.some(({ timestamp }) => {
            const day = format(timestamp, 'yyyy-MM-dd');
            const values = draft.filter((zone) => zone.day === day);
            return (
                values.length < 1 ||
                values.length > 10 ||
                new Set(values.map(({ time }) => time)).size !== values.length
            );
        });
    const removedMealCount = meals.filter(
        (meal) => !draft.some(({ zoneKey }) => zoneKey === meal.section_key),
    ).length;

    const handleZoneChange =
        (
            zoneKey: string,
            field: 'label' | 'time',
        ): ((event: ChangeEvent<HTMLInputElement>) => void) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const value = event.currentTarget.value;
            setDraft((current) =>
                current.map((zone) =>
                    zone.zoneKey === zoneKey
                        ? { ...zone, [field]: value }
                        : zone,
                ),
            );
        };
    const handleRemove = (zoneKey: string): void => {
        if (dayZones.length <= 1) {
            return;
        }
        setDraft((current) =>
            current
                .filter((zone) => zone.zoneKey !== zoneKey)
                .map((zone) =>
                    zone.day === selectedDay
                        ? {
                              ...zone,
                              position: current
                                  .filter(
                                      (candidate) =>
                                          candidate.day === selectedDay &&
                                          candidate.zoneKey !== zoneKey,
                                  )
                                  .findIndex(
                                      (candidate) =>
                                          candidate.zoneKey === zone.zoneKey,
                                  ),
                          }
                        : zone,
                ),
        );
    };
    const handleAdd = (): void => {
        if (dayZones.length >= 10) {
            return;
        }
        setDraft((current) => [
            ...current,
            {
                day: selectedDay,
                label: t('meal_plan.schedule.new_slot', {
                    number: dayZones.length + 1,
                }),
                position: dayZones.length,
                time: getNextMealTime(dayZones),
                weekStart,
                zoneKey: crypto.randomUUID(),
            },
        ]);
    };
    const handleCopy = (): void => {
        if (!copySource || copySource === selectedDay) {
            return;
        }
        const source = draft
            .filter(({ day }) => day === copySource)
            .toSorted((a, b) => a.position - b.position);
        setDraft((current) => [
            ...current.filter(({ day }) => day !== selectedDay),
            ...source.map((zone, position) => ({
                ...zone,
                day: selectedDay,
                position,
                weekStart,
                zoneKey: crypto.randomUUID(),
            })),
        ]);
    };
    const handleSave = async (): Promise<void> => {
        const normalized = normalizeSchedule(draft, days);
        if (await submission.submit(() => onSave(normalized))) {
            onClose();
        }
    };

    return {
        copySource,
        dayZones,
        days,
        duplicateTimes,
        handleAdd,
        handleCopy,
        handleRemove,
        handleSave,
        handleZoneChange,
        hasErrors,
        removedMealCount,
        selectedDay,
        setCopySource,
        setSelectedDay,
    };
};
