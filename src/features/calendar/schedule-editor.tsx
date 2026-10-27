'use client';

import {
    Alert,
    Button,
    Drawer,
    Group,
    Paper,
    ScrollArea,
    Select,
    Stack,
    Text,
} from '@mantine/core';
import { format } from 'date-fns';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditedMeal } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './schedule-editor.module.css';
import { ScheduleZoneRow } from './schedule-zone-row';
import { useScheduleEditor } from './use-schedule-editor';

type Props = Readonly<{
    isSaving: boolean;
    initialDay: string;
    meals: EditedMeal[];
    onClose: () => void;
    onSave: (zones: WeeklyMealZone[]) => Promise<void>;
    opened: boolean;
    weekStart: string;
    zones: WeeklyMealZone[];
}>;

export const ScheduleEditor = (props: Props): ReactElement => {
    const { t } = useTranslation();
    const editor = useScheduleEditor(props);
    const dayOptions = editor.days.map(({ label, timestamp }) => ({
        label,
        value: format(timestamp, 'yyyy-MM-dd'),
    }));
    const copyOptions = dayOptions.filter(
        ({ value }) => value !== editor.selectedDay,
    );
    const handleDayChange = (value: string | null): void => {
        if (value) {
            editor.setSelectedDay(value);
        }
    };
    const handleCopySourceChange = (value: string | null): void => {
        editor.setCopySource(value);
    };
    const handleClose = (): void => {
        if (!props.isSaving) {
            props.onClose();
        }
    };

    return (
        <Drawer
            classNames={{
                body: styles.drawerBody,
                content: styles.drawerContent,
            }}
            closeButtonProps={{ 'aria-label': t('generic.actions.close') }}
            onClose={handleClose}
            opened={props.opened}
            position="right"
            size="md"
            title={t('meal_plan.schedule.title')}
        >
            <ScrollArea className={styles.editorScrollArea} offsetScrollbars>
                <Stack className={styles.editorContent} gap="lg">
                    <Text c="dimmed" size="sm">
                        {t('meal_plan.schedule.description')}
                    </Text>
                    <Select
                        allowDeselect={false}
                        data={dayOptions}
                        label={t('meal_plan.schedule.day')}
                        onChange={handleDayChange}
                        value={editor.selectedDay}
                    />
                    <Group justify="space-between">
                        <Text fw={600}>
                            {t('meal_plan.schedule.meal_slots')}
                        </Text>
                        <Text c="dimmed" size="sm">
                            {editor.dayZones.length} / 10
                        </Text>
                    </Group>
                    <Stack gap="sm">
                        {editor.dayZones.map((zone, index) => (
                            <ScheduleZoneRow
                                duplicateTime={editor.duplicateTimes.has(
                                    zone.time,
                                )}
                                index={index}
                                isOnlyZone={editor.dayZones.length === 1}
                                key={zone.zoneKey}
                                onLabelChange={editor.handleZoneChange(
                                    zone.zoneKey,
                                    'label',
                                )}
                                onRemove={editor.handleRemove.bind(
                                    undefined,
                                    zone.zoneKey,
                                )}
                                onTimeChange={editor.handleZoneChange(
                                    zone.zoneKey,
                                    'time',
                                )}
                                zone={zone}
                            />
                        ))}
                    </Stack>
                    <Button
                        disabled={editor.dayZones.length >= 10}
                        onClick={editor.handleAdd}
                        variant="outline"
                    >
                        {t('meal_plan.schedule.add_slot')}
                    </Button>
                    <Paper p="sm" withBorder>
                        <Stack gap="sm">
                            <Select
                                clearable
                                data={copyOptions}
                                label={t('meal_plan.schedule.copy_from')}
                                onChange={handleCopySourceChange}
                                value={editor.copySource}
                            />
                            <Button
                                disabled={!editor.copySource}
                                onClick={editor.handleCopy}
                                variant="default"
                            >
                                {t('meal_plan.schedule.copy')}
                            </Button>
                        </Stack>
                    </Paper>
                    {editor.removedMealCount > 0 && (
                        <Alert
                            color="warning"
                            title={t('meal_plan.schedule.warning_title')}
                        >
                            {t('meal_plan.schedule.removed_meals_warning', {
                                count: editor.removedMealCount,
                            })}
                        </Alert>
                    )}
                </Stack>
            </ScrollArea>
            <Group className={styles.actions} justify="flex-end">
                <Button
                    disabled={props.isSaving}
                    onClick={handleClose}
                    variant="default"
                >
                    {t('generic.actions.cancel')}
                </Button>
                <Button
                    disabled={editor.hasErrors}
                    loading={props.isSaving}
                    onClick={editor.handleSave}
                >
                    {t('meal_plan.schedule.save')}
                </Button>
            </Group>
        </Drawer>
    );
};
