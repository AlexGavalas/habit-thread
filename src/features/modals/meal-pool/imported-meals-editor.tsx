import { ActionIcon, Group, Stack, Text, Textarea } from '@mantine/core';
import { Trash } from 'iconoir-react';
import type {
    ChangeEventHandler,
    MouseEventHandler,
    ReactElement,
} from 'react';
import { useTranslation } from 'react-i18next';

type ImportedMealsEditorProps = Readonly<{
    meals: string[];
    onEdit: ChangeEventHandler<HTMLTextAreaElement>;
    onRemove: MouseEventHandler<HTMLButtonElement>;
}>;

export const ImportedMealsEditor = ({
    meals,
    onEdit,
    onRemove,
}: ImportedMealsEditorProps): ReactElement => {
    const { t } = useTranslation();
    return (
        <Stack gap="sm">
            <Text fw="var(--mantine-font-weight-medium)">
                {t('import_success')}
            </Text>
            {meals.map((meal, index) => (
                <Group key={index} gap="sm">
                    <Textarea
                        aria-label={t('upload.meal_label', {
                            index: index + 1,
                        })}
                        autosize
                        data-item-index={index}
                        maxLength={4000}
                        minRows={1}
                        name="meal"
                        onChange={onEdit}
                        style={{ flexGrow: 1 }}
                        value={meal}
                    />
                    <ActionIcon
                        aria-label={t('upload.remove_meal', {
                            index: index + 1,
                        })}
                        color="danger"
                        data-item-index={index}
                        onClick={onRemove}
                        variant="outline"
                    >
                        <Trash />
                    </ActionIcon>
                </Group>
            ))}
        </Stack>
    );
};
