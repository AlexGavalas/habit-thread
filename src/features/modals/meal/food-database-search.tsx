import {
    Alert,
    Anchor,
    Button,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import type { ReactElement } from 'react';
import {
    type ChangeEventHandler,
    type KeyboardEventHandler,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
    type FoodSearchCountry,
    type FoodSearchResult,
} from '~types/food-search';
import { type EditedMealItem } from '~types/meal';

import styles from './food-database-search.module.css';
import { FoodResultGroup } from './food-result';
import { isFoodSelected } from './food-selection';
import { useFoodSearch } from './hooks/use-food-search';

type FoodDatabaseSearchProps = Readonly<{
    onSelect: (food: FoodSearchResult) => void;
    selectedItems: readonly EditedMealItem[];
}>;

export const FoodDatabaseSearch = ({
    onSelect: handleSelect,
    selectedItems,
}: FoodDatabaseSearchProps): ReactElement => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    const [country, setCountry] = useState<FoodSearchCountry>('de');
    const { data, error, isFetching } = useFoodSearch({ country, query });

    const handleSearch = (): void => {
        const nextQuery = input.trim();
        if (nextQuery.length >= 2) {
            setQuery(nextQuery);
        }
    };

    const handleInputChange = ((event): void => {
        setInput(event.target.value);
    }) satisfies ChangeEventHandler<HTMLInputElement>;

    const handleInputKeyDown = ((event): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSearch();
        }
    }) satisfies KeyboardEventHandler<HTMLInputElement>;

    const handleCountryChange = (value: string | null): void => {
        setCountry((value ?? 'de') as FoodSearchCountry);
    };

    const hasSearched = query.length >= 2 && !isFetching;
    const isAvailable = (food: FoodSearchResult): boolean =>
        !isFoodSelected(food, selectedItems);
    const bls = (data?.data.bls ?? []).filter(isAvailable);
    const brandedFoods = (data?.data.openFoodFacts ?? []).filter(isAvailable);
    const hasMatches = Boolean(
        data?.data.bls.length || data?.data.openFoodFacts.length,
    );

    return (
        <Stack className={styles.search} gap="sm">
            <Text className={styles.helper} size="sm">
                {t('modals.meal_edit.food_search.helper')}
            </Text>
            <div className={styles.searchControls}>
                <TextInput
                    label={t('modals.meal_edit.food_search.label')}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder={t('modals.meal_edit.food_search.placeholder')}
                    value={input}
                />

                <Select
                    data={[
                        {
                            label: t(
                                'modals.meal_edit.food_search.countries.de',
                            ),
                            value: 'de',
                        },
                        {
                            label: t(
                                'modals.meal_edit.food_search.countries.gr',
                            ),
                            value: 'gr',
                        },
                        {
                            label: t(
                                'modals.meal_edit.food_search.countries.all',
                            ),
                            value: 'all',
                        },
                    ]}
                    label={t('modals.meal_edit.food_search.country')}
                    onChange={handleCountryChange}
                    value={country}
                />

                <Button
                    className={styles.searchButton}
                    disabled={input.trim().length < 2}
                    loading={isFetching}
                    onClick={handleSearch}
                    type="button"
                >
                    {t('modals.meal_edit.food_search.search')}
                </Button>
            </div>

            <div
                aria-label={t('modals.meal_edit.food_search.results')}
                className={styles.results}
                role="region"
                tabIndex={0}
            >
                {error && (
                    <Alert color="red">
                        {t('modals.meal_edit.food_search.error')}
                    </Alert>
                )}
                {data?.warnings.includes('open-food-facts-unavailable') && (
                    <Alert color="yellow">
                        {t('modals.meal_edit.food_search.off_unavailable')}
                    </Alert>
                )}
                {hasSearched &&
                    !error &&
                    bls.length === 0 &&
                    brandedFoods.length === 0 && (
                        <Text c="dimmed" size="sm">
                            {t(
                                hasMatches
                                    ? 'modals.meal_edit.food_search.all_selected'
                                    : 'modals.meal_edit.food_search.no_results',
                            )}
                        </Text>
                    )}

                <FoodResultGroup
                    foods={bls}
                    onSelect={handleSelect}
                    title={t('modals.meal_edit.food_search.bls')}
                />
                <FoodResultGroup
                    foods={brandedFoods}
                    onSelect={handleSelect}
                    title={t('modals.meal_edit.food_search.open_food_facts')}
                />
                <Text c="dimmed" className={styles.credit} size="xs">
                    {t('modals.meal_edit.food_search.per_100g')}{' '}
                    <Anchor
                        href="https://doi.org/10.25826/Data20251217-134202-0"
                        rel="noreferrer"
                        target="_blank"
                    >
                        BLS 4.0
                    </Anchor>{' '}
                    ({t('modals.meal_edit.food_search.bls_credit')}) ·{' '}
                    <Anchor
                        href="https://world.openfoodfacts.org/"
                        rel="noreferrer"
                        target="_blank"
                    >
                        Open Food Facts
                    </Anchor>{' '}
                    ({t('modals.meal_edit.food_search.community_data')})
                </Text>
            </div>
        </Stack>
    );
};
