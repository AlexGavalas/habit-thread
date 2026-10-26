import { ActionIcon, NumberInput, Paper, Stack, Text } from '@mantine/core';
import { Trash } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditedMealItem } from '~types/meal';
import { scaleNutrition, totalNutrition } from '~util/nutrition';

import styles from './meal-item.module.css';

type MealItemsEditorProps = Readonly<{
    items: EditedMealItem[];
    onItemsChange: (items: EditedMealItem[]) => void;
    recentlyAddedIndex?: number | null;
    scrollable?: boolean;
}>;

type MealItemRowProps = Readonly<
    MealItemsEditorProps & { index: number; item: EditedMealItem }
>;

const MealItemRow = ({
    index,
    item,
    items,
    onItemsChange,
    recentlyAddedIndex,
}: MealItemRowProps): ReactElement => {
    const { i18n, t } = useTranslation();
    const format = new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 1,
    });
    const nutrition = scaleNutrition(item);
    const value = (amount: number | null): string =>
        amount === null ? '—' : `${format.format(amount)} g`;
    const handleQuantityChange = (value: number | string): void => {
        const quantity = Number(value);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return;
        }
        onItemsChange(
            items.map((candidate, candidateIndex) =>
                candidateIndex === index
                    ? { ...candidate, quantity_grams: quantity }
                    : candidate,
            ),
        );
    };
    const handleDelete = (): void => {
        onItemsChange(
            items
                .filter((_, candidateIndex) => candidateIndex !== index)
                .map((candidate, position) => ({
                    ...candidate,
                    position,
                })),
        );
    };

    return (
        <div
            className={styles.item}
            data-recently-added={recentlyAddedIndex === index || undefined}
        >
            <div className={styles.nutrition}>
                <Text fw={600} size="sm">
                    {[item.brand, item.name].filter(Boolean).join(' · ')}
                </Text>
                <Text c="dimmed" size="xs">
                    {item.source === 'bls' ? 'BLS 4.0' : 'Open Food Facts'}
                </Text>
                <Text c="dimmed" size="xs">
                    {nutrition.calories === null
                        ? '—'
                        : `${format.format(nutrition.calories)} kcal`}{' '}
                    · P {value(nutrition.protein)} · C{' '}
                    {value(nutrition.carbohydrates)} · F {value(nutrition.fat)}
                </Text>
                <Text c="dimmed" size="xs">
                    {t('nutrition.fiber')} {value(nutrition.fiber)} ·{' '}
                    {t('nutrition.sugar')} {value(nutrition.sugar)} ·{' '}
                    {t('nutrition.salt')} {value(nutrition.salt)}
                </Text>
            </div>
            <NumberInput
                allowDecimal
                allowNegative={false}
                aria-label={t('modals.meal_edit.items.quantity', {
                    item: item.name,
                })}
                className={styles.quantity}
                min={1}
                onChange={handleQuantityChange}
                suffix=" g"
                value={item.quantity_grams}
            />
            <ActionIcon
                aria-label={t('modals.meal_edit.items.remove', {
                    item: item.name,
                })}
                className={styles.delete}
                color="danger"
                onClick={handleDelete}
                variant="subtle"
            >
                <Trash />
            </ActionIcon>
        </div>
    );
};

export const MealItemsEditor = ({
    items,
    onItemsChange,
    recentlyAddedIndex,
    scrollable = false,
}: MealItemsEditorProps): ReactElement => {
    const { i18n, t } = useTranslation();
    const format = new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 1,
    });
    const totals = totalNutrition(items);

    return (
        <Stack className={scrollable ? styles.editor : undefined} gap={0}>
            <div className={scrollable ? styles.itemList : undefined}>
                {items.length === 0 && (
                    <Text c="dimmed" py="sm" size="sm">
                        {t('modals.meal_edit.items.empty')}
                    </Text>
                )}
                {items.map((item, index) => (
                    <MealItemRow
                        index={index}
                        item={item}
                        items={items}
                        key={`${item.source}:${item.provider_food_id}:${index}`}
                        onItemsChange={onItemsChange}
                        recentlyAddedIndex={recentlyAddedIndex}
                    />
                ))}
            </div>
            {items.length > 0 && (
                <Paper className={styles.total} mt="sm" p="sm">
                    <Text fw={600} mb={4} size="sm">
                        {t('nutrition.meal_total')}
                    </Text>
                    <Text size="sm">
                        {totals.calories === null
                            ? t('nutrition.incomplete')
                            : `${format.format(totals.calories)} kcal`}{' '}
                        · P{' '}
                        {totals.protein === null
                            ? '—'
                            : `${format.format(totals.protein)} g`}
                        {' · '}C{' '}
                        {totals.carbohydrates === null
                            ? '—'
                            : `${format.format(totals.carbohydrates)} g`}
                        {' · '}F{' '}
                        {totals.fat === null
                            ? '—'
                            : `${format.format(totals.fat)} g`}
                    </Text>
                    <Text c="dimmed" size="xs">
                        {t('nutrition.fiber')}{' '}
                        {totals.fiber === null
                            ? '—'
                            : `${format.format(totals.fiber)} g`}
                        {' · '}
                        {t('nutrition.sugar')}{' '}
                        {totals.sugar === null
                            ? '—'
                            : `${format.format(totals.sugar)} g`}
                        {' · '}
                        {t('nutrition.salt')}{' '}
                        {totals.salt === null
                            ? '—'
                            : `${format.format(totals.salt)} g`}
                    </Text>
                </Paper>
            )}
        </Stack>
    );
};
