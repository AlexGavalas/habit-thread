import { ActionIcon, Text } from '@mantine/core';
import { Drag, Xmark } from 'iconoir-react';
import { useRef, useState, type DragEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useMeals } from '~store/hooks';

import { Cell, type CellProps } from './cell/cell';
import { useMealSwap } from './meal-swap-board';
import styles from './meal-swap.module.css';

type SwappableMealProps = CellProps &
    Readonly<{
        day: string;
        label: string;
        slotLabel: string;
        time: string;
    }>;

export const SwappableMeal = ({
    day,
    label,
    slotLabel,
    time,
    ...props
}: SwappableMealProps): ReactElement => {
    const { t } = useTranslation();
    const swap = useMealSwap();
    const { pendingSlots } = useMeals();
    const isSaving = pendingSlots.includes(props.id);
    const ref = useRef<HTMLDivElement>(null);
    const [isOver, setIsOver] = useState(false);
    const slot = { day, sectionKey: props.id };
    const selected = swap?.selection?.slot.sectionKey === props.id;
    const isTarget = Boolean(swap?.selection && !selected && !isSaving);
    const targetLabel = props.meal?.meal
        ? t('meal_plan.swap.swap_here', { meal: props.meal.meal, slot: label })
        : t('meal_plan.swap.move_here', { slot: label });

    const handleDragStart = (event: DragEvent<HTMLButtonElement>): void => {
        // Embla cancels bubbling native dragstart events to implement swiping.
        // Capture the handle's drag before it reaches the carousel viewport.
        event.stopPropagation();
        if (!props.meal?.meal || isSaving) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', props.meal.meal);
        if (ref.current) {
            event.dataTransfer.setDragImage(ref.current, 24, 24);
        }
        swap?.select({ dragging: true, name: props.meal.meal, slot });
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
        if (!isTarget || !swap?.selection?.dragging) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setIsOver(false);
        if (isTarget && swap?.selection?.dragging) {
            swap.complete(slot);
        }
    };

    const handleSelect = (): void => {
        if (selected) {
            swap?.cancel();
            return;
        }
        if (props.meal?.meal && !isSaving) {
            swap?.select({ dragging: false, name: props.meal.meal, slot });
        }
    };

    const handleComplete = (): void => {
        swap?.complete(slot);
    };
    const handleCancel = (): void => {
        setIsOver(false);
        swap?.cancel();
    };
    const handleDragLeave = (): void => {
        setIsOver(false);
    };

    return (
        <div
            ref={ref}
            className={styles.meal}
            data-meal-slot={props.id}
            data-selected={selected || undefined}
            data-over={(isTarget && isOver) || undefined}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={styles.header}>
                <Text className={styles.slotLabel} fw={600} size="sm">
                    {slotLabel}
                </Text>
                <div className={styles.headerActions}>
                    {swap && props.meal?.meal && (
                        <ActionIcon
                            aria-hidden={isTarget}
                            aria-label={t('meal_plan.swap.select', {
                                meal: props.meal.meal,
                                slot: label,
                            })}
                            aria-pressed={selected}
                            className={styles.handle}
                            data-meal-drag-handle
                            data-unavailable={isTarget || undefined}
                            disabled={isTarget || isSaving}
                            draggable={!isSaving}
                            onClick={handleSelect}
                            onDragStartCapture={handleDragStart}
                            onDragEnd={handleCancel}
                            size={28}
                            title={t('meal_plan.swap.handle_hint')}
                            variant={selected ? 'filled' : 'default'}
                        >
                            {selected ? (
                                <Xmark width={18} height={18} />
                            ) : (
                                <Drag width={18} height={18} />
                            )}
                        </ActionIcon>
                    )}
                    <Text c="dimmed" component="time" dateTime={time} size="xs">
                        {time}
                    </Text>
                </div>
            </div>
            <div className={styles.body} data-meal-body>
                <div inert={Boolean(swap?.selection)}>
                    <Cell {...props} />
                </div>
                {isTarget && (
                    <button
                        aria-label={targetLabel}
                        className={styles.target}
                        onClick={handleComplete}
                        title={targetLabel}
                        type="button"
                    >
                        <span>
                            {props.meal?.meal
                                ? t('meal_plan.swap.swap')
                                : t('meal_plan.swap.move')}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};
