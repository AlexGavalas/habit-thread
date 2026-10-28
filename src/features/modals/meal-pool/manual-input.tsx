import { Button, Group, Paper, Stack, Text, Textarea } from '@mantine/core';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditedMealItem } from '~types/meal';
import { type MealTemplate } from '~types/meal-pool';

import { MealItemsEditor } from '../meal/meal-items-editor';
import { useCreateMealPool } from './hooks/use-create-meal-pool';
import { MealLibraryPanel } from './meal-library-panel';
import { PreviousMealPicker, ReplaceMealDraft } from './previous-meal-picker';

type ManualInputTabProps = Readonly<{
    onDone: () => void;
}>;

type MealDraft = {
    content: string;
    items: EditedMealItem[];
    source?: MealTemplate;
};

export const ManualInputTab = ({
    onDone,
}: ManualInputTabProps): ReactElement => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<MealDraft>({ content: '', items: [] });
    const [previousDraft, setPreviousDraft] = useState<MealDraft>();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingTemplate, setPendingTemplate] = useState<MealTemplate>();
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const { mutate, isPending, error, reset } = useCreateMealPool({
        onSuccess: onDone,
    });

    // Templates are unique by description. Reusing the source description would
    // upsert its items, even without an id, rather than preserve the original.
    const sourceDescriptionUnchanged =
        draft.source !== undefined &&
        draft.content.trim() === draft.source.content.trim();

    const handleApplyTemplate = (template: MealTemplate): void => {
        setPreviousDraft(draft);
        setDraft({
            content: template.content,
            items: template.items.map(({ id: _id, ...item }) => item),
            source: template,
        });
        setPendingTemplate(undefined);
        setPickerOpen(false);
        reset();
        descriptionRef.current?.focus();
    };

    const handleSelectTemplate = (template: MealTemplate): void => {
        if (draft.content.trim() || draft.items.length) {
            setPendingTemplate(template);
            return;
        }
        handleApplyTemplate(template);
    };

    const handleUndoSelection = (): void => {
        if (!previousDraft) {
            return;
        }
        setDraft(previousDraft);
        setPreviousDraft(undefined);
        reset();
        descriptionRef.current?.focus();
    };

    const handleSaveMeal = (): void => {
        if (!draft.content.trim() || sourceDescriptionUnchanged || isPending) {
            return;
        }
        mutate({
            templates: [{ content: draft.content.trim(), items: draft.items }],
        });
    };

    const handleDescriptionChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ): void => {
        setDraft({ ...draft, content: event.target.value });
        reset();
    };

    const handleTogglePicker = (): void => {
        setPickerOpen(!pickerOpen);
        setPendingTemplate(undefined);
    };

    const handleCancelReplacement = (): void => {
        setPendingTemplate(undefined);
    };
    const handleConfirmReplacement = (): void => {
        if (pendingTemplate) {
            handleApplyTemplate(pendingTemplate);
        }
    };
    const handleItemsChange = (items: EditedMealItem[]): void => {
        setDraft({ ...draft, items });
    };
    return (
        <MealLibraryPanel
            actions={
                <Group gap="sm" justify="end">
                    {pendingTemplate && (
                        <ReplaceMealDraft
                            meal={pendingTemplate.content}
                            onCancel={handleCancelReplacement}
                            onConfirm={handleConfirmReplacement}
                        />
                    )}
                    {draft.source && previousDraft && (
                        <Button
                            variant="subtle"
                            disabled={isPending}
                            onClick={handleUndoSelection}
                        >
                            {t('modals.meal_pool.manual.undo')}
                        </Button>
                    )}
                    <Button
                        variant="default"
                        disabled={isPending}
                        onClick={onDone}
                    >
                        {t('generic.actions.cancel')}
                    </Button>
                    <Button
                        disabled={
                            !draft.content.trim() || sourceDescriptionUnchanged
                        }
                        loading={isPending}
                        onClick={handleSaveMeal}
                    >
                        {t('modals.meal_pool.manual.save')}
                    </Button>
                </Group>
            }
        >
            <Stack gap="md" inert={isPending}>
                <Textarea
                    ref={descriptionRef}
                    autosize
                    required
                    label={t('modals.meal_pool.manual.description')}
                    placeholder={t('modals.meal_pool.manual.placeholder')}
                    error={error instanceof Error ? error.message : undefined}
                    minRows={4}
                    onChange={handleDescriptionChange}
                    value={draft.content}
                />
                {draft.source && (
                    <Paper withBorder p="sm" radius="md">
                        <Stack gap="xs">
                            <Text size="sm">
                                {t('modals.meal_pool.manual.started_from', {
                                    meal: draft.source.content,
                                })}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {t('modals.meal_pool.manual.copy_hint')}
                            </Text>
                        </Stack>
                    </Paper>
                )}
                {draft.items.length > 0 && (
                    <MealItemsEditor
                        items={draft.items}
                        onItemsChange={handleItemsChange}
                    />
                )}
                <Button
                    variant="light"
                    w="fit-content"
                    disabled={isPending}
                    aria-expanded={pickerOpen}
                    aria-controls="previous-meal-picker"
                    onClick={handleTogglePicker}
                >
                    {t('modals.meal_pool.manual.use_previous')}
                </Button>
                {pickerOpen && !pendingTemplate && (
                    <Paper
                        id="previous-meal-picker"
                        withBorder
                        p="md"
                        radius="md"
                    >
                        <PreviousMealPicker onSelect={handleSelectTemplate} />
                    </Paper>
                )}
            </Stack>
        </MealLibraryPanel>
    );
};
