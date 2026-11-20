'use client';

import { format, parseISO } from 'date-fns';
import dynamic from 'next/dynamic';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { CenterLoader } from '~components/center-loader';
import { AppDrawer } from '~components/overlays/overlays';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { type EditedMeal } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './schedule-editor.module.css';

const ScheduleEditorContent = dynamic(
    () =>
        import('./schedule-editor-content').then(
            (module) => module.ScheduleEditorContent,
        ),
    { loading: CenterLoader },
);

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
