import {
    ActionIcon,
    type ActionIconProps,
    Overlay,
    Tooltip,
} from '@mantine/core';
import { EditPencil, Notes, ThreeStars } from 'iconoir-react';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CopyButton } from '~components/copy-button';
import {
    type EditedMeal,
    type EditedMealItem,
    type Meal,
    type MealChange,
} from '~types/meal';
import { useOpenContextModal } from '~util/modal';

import { MEAL_MODAL_OPTIONS } from '../../modals/meal/meal-modal-options';
import styles from './cell.module.css';

type CellOverlayProps = Readonly<{
    canEditAnnotations?: boolean;
    onDelete: () => Promise<void> | void;
    onSave: (value: MealChange) => Promise<void> | void;
    meal?: Meal | EditedMeal;
    ownerUserId?: number;
}>;

const isSavedMeal = (meal?: Meal | EditedMeal): meal is Meal => {
    return meal?.id !== undefined;
};

const isFilledMeal = (meal?: Meal | EditedMeal): meal is Meal => {
    return Boolean(meal?.meal);
};

const commonButtonProps: ActionIconProps = {
    radius: 'xl',
    size: 36,
    variant: 'outline',
};

const tooltipEvents = { focus: true, hover: true, touch: false };

const FanAction = ({
    children,
    label,
    onClick,
}: Readonly<{
    children: ReactNode;
    label: string;
    onClick: () => void;
}>): ReactElement => (
    <div className={styles.fanItem}>
        <Tooltip events={tooltipEvents} withArrow label={label} position="top">
            <ActionIcon
                {...commonButtonProps}
                aria-label={label}
                onClick={onClick}
            >
                {children}
            </ActionIcon>
        </Tooltip>
    </div>
);

export const CellOverlay = ({
    canEditAnnotations = true,
    onDelete,
    onSave,
    meal,
    ownerUserId,
}: CellOverlayProps): ReactElement => {
    const { t } = useTranslation();
    const openEditMealModal = useOpenContextModal('meal');
    const openMealNoteModal = useOpenContextModal('meal-note');
    const openMealRatingModal = useOpenContextModal('meal-rating');

    const isMealSaved = isSavedMeal(meal);
    const isMealFilled = isFilledMeal(meal);

    const handleMealSave = async (
        value: string,
        items: EditedMealItem[],
    ): Promise<void> => {
        await onSave({ ...meal, items, meal: value });
    };

    const handleMealNoteSave = async (note: string): Promise<void> => {
        await onSave({ ...meal, note });
    };

    const handleMealNoteDelete = async (): Promise<void> => {
        await onSave({ ...meal, note: null });
    };

    const handleMealRatingSave = async (rating: number): Promise<void> => {
        await onSave({ ...meal, rating });
    };

    const handleMealRatingDelete = async (): Promise<void> => {
        await onSave({ ...meal, rating: null });
    };

    const handleEditClick = (): void => {
        openEditMealModal({
            ...MEAL_MODAL_OPTIONS,
            innerProps: {
                initialItems: meal?.items ?? [],
                initialMeal: meal?.meal ?? '',
                onDelete,
                onSave: handleMealSave,
                ownerUserId,
            },
            title: t('edit_meal'),
        });
    };

    const handleNoteClick = (): void => {
        if (!isMealSaved) {
            return;
        }

        openMealNoteModal({
            centered: true,
            innerProps: {
                meal,
                onDelete: handleMealNoteDelete,
                onSave: handleMealNoteSave,
            },
            title: t('notes'),
        });
    };

    const handleRateClick = (): void => {
        if (!isMealSaved) {
            return;
        }

        openMealRatingModal({
            centered: true,
            innerProps: {
                meal,
                onDelete: handleMealRatingDelete,
                onSave: handleMealRatingSave,
            },
            title: t('modals.meal_rate.title'),
        });
    };

    const editLabel = isMealFilled
        ? t('generic.actions.edit')
        : t('meal_plan.plan_meal');

    return (
        <Overlay className={styles.overlay}>
            <div className={styles.overlayContent}>
                <div className={styles.fan}>
                    <div aria-hidden className={styles.fanSurface} />
                    <FanAction label={editLabel} onClick={handleEditClick}>
                        <EditPencil />
                    </FanAction>
                    {isMealSaved && canEditAnnotations && (
                        <>
                            <FanAction
                                label={t('tooltip.edit_note')}
                                onClick={handleNoteClick}
                            >
                                <Notes />
                            </FanAction>
                            <FanAction
                                label={t('tooltip.rate')}
                                onClick={handleRateClick}
                            >
                                <ThreeStars />
                            </FanAction>
                        </>
                    )}
                    {isMealFilled && (
                        <div className={styles.fanItem}>
                            <CopyButton
                                radius="xl"
                                size={36}
                                tooltipPosition="top"
                                value={meal.meal}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Overlay>
    );
};
