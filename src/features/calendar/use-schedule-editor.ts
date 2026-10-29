import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { weeklyMealZoneSchema } from '~schemas/weekly-meal-zone';
import { type WeeklyMealZone } from '~types/meal-zone';
import { ScheduleConflictError } from '~util/schedule-result';

import { type ScheduleEditorProps } from './schedule-editor';
import { getNextMealTime } from './schedule-editor-utils';

type DayScheduleEditor = {
    draft: WeeklyMealZone[];
    error: string;
    handleAddSlot: () => void;
    handleClose: () => void;
    handleRemoveSlot: (key: string) => void;
    handleSave: (reset: boolean) => Promise<void>;
    handleSlotChange: (
        key: string,
        field: 'label' | 'time',
        value: string,
    ) => void;
    hasErrors: boolean;
    removedMealCount: number;
};

export const useScheduleEditor = ({
    initialDay: day,
    isSaving,
    meals,
    onClose,
    onSave,
    weekStart,
    zones,
}: ScheduleEditorProps): DayScheduleEditor => {
    const { t } = useTranslation();
    // The calendar keys the editor by owner/week/date. Refetches never replace
    // an open draft; navigation unmounts it and cannot close the next editor.
    const [draft, setDraft] = useState(() =>
        zones
            .filter((zone) => zone.day === day)
            .map((zone) => ({
                ...zone,
                label: zone.legacyKey
                    ? t(`meal_zone_settings.labels.${zone.legacyKey}`)
                    : zone.label,
            })),
    );
    const [error, setError] = useState('');
    const active = useRef(true);
    const submitting = useRef(false);
    useEffect(() => {
        active.current = true;
        return (): void => {
            active.current = false;
        };
    }, []);
    const hasErrors =
        !z.array(weeklyMealZoneSchema).min(1).max(10).safeParse(draft)
            .success ||
        new Set(draft.map(({ time }) => time)).size !== draft.length;
    const removedMealCount = meals.filter(
        (meal) =>
            meal.day === day &&
            !draft.some((zone) => zone.zoneKey === meal.section_key),
    ).length;
    const handleSlotChange = (
        key: string,
        field: 'label' | 'time',
        value: string,
    ): void => {
        setDraft((current) =>
            current.map((zone) =>
                zone.zoneKey === key
                    ? {
                          ...zone,
                          [field]: value,
                          ...(field === 'label'
                              ? { legacyKey: undefined }
                              : {}),
                      }
                    : zone,
            ),
        );
    };
    const handleAddSlot = (): void => {
        if (draft.length >= 10) {
            return;
        }
        setDraft((current) => [
            ...current,
            {
                day,
                label: t('meal_plan.schedule.new_slot', {
                    number: current.length + 1,
                }),
                position: current.length,
                time: getNextMealTime(current),
                weekStart,
                zoneKey: crypto.randomUUID(),
            },
        ]);
    };
    const handleRemoveSlot = (key: string): void => {
        setDraft((current) =>
            current.length > 1
                ? current.filter((zone) => zone.zoneKey !== key)
                : current,
        );
    };
    const handleSave = async (reset: boolean): Promise<void> => {
        if (
            submitting.current ||
            isSaving ||
            (!reset && (hasErrors || removedMealCount > 0))
        ) {
            return;
        }
        submitting.current = true;
        setError('');
        try {
            await onSave(
                day,
                reset
                    ? null
                    : draft
                          .toSorted((a, b) => a.time.localeCompare(b.time))
                          .map((zone, position) => ({
                              ...zone,
                              label: zone.label.trim(),
                              position,
                          })),
            );
            if (active.current) {
                onClose();
            }
        } catch (failure) {
            if (active.current) {
                setError(
                    failure instanceof ScheduleConflictError
                        ? t('meal_plan.schedule.conflict', {
                              dates: failure.days.join(', '),
                          })
                        : t('meal_plan.schedule.save_error'),
                );
            }
        } finally {
            submitting.current = false;
        }
    };
    const handleClose = (): void => {
        if (!isSaving && !submitting.current) {
            onClose();
        }
    };
    return {
        draft,
        error,
        handleAddSlot,
        handleClose,
        handleRemoveSlot,
        handleSave,
        handleSlotChange,
        hasErrors,
        removedMealCount,
    };
};
