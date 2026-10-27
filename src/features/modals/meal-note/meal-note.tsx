import { Button, Group, Stack, Textarea } from '@mantine/core';
import { type ContextModalProps } from '@mantine/modals';
import type { ReactElement } from 'react';
import {
    type MouseEventHandler,
    type SubmitEventHandler,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { type Meal } from '~types/meal';

import { useEditorSubmit } from '../use-editor-submit';

type MealNoteModalProps = Readonly<{
    meal: Meal;
    onSave: (meal: string) => Promise<void>;
    onDelete: () => Promise<void>;
}>;

const NOTE_FIELD_NAME = 'note';

const formSchema = z.object({
    note: z.string(),
});

export const MealNoteModal = ({
    context,
    id,
    innerProps: { meal, onSave, onDelete },
}: ContextModalProps<MealNoteModalProps>): ReactElement => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const submission = useEditorSubmit(id);

    const closeModal = (): void => {
        context.closeContextModal(id);
    };

    const resetError = (): void => {
        setError('');
    };

    const handleSubmit = (async (e): Promise<void> => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(e.currentTarget));

        const { note } = formSchema.parse(formData);

        if (!note) {
            setError(t('errors.note_empty'));
            return;
        }

        if (await submission.submit(() => onSave(note))) {
            closeModal();
        }
    }) satisfies SubmitEventHandler<HTMLFormElement>;

    const handleDelete = (async (): Promise<void> => {
        if (await submission.submit(onDelete)) {
            closeModal();
        }
    }) satisfies MouseEventHandler<HTMLButtonElement>;

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="sm">
                <Textarea
                    autosize
                    defaultValue={meal.note ?? ''}
                    error={error || submission.error}
                    disabled={submission.isSaving}
                    label={t('modals.meal_note.label')}
                    maxRows={20}
                    minRows={5}
                    name={NOTE_FIELD_NAME}
                    onFocus={resetError}
                    placeholder={t('modals.meal_note.placeholder')}
                />

                <Group justify="space-between">
                    <Button
                        disabled={submission.isSaving}
                        color="danger"
                        onClick={closeModal}
                        variant="light"
                    >
                        {t('generic.actions.cancel')}
                    </Button>
                    <Group gap="md">
                        {meal.note && (
                            <Button
                                disabled={submission.isSaving}
                                color="danger"
                                onClick={handleDelete}
                            >
                                {t('generic.actions.delete')}
                            </Button>
                        )}
                        <Button loading={submission.isSaving} type="submit">
                            {t('generic.actions.save')}
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </form>
    );
};
