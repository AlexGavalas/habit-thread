import { Button, Stack } from '@mantine/core';
import type { ChangeEventHandler, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ScheduleZoneRow } from './schedule-zone-row';

type ScheduleSlotFieldsProps = Readonly<{
    slots: readonly { key: string; label: string; time: string }[];
    onChange: (key: string, field: 'label' | 'time', value: string) => void;
    onRemove: (key: string) => void;
    onAdd: () => void;
}>;

export const ScheduleSlotFields = ({
    slots,
    onChange,
    onRemove,
    onAdd,
}: ScheduleSlotFieldsProps): ReactElement => {
    const { t } = useTranslation();
    return (
        <Stack gap="sm">
            {slots.map((slot, index) => {
                const handleLabelChange: ChangeEventHandler<
                    HTMLInputElement
                > = (event) => {
                    onChange(slot.key, 'label', event.currentTarget.value);
                };
                const handleTimeChange: ChangeEventHandler<HTMLInputElement> = (
                    event,
                ) => {
                    onChange(slot.key, 'time', event.currentTarget.value);
                };
                const handleRemove = (): void => {
                    onRemove(slot.key);
                };
                return (
                    <ScheduleZoneRow
                        key={slot.key}
                        zone={slot}
                        index={index}
                        isOnlyZone={slots.length === 1}
                        duplicateTime={slots.some(
                            (other) =>
                                other.key !== slot.key &&
                                other.time === slot.time,
                        )}
                        onLabelChange={handleLabelChange}
                        onTimeChange={handleTimeChange}
                        onRemove={handleRemove}
                    />
                );
            })}
            <Button
                disabled={slots.length >= 10}
                onClick={onAdd}
                variant="outline"
            >
                {t('meal_plan.schedule.add_slot')}
            </Button>
        </Stack>
    );
};
