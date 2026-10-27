import {
    ActionIcon,
    Alert,
    Button,
    FileButton,
    Group,
    Stack,
    Text,
    Textarea,
} from '@mantine/core';
import { InfoCircle, Redo, Trash, Undo } from 'iconoir-react';
import {
    type ChangeEventHandler,
    type MouseEventHandler,
    type ReactElement,
    type SubmitEventHandler,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from '~hooks/use-history';
import { mealImportResponseSchema } from '~schemas/meal-import';

import { FileActions } from './file-actions';
import { useCreateMealPool } from './hooks/use-create-meal-pool';
import { useUpload } from './hooks/use-upload';

type FileUploadTabProps = Readonly<{ onDone: () => void }>;

export const FileUploadTab = ({ onDone }: FileUploadTabProps): ReactElement => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const resetRef = useRef<() => void>(null);
    const {
        canRedo,
        canUndo,
        clear: clearHistory,
        currentState,
        redo: handleRedo,
        set,
        undo: handleUndo,
    } = useHistory<string[]>();

    const {
        mutate,
        isPending: isUploading,
        isSuccess,
        reset: resetUpload,
    } = useUpload({
        onSuccess: (data) => {
            set(data.data);
        },
    });

    const { mutate: createMealPool, isPending: isCreating } = useCreateMealPool(
        { onSuccess: onDone },
    );

    const handleClear = (): void => {
        resetUpload();
        setFile(null);
        clearHistory();
        resetRef.current?.();
    };

    const handleUpload = (): void => {
        mutate({ file });
    };

    const handleSubmit = ((e): void => {
        e.preventDefault();
        const content = mealImportResponseSchema.shape.data.parse(currentState);
        createMealPool({
            templates: content.map((item) => ({
                content: item,
                items: [],
            })),
        });
    }) satisfies SubmitEventHandler<HTMLFormElement>;

    const handleRemoveItem: MouseEventHandler<HTMLButtonElement> = (event) => {
        const itemIndex = Number(event.currentTarget.dataset.itemIndex);
        set((currentState ?? []).filter((_, index) => index !== itemIndex));
    };

    const handleEditItem: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
        const { itemIndex } = event.currentTarget.dataset;
        const { value } = event.currentTarget;
        if (itemIndex !== undefined && currentState) {
            set(
                currentState.map((meal, index) =>
                    index === +itemIndex ? value : meal,
                ),
            );
        }
    };

    return (
        <Stack gap="md">
            <Alert icon={<InfoCircle />} variant="outline">
                {t('file_types_info')}
            </Alert>
            {!isSuccess && (
                <FileButton
                    accept=".docx,.pdf"
                    disabled={isUploading}
                    onChange={setFile}
                    // oxlint-disable-next-line react/jsx-handler-names
                    resetRef={resetRef}
                >
                    {(props) => <Button {...props}>{t('upload.label')}</Button>}
                </FileButton>
            )}
            <FileActions
                file={file}
                isSuccess={isSuccess}
                isUploading={isUploading}
                onClear={handleClear}
                onReset={handleClear}
                onUpload={handleUpload}
            />

            {isSuccess && (
                <>
                    <Group gap="md">
                        <Alert icon={<InfoCircle />} variant="outline">
                            {t('upload.helper')}
                        </Alert>
                        <Button
                            disabled={!canUndo}
                            leftSection={<Undo />}
                            onClick={handleUndo}
                            variant="outline"
                        >
                            {t('generic.actions.undo')}
                        </Button>
                        <Button
                            disabled={!canRedo}
                            leftSection={<Redo />}
                            onClick={handleRedo}
                            variant="outline"
                        >
                            {t('generic.actions.redo')}
                        </Button>
                    </Group>
                    <form onSubmit={handleSubmit}>
                        <Stack gap="sm">
                            <Text fw="var(--mantine-font-weight-medium)">
                                {t('import_success')}
                            </Text>
                            {currentState?.map((result, idx) => (
                                <Group key={idx} gap="sm">
                                    <Textarea
                                        aria-label={t('upload.meal_label', {
                                            index: idx + 1,
                                        })}
                                        autosize
                                        data-item-index={idx}
                                        maxLength={4000}
                                        minRows={1}
                                        name="meal"
                                        onChange={handleEditItem}
                                        style={{ flexGrow: 1 }}
                                        value={result}
                                    />

                                    <ActionIcon
                                        aria-label={t('upload.remove_meal', {
                                            index: idx + 1,
                                        })}
                                        color="danger"
                                        data-item-index={idx}
                                        onClick={handleRemoveItem}
                                        variant="outline"
                                    >
                                        <Trash />
                                    </ActionIcon>
                                </Group>
                            ))}
                            <Button
                                disabled={
                                    !currentState?.length ||
                                    currentState.some((meal) => !meal.trim())
                                }
                                loading={isCreating}
                                type="submit"
                            >
                                {t('create')}
                            </Button>
                        </Stack>
                    </form>
                </>
            )}
        </Stack>
    );
};
