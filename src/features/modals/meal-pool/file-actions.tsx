import { Box, Button, Group, Text } from '@mantine/core';
import type { ReactElement } from 'react';
import { type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

type FileActionsProps = Readonly<{
    file: File | null;
    isSuccess: boolean;
    isUploading: boolean;
    onClear: MouseEventHandler<HTMLButtonElement>;
    onReset: MouseEventHandler<HTMLButtonElement>;
    onUpload: MouseEventHandler<HTMLButtonElement>;
}>;

const formatSizeInMB = (size: number): number =>
    +(size / 1024 / 1024).toFixed(2);

export const FileActions = ({
    file,
    isSuccess,
    isUploading,
    onClear,
    onReset,
    onUpload,
}: FileActionsProps): ReactElement => {
    const { t } = useTranslation();

    if (isSuccess) {
        return (
            <Group gap="md">
                <Text>{t('upload.reset_prompt')}</Text>
                <Button
                    disabled={isUploading}
                    onClick={onReset}
                    size="compact-sm"
                >
                    {t('generic.actions.reset')}
                </Button>
            </Group>
        );
    }

    if (!file) {
        return <Text>{t('upload.empty')}</Text>;
    }

    return (
        <Group gap="sm">
            <Box>
                <Text span>{t('upload.prompt')} </Text>
                <Text span fw="var(--mantine-font-weight-bold)">
                    {file.name}{' '}
                </Text>
                <Text span>
                    (
                    {t('upload.file_size', {
                        size: formatSizeInMB(file.size),
                        unit: 'MB',
                    })}
                    )?
                </Text>
            </Box>
            <Button loading={isUploading} onClick={onUpload} size="compact-sm">
                {t('confirmation.yes')}
            </Button>
            <Button
                color="danger"
                disabled={isUploading}
                onClick={onClear}
                size="compact-sm"
                variant="outline"
            >
                {t('generic.actions.clear')}
            </Button>
        </Group>
    );
};
