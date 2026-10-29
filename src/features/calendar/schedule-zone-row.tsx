import { ActionIcon, Paper, TextInput } from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { Trash } from 'iconoir-react';
import type { ReactElement } from 'react';
import { type ChangeEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { scheduleSlotSchema } from '~schemas/schedule-template';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './schedule-editor.module.css';

type Props = Readonly<{
    duplicateTime: boolean;
    index: number;
    isOnlyZone: boolean;
    onLabelChange: ChangeEventHandler<HTMLInputElement>;
    onRemove: () => void;
    onTimeChange: ChangeEventHandler<HTMLInputElement>;
    zone: Pick<WeeklyMealZone, 'label' | 'time'>;
}>;

export const ScheduleZoneRow = ({
    duplicateTime,
    index,
    isOnlyZone,
    onLabelChange,
    onRemove,
    onTimeChange,
    zone,
}: Props): ReactElement => {
    const { t } = useTranslation();

    return (
        <Paper p="sm" withBorder>
            <div className={styles.zoneRow}>
                <TextInput
                    aria-label={t('meal_plan.schedule.name_label', {
                        number: index + 1,
                    })}
                    error={
                        zone.label.trim()
                            ? undefined
                            : t('meal_plan.schedule.name_error')
                    }
                    label={t('meal_plan.schedule.name')}
                    maxLength={40}
                    onChange={onLabelChange}
                    value={zone.label}
                />
                <TimeInput
                    aria-label={t('meal_plan.schedule.time_label', {
                        number: index + 1,
                    })}
                    error={
                        !scheduleSlotSchema.shape.time.safeParse(zone.time)
                            .success
                            ? t('meal_plan.schedule.time_required')
                            : duplicateTime
                              ? t('meal_plan.schedule.time_error')
                              : undefined
                    }
                    label={t('meal_plan.schedule.time')}
                    onChange={onTimeChange}
                    value={zone.time}
                />
                <ActionIcon
                    aria-label={t('meal_plan.schedule.remove_slot', {
                        interpolation: { escapeValue: false },
                        name: zone.label,
                    })}
                    color="danger"
                    disabled={isOnlyZone}
                    onClick={onRemove}
                    variant="subtle"
                >
                    <Trash />
                </ActionIcon>
            </div>
        </Paper>
    );
};
