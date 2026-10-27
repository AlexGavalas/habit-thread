import type { ReactElement } from 'react';
import { type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { useFeatureFlags } from '~features/feature-flags';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { useCurrentWeek, useMeals, useWeeklyScheduleOps } from '~store/hooks';
import { useOpenContextModal } from '~util/modal';

import { MEAL_MODAL_OPTIONS } from '../../modals/meal/meal-modal-options';
import { DesktopControls } from './desktop-controls';
import { MobileControls } from './mobile-controls';

type ControlsProps = Readonly<{
    onEditSchedule: () => void;
    onPrint: MouseEventHandler<HTMLButtonElement>;
}>;

export const Controls = ({
    onEditSchedule,
    onPrint,
}: ControlsProps): ReactElement => {
    const { t } = useTranslation();
    const { isFoodDatabaseSearchEnabled } = useFeatureFlags();
    const ownerUserId = useMealPlanOwnerId();
    const { nextWeek: handleNextWeek, previousWeek: handlePreviousWeek } =
        useCurrentWeek();
    const { copyToNextWeek, isCopyBlocked } = useWeeklyScheduleOps();
    const { isSaving } = useMeals();
    const openMealPoolModal = useOpenContextModal('meal-pool');
    const openWeekOverviewModal = useOpenContextModal('week-overview');

    const toggleWeekOverview = (): void => {
        openWeekOverviewModal({
            innerProps: { ownerUserId },
            size: 'lg',
            title: t('modals.week_overview.title'),
        });
    };

    const handleCopyToNextWeek = async (): Promise<void> => {
        await copyToNextWeek();
    };

    const handleMealCreation = (): void => {
        openMealPoolModal({
            ...(isFoodDatabaseSearchEnabled ? MEAL_MODAL_OPTIONS : {}),
            innerProps: {},
            size: isFoodDatabaseSearchEnabled ? '72rem' : 'lg',
            title: t('modals.meal_pool.title'),
        });
    };

    return (
        <>
            <DesktopControls
                isCopyBlocked={isCopyBlocked}
                isScheduleBlocked={isSaving}
                onCopy={handleCopyToNextWeek}
                onCreateMeal={handleMealCreation}
                onEditSchedule={onEditSchedule}
                onNextWeek={handleNextWeek}
                onOverview={toggleWeekOverview}
                onPreviousWeek={handlePreviousWeek}
                onPrint={onPrint}
            />
            <MobileControls
                isCopyBlocked={isCopyBlocked}
                isScheduleBlocked={isSaving}
                onCopy={handleCopyToNextWeek}
                onCreateMeal={handleMealCreation}
                onEditSchedule={onEditSchedule}
                onNextWeek={handleNextWeek}
                onOverview={toggleWeekOverview}
                onPreviousWeek={handlePreviousWeek}
                onPrint={onPrint}
            />
        </>
    );
};
