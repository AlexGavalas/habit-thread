'use client';

import { Alert, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { format, parseISO } from 'date-fns';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { getNextMealTime } from '~features/calendar/schedule-editor-utils';
import { ScheduleSlotFields } from '~features/calendar/schedule-slot-fields';
import {
    scheduleTemplateSchema,
    type ScheduleTemplate,
} from '~schemas/schedule-template';
import { ScheduleConflictError } from '~util/schedule-result';

import styles from '../calendar/schedule-editor.module.css';

type DefaultScheduleFormProps = Readonly<{
    initialTemplate: ScheduleTemplate;
    effectiveFrom: string;
    onSave: (
        template: ScheduleTemplate,
        effectiveFrom: string,
    ) => Promise<void>;
    isSaving: boolean;
    error: Error | null;
    saved: boolean;
    onClose?: () => void;
}>;

export const DefaultScheduleForm = ({
    initialTemplate,
    effectiveFrom,
    onSave,
    isSaving,
    error,
    saved,
    onClose,
}: DefaultScheduleFormProps): ReactElement => {
    const { t } = useTranslation();
    const inDrawer = Boolean(onClose);
    const active = useRef(true);
    useEffect(() => {
        active.current = true;
        return (): void => {
            active.current = false;
        };
    }, []);
    const [slots, setSlots] = useState(() =>
        initialTemplate.slots.map((slot) => ({
            ...slot,
            label: slot.legacyKey
                ? t(`meal_zone_settings.labels.${slot.legacyKey}`)
                : slot.label,
        })),
    );
    const validation = scheduleTemplateSchema.safeParse({
        kind: 'daily',
        slots,
    });
    const handleSlotChange = (
        key: string,
        field: 'label' | 'time',
        value: string,
    ): void => {
        setSlots((current) =>
            current.map((slot) =>
                slot.key === key
                    ? {
                          ...slot,
                          [field]: value,
                          ...(field === 'label'
                              ? { legacyKey: undefined }
                              : {}),
                      }
                    : slot,
            ),
        );
    };
    const handleAddSlot = (): void => {
        if (slots.length >= 10) {
            return;
        }
        setSlots((current) => [
            ...current,
            {
                key: crypto.randomUUID(),
                label: t('meal_plan.schedule.new_slot', {
                    number: current.length + 1,
                }),
                time: getNextMealTime(current),
            },
        ]);
    };
    const handleRemoveSlot = (key: string): void => {
        setSlots((current) =>
            current.length > 1
                ? current.filter((slot) => slot.key !== key)
                : current,
        );
    };
    const handleSave = async (): Promise<void> => {
        if (!validation.success || isSaving) {
            return;
        }
        const succeeded = await onSave(validation.data, effectiveFrom).then(
            () => true,
            () => false,
        );
        if (succeeded && active.current) {
            onClose?.();
        }
    };
    return (
        <div className={inDrawer ? styles.defaultEditor : undefined}>
            <ScrollArea
                className={inDrawer ? styles.editorScrollArea : undefined}
                offsetScrollbars
            >
                <Stack
                    className={inDrawer ? styles.editorContent : undefined}
                    gap="lg"
                >
                    <Text c="dimmed" size="sm">
                        {t('meal_plan.schedule.default_description', {
                            date: format(parseISO(effectiveFrom), 'dd/MM/yyyy'),
                            interpolation: { escapeValue: false },
                        })}
                    </Text>
                    <fieldset className={styles.fields} disabled={isSaving}>
                        <ScheduleSlotFields
                            slots={slots}
                            onChange={handleSlotChange}
                            onRemove={handleRemoveSlot}
                            onAdd={handleAddSlot}
                        />
                    </fieldset>
                    {error && (
                        <Alert color="danger" role="alert">
                            {error instanceof ScheduleConflictError
                                ? t('meal_plan.schedule.conflict', {
                                      dates: error.days.join(', '),
                                  })
                                : t('meal_plan.schedule.save_error')}
                        </Alert>
                    )}
                    {saved && !error && (
                        <Text role="status">
                            {t('meal_plan.schedule.save_success')}
                        </Text>
                    )}
                </Stack>
            </ScrollArea>
            <Group
                className={inDrawer ? styles.actions : undefined}
                justify="flex-end"
                mt={inDrawer ? undefined : 'md'}
            >
                {onClose && (
                    <Button
                        disabled={isSaving}
                        onClick={onClose}
                        variant="default"
                    >
                        {t('generic.actions.close')}
                    </Button>
                )}
                <Button
                    disabled={!validation.success}
                    loading={isSaving}
                    onClick={handleSave}
                >
                    {t('meal_plan.schedule.save_default', {
                        date: format(parseISO(effectiveFrom), 'dd/MM/yyyy'),
                        interpolation: { escapeValue: false },
                    })}
                </Button>
            </Group>
        </div>
    );
};
