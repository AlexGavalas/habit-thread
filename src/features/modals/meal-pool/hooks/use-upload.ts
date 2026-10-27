import { type UseMutationResult, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import {
    MAX_IMPORT_FILE_SIZE,
    mealImportErrorSchema,
    mealImportResponseSchema,
} from '~schemas/meal-import';
import { showErrorNotification } from '~util/notification';

type UseUploadProps = {
    file: File | null;
};

type UseUploadResponse = z.infer<typeof mealImportResponseSchema>;

type UseUpload = (params: {
    onSuccess: (data: UseUploadResponse) => void;
}) => UseMutationResult<UseUploadResponse, Error, UseUploadProps>;

export const useUpload: UseUpload = ({ onSuccess }) => {
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ file }): Promise<UseUploadResponse> => {
            if (!file) {
                throw new Error(t('errors.no_file'));
            }
            if (file.size > MAX_IMPORT_FILE_SIZE) {
                throw new Error(t('upload.errors.file_too_large'));
            }

            const body = new FormData();
            body.append('file', file);

            const response = await fetch('/api/v1/pool/upload', {
                body,
                method: 'POST',
            }).catch(() => {
                throw new Error(t('notification.error.message'));
            });

            if (!response.ok) {
                const failure = mealImportErrorSchema.safeParse(
                    await response.json().catch(() => null),
                );
                throw new Error(
                    failure.success
                        ? t(`upload.errors.${failure.data.code}`)
                        : t('notification.error.message'),
                );
            }

            const parsed = mealImportResponseSchema.safeParse(
                await response.json().catch(() => null),
            );
            if (!parsed.success) {
                throw new Error(t('notification.error.message'));
            }
            return parsed.data;
        },
        onError: (error) => {
            showErrorNotification({
                message: error.message,
                title: t('notification.error.title'),
            });
        },
        onSuccess,
    });
};
