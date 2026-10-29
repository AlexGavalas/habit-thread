'use client';

import { Alert, Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { format, parseISO } from 'date-fns';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { AppDrawer } from '~components/overlays/overlays';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { type EditedMeal } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './schedule-editor.module.css';
import { ScheduleSlotFields } from './schedule-slot-fields';
import { useScheduleEditor } from './use-schedule-editor';

export type ScheduleEditorProps = Readonly<{
    isSaving: boolean;
    initialDay: string;
    meals: EditedMeal[];
    onClose: () => void;
    onSave: (day: string, zones: WeeklyMealZone[] | null) => Promise<void>;
    opened?: boolean;
    weekStart: string;
    zones: WeeklyMealZone[];
}>;

const ScheduleEditorContent = (props: ScheduleEditorProps): ReactElement => {
    const { t } = useTranslation();
    const editor = useScheduleEditor(props);
    const { initialDay: day, isSaving, zones } = props;
    return (
        <>
            <ScrollArea className={styles.editorScrollArea} offsetScrollbars>
                <Stack className={styles.editorContent} gap="lg">
                    <Text c="dimmed" size="sm">
                        {t('meal_plan.schedule.day_description')}
                    </Text>
                    <fieldset className={styles.fields} disabled={isSaving}>
                        <ScheduleSlotFields
                            slots={editor.draft.map((zone) => ({
                                ...zone,
                                key: zone.zoneKey,
                            }))}
                            onChange={editor.handleSlotChange}
                            onAdd={editor.handleAddSlot}
                            onRemove={editor.handleRemoveSlot}
                        />
                    </fieldset>
                    {zones.some(
                        (zone) => zone.day === day && zone.isOverride,
                    ) && (
                        <Button
                            disabled={isSaving}
                            onClick={() => editor.handleSave(true)}
                            variant="subtle"
                        >
                            {t('meal_plan.schedule.use_default')}
                        </Button>
                    )}
                    {editor.removedMealCount > 0 && (
                        <Alert color="warning" role="alert">
                            {t('meal_plan.schedule.removal_blocked', {
                                count: editor.removedMealCount,
                            })}
                        </Alert>
                    )}
                    {editor.error && (
                        <Alert color="danger" role="alert">
                            {editor.error}
                        </Alert>
                    )}
                </Stack>
            </ScrollArea>
            <Group className={styles.actions} justify="flex-end">
                <Button
                    disabled={isSaving}
                    onClick={editor.handleClose}
                    variant="default"
                >
                    {t('generic.actions.cancel')}
                </Button>
                <Button
                    disabled={editor.hasErrors || editor.removedMealCount > 0}
                    loading={isSaving}
                    onClick={() => editor.handleSave(false)}
                >
                    {t('meal_plan.schedule.save_day')}
                </Button>
            </Group>
        </>
    );
};

export const ScheduleEditor = (props: ScheduleEditorProps): ReactElement => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    const handleClose = (): void => {
        if (!props.isSaving) {
            props.onClose();
        }
    };
    return (
        <AppDrawer
            classNames={{
                body: styles.drawerBody,
                content: styles.drawerContent,
            }}
            closeButtonProps={{
                'aria-label': t('generic.actions.close'),
                disabled: props.isSaving,
            }}
            onClose={handleClose}
            opened={props.opened ?? true}
            position="right"
            size="md"
            title={t('meal_plan.schedule.day_title', {
                date: format(parseISO(props.initialDay), 'dd/MM/yyyy'),
                interpolation: { escapeValue: false },
            })}
        >
            <ScheduleEditorContent
                key={`${ownerUserId}-${props.weekStart}-${props.initialDay}`}
                {...props}
            />
        </AppDrawer>
    );
};
