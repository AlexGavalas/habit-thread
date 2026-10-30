import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { AppDrawer } from '~components/overlays/overlays';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { useMealMutationState } from '~store/hooks/meal-mutation-state';

import styles from '../calendar/schedule-editor.module.css';
import { MealZoneSettings } from './meal-zone-settings';
import { useDefaultSchedule } from './use-default-schedule';

type DefaultScheduleDrawerProps = Readonly<{
    onClose: () => void;
    opened: boolean;
}>;

export const DefaultScheduleDrawer = ({
    onClose,
    opened,
}: DefaultScheduleDrawerProps): ReactElement => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    // Keep the query observer outside Drawer content: development Strict Mode
    // remounts that content, which otherwise aborts and restarts its first read.
    const schedule = useDefaultSchedule(ownerUserId, opened);
    const { isSaving } = useMealMutationState(ownerUserId);
    const handleClose = (): void => {
        if (!isSaving) {
            onClose();
        }
    };
    return (
        <AppDrawer
            opened={opened}
            onClose={handleClose}
            position="right"
            size="md"
            title={t('meal_plan.schedule.default_title')}
            closeButtonProps={{
                'aria-label': t('generic.actions.close'),
                disabled: isSaving,
            }}
            classNames={{
                body: styles.drawerBody,
                content: styles.drawerContent,
            }}
        >
            <MealZoneSettings
                key={ownerUserId}
                schedule={schedule}
                onClose={handleClose}
            />
        </AppDrawer>
    );
};
