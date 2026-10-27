import { modals } from '@mantine/modals';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type z } from 'zod';

import { type patchRequestSchema as activitySchema } from '~schemas/activity';
import { type patchRequestSchema as measurementSchema } from '~schemas/measurement';
import { showErrorNotification } from '~util/notification';

type TrackingWrite =
    | {
          resource: 'activity';
          data: z.infer<typeof activitySchema>;
          id?: string;
      }
    | {
          resource: 'measurement';
          data: z.infer<typeof measurementSchema>;
          id?: string;
      };

export const useTrackingMutation = (
    modalId: string,
    onSaved: () => Promise<void>,
): UseMutationResult<undefined, Error, TrackingWrite> => {
    const { t } = useTranslation();
    const mutation = useMutation<undefined, Error, TrackingWrite>({
        mutationFn: async ({ resource, data, id }) => {
            const response = await fetch(
                `/api/v1/${resource}${id ? `?id=${encodeURIComponent(id)}` : ''}`,
                {
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' },
                    method: id ? 'PATCH' : 'POST',
                },
            );
            if (!response.ok) {
                throw new Error('Could not save tracking entry');
            }
        },
        onError: (_error, { resource }) => {
            showErrorNotification({
                message: `${t(resource === 'activity' ? 'errors.activity_save' : 'errors.measurement_save')}. ${t('try_again')}`,
                title: t('notification.error.title'),
            });
        },
        onSuccess: onSaved,
        retry: false,
    });
    useEffect(() => {
        modals.updateContextModal({
            closeButtonProps: { disabled: mutation.isPending },
            closeOnClickOutside: !mutation.isPending,
            closeOnEscape: !mutation.isPending,
            modalId,
        });
    }, [modalId, mutation.isPending]);
    return mutation;
};
