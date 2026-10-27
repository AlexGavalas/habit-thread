import { Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type MealTemplate } from '~types/meal-pool';

import { useGetMealPool } from './hooks/use-get-meal-pool';

type PreviousMealPickerProps = Readonly<{
    onSelect: (template: MealTemplate) => void;
}>;

type ReplaceMealDraftProps = Readonly<{
    meal: string;
    onCancel: () => void;
    onConfirm: () => void;
}>;

export const ReplaceMealDraft = ({
    meal,
    onCancel,
    onConfirm,
}: ReplaceMealDraftProps): ReactElement => {
    const { t } = useTranslation();
    return (
        <Stack gap="sm">
            <Text fw={600}>{t('modals.meal_pool.manual.replace_title')}</Text>
            <Text size="sm">
                {t('modals.meal_pool.manual.replace_hint', { meal })}
            </Text>
            <Group justify="end">
                <Button variant="default" onClick={onCancel}>
                    {t('modals.meal_pool.manual.keep_draft')}
                </Button>
                <Button onClick={onConfirm}>
                    {t('modals.meal_pool.manual.replace')}
                </Button>
            </Group>
        </Stack>
    );
};

export const PreviousMealPicker = ({
    onSelect,
}: PreviousMealPickerProps): ReactElement => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery] = useDebouncedValue(searchQuery.trim(), 350);
    const {
        data = [],
        isFetching,
        isError,
    } = useGetMealPool({
        searchQuery: debouncedSearchQuery,
    });
    const results = Array.isArray(data) ? data : data.own;
    const searching = isFetching || searchQuery.trim() !== debouncedSearchQuery;

    return (
        <Stack gap="sm">
            <TextInput
                autoFocus
                label={t('modals.meal_pool.manual.search')}
                placeholder={t('generic.search.placeholder')}
                value={searchQuery}
                onChange={(event) => {
                    setSearchQuery(event.target.value);
                }}
            />
            <div aria-live="polite" aria-busy={searching}>
                {!debouncedSearchQuery && !searching && (
                    <Text size="sm" c="dimmed">
                        {t('modals.meal_pool.manual.search_hint')}
                    </Text>
                )}
                {searching && (
                    <Text size="sm" c="dimmed">
                        {t('modals.meal_pool.manual.searching')}
                    </Text>
                )}
                {!searching && isError && (
                    <Text size="sm" role="alert">
                        {t('modals.meal_pool.manual.search_error')}
                    </Text>
                )}
                {!searching &&
                    !isError &&
                    debouncedSearchQuery &&
                    results.length === 0 && (
                        <Text size="sm" c="dimmed">
                            {t('modals.meal_pool.manual.no_results')}
                        </Text>
                    )}
            </div>
            {!searching && !isError && debouncedSearchQuery && (
                <Stack gap="xs">
                    {results.map((template) => (
                        <Paper key={template.id} withBorder p="sm" radius="sm">
                            <Stack gap="xs">
                                <Text size="sm">{template.content}</Text>
                                <Group justify="end">
                                    <Button
                                        variant="light"
                                        size="compact-sm"
                                        onClick={() => {
                                            onSelect(template);
                                        }}
                                    >
                                        {t('modals.meal_pool.manual.use_meal')}
                                    </Button>
                                </Group>
                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            )}
        </Stack>
    );
};
