import { Alert, Button, FileButton, Group, Stack } from '@mantine/core';
import { InfoCircle, Redo, Undo } from 'iconoir-react';
import {
    type ChangeEventHandler,
    type MouseEventHandler,
    type ReactElement,
    type SubmitEventHandler,
    useId,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useHistory } from '~hooks/use-history';
import { mealImportResponseSchema } from '~schemas/meal-import';

import { FileActions } from './file-actions';
import { useCreateMealPool } from './hooks/use-create-meal-pool';
import { useUpload } from './hooks/use-upload';
import { ImportedMealsEditor } from './imported-meals-editor';
import { MealLibraryPanel } from './meal-library-panel';

type FileUploadTabProps = Readonly<{ onDone: () => void }>;

export const FileUploadTab = ({ onDone }: FileUploadTabProps): ReactElement => {
    const { t } = useTranslation();
    const formId = useId();
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
        <MealLibraryPanel
            actions={
                <Group gap="sm" justify="end">
                    <Button
                        variant="default"
                        disabled={isUploading || isCreating}
                        onClick={onDone}
                    >
                        {t('generic.actions.cancel')}
                    </Button>
                    {!isSuccess && (
                        <FileButton
                            accept=".docx,.pdf"
                            disabled={isUploading}
                            onChange={setFile}
                            // oxlint-disable-next-line react/jsx-handler-names
                            resetRef={resetRef}
                        >
                            {(props) => (
                                <Button {...props}>{t('upload.label')}</Button>
                            )}
                        </FileButton>
                    )}
                    <FileActions
                        file={file}
                        isSuccess={isSuccess}
                        isUploading={isUploading || isCreating}
                        onClear={handleClear}
                        onReset={handleClear}
                        onUpload={handleUpload}
                    />

                    {isSuccess && (
                        <>
                            <Button
                                disabled={!canUndo || isCreating}
                                leftSection={<Undo />}
                                onClick={handleUndo}
                                variant="outline"
                            >
                                {t('generic.actions.undo')}
                            </Button>
                            <Button
                                disabled={!canRedo || isCreating}
                                leftSection={<Redo />}
                                onClick={handleRedo}
                                variant="outline"
                            >
                                {t('generic.actions.redo')}
                            </Button>
                            <Button
                                disabled={
                                    !currentState?.length ||
                                    currentState.some((meal) => !meal.trim())
                                }
                                form={formId}
                                loading={isCreating}
                                type="submit"
                            >
                                {t('create')}
                            </Button>
                        </>
                    )}
                </Group>
            }
        >
            <Stack gap="md" inert={isCreating}>
                <Alert icon={<InfoCircle />} variant="outline">
                    {t('file_types_info')}
                </Alert>
                {isSuccess && (
                    <>
                        <Alert icon={<InfoCircle />} variant="outline">
                            {t('upload.helper')}
                        </Alert>
                        <form id={formId} onSubmit={handleSubmit}>
                            <ImportedMealsEditor
                                meals={currentState ?? []}
                                onEdit={handleEditItem}
                                onRemove={handleRemoveItem}
                            />
                        </form>
                    </>
                )}
            </Stack>
        </MealLibraryPanel>
    );
};
