import {
    type UseMutationResult,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { type EditedMealItem } from '~types/meal';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';

type CreateMealPoolProps = {
    templates: { content: string; id?: number; items: EditedMealItem[] }[];
};

type UseCreateMealPool = (params?: {
    onSuccess?: () => void;
}) => UseMutationResult<unknown, unknown, CreateMealPoolProps>;

export const useCreateMealPool: UseCreateMealPool = ({ onSuccess } = {}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ templates }): Promise<void> => {
            if (!templates.length) {
                throw new Error(t('errors.preview_empty'));
            }

            const response = await fetch('/api/v1/pool/meal', {
                body: JSON.stringify({ templates }),
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Could not save meal template');
            }
        },
        onError: () => {
            showErrorNotification({
                message: t('notification.error.message'),
                position: 'top-right',
                title: t('notification.error.title'),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['pool-meal'] });
            showSuccessNotification({
                message: t('notification.success.message'),
                title: t('notification.success.title'),
            });
            onSuccess?.();
        },
        retry: false,
    });
};
