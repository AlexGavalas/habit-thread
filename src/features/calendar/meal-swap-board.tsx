import { Button, Group, Text } from '@mantine/core';
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type PropsWithChildren,
    type ReactElement,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useMeals } from '~store/hooks';
import { type MealSlot } from '~store/hooks/meal-operations';
import { type WeeklyMealZone } from '~types/meal-zone';

import styles from './meal-swap.module.css';

type Selection = Readonly<{ slot: MealSlot; name: string; dragging: boolean }>;
type MealSwapContextValue = {
    selection: Selection | null;
    select: (selection: Selection) => void;
    complete: (destination: MealSlot) => void;
    cancel: () => void;
};

const MealSwapContext = createContext<MealSwapContextValue | null>(null);

export const useMealSwap = (): MealSwapContextValue | null =>
    useContext(MealSwapContext);

type MealSwapBoardProps = PropsWithChildren<
    Readonly<{
        zones: WeeklyMealZone[];
    }>
>;

export const MealSwapBoard = ({
    children,
    zones,
}: MealSwapBoardProps): ReactElement => {
    const { t } = useTranslation();
    const { swapEntries } = useMeals();
    const [selection, setSelection] = useState<Selection | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const handleCancel = (): void => {
        setSelection(null);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setSelection(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return (): void => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const complete = (destination: MealSlot): void => {
        if (
            !selection ||
            !zones.some(
                (zone) =>
                    zone.zoneKey === destination.sectionKey &&
                    zone.day === destination.day,
            )
        ) {
            return;
        }
        void swapEntries(selection.slot, destination).then(
            () => {
                setAnnouncement('');
            },
            () => {
                setAnnouncement(t('errors.meal_save'));
            },
        );
        handleCancel();
    };

    const select = (next: Selection): void => {
        setAnnouncement('');
        setSelection(next);
    };

    const instructionMessage = selection
        ? t('meal_plan.swap.choose', { meal: selection.name })
        : announcement || t('meal_plan.swap.hint');

    return (
        <MealSwapContext.Provider
            value={{ cancel: handleCancel, complete, select, selection }}
        >
            <div className={styles.board}>
                <Group
                    className={styles.instructions}
                    justify="space-between"
                    wrap="nowrap"
                >
                    <Text
                        aria-live="polite"
                        className={styles.instructionText}
                        role="status"
                        size="sm"
                        c="dimmed"
                        title={instructionMessage}
                    >
                        {instructionMessage}
                    </Text>
                    <Button
                        aria-hidden={!selection}
                        className={styles.cancel}
                        data-active={Boolean(selection) || undefined}
                        disabled={!selection}
                        size="compact-xs"
                        tabIndex={selection ? 0 : -1}
                        variant="subtle"
                        onClick={handleCancel}
                    >
                        {t('generic.actions.cancel')}
                    </Button>
                </Group>
                {children}
            </div>
        </MealSwapContext.Provider>
    );
};
