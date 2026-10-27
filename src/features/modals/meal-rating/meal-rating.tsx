import { Button, Center, Group, Rating, Stack } from '@mantine/core';
import { type ContextModalProps } from '@mantine/modals';
import type { ReactElement } from 'react';
import {
    type MouseEventHandler,
    type SubmitEventHandler,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { type Meal } from '~types/meal';

import { useEditorSubmit } from '../use-editor-submit';

type MealRatingModalProps = Readonly<{
    meal: Meal;
    onSave: (rating: number) => Promise<void>;
    onDelete: () => Promise<void>;
}>;

export const MealRatingModal = ({
    context,
    id,
    innerProps: { meal, onDelete, onSave },
}: ContextModalProps<MealRatingModalProps>): ReactElement => {
    const { t } = useTranslation();
    const [rating, setRating] = useState<number>();
    const submission = useEditorSubmit(id);

    const closeModal = (): void => {
        context.closeContextModal(id);
    };

    const handleSubmit = (async (e): Promise<void> => {
        e.preventDefault();

        if (!rating) {
            return;
        }

        if (await submission.submit(() => onSave(rating))) {
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
            <Stack gap="xl">
                <Center>
                    <Rating
                        defaultValue={Number(meal.rating)}
                        readOnly={submission.isSaving}
                        onChange={setRating}
                    />
                </Center>
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
                        {meal.rating && (
                            <Button
                                disabled={submission.isSaving}
                                color="danger"
                                onClick={handleDelete}
                            >
                                {t('generic.actions.delete')}
                            </Button>
                        )}
                        <Button
                            loading={submission.isSaving}
                            disabled={!rating}
                            type="submit"
                        >
                            {t('generic.actions.save')}
                        </Button>
                    </Group>
                </Group>
                {submission.error && <p role="alert">{submission.error}</p>}
            </Stack>
        </form>
    );
};
