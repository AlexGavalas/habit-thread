import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { profileResponseSchema } from '~schemas/user';
import { type UserProfile } from '~types/user';
import { requireActionSuccess } from '~util/action-result';
import {
    showErrorNotification,
    showSuccessNotification,
} from '~util/notification';
import { getProfileQueryKey } from '~util/query-keys';

import { saveProfile } from '../app/actions';
import { useUser } from './use-user';

type MutationProps = {
    isDiscoverable?: boolean;
    height?: number;
    targetWeight?: number;
    language?: string;
    hasCompletedOnboarding?: boolean;
    silent?: boolean;
};

type UseProfile = () => {
    profile?: UserProfile;
    isFetching: boolean;
    updateProfile: (params: MutationProps) => void;
    user: Session['user'];
    deleteProfile: () => void;
    isDeleting: boolean;
};

export const useProfile: UseProfile = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { isLoading, user } = useUser();

    const { data: profile, isFetching } = useQuery({
        enabled: Boolean(user),
        queryFn: async ({ signal }): Promise<UserProfile> => {
            const response = await fetch('/api/v1/user', { signal });
            if (!response.ok) {
                throw new Error('Could not fetch user profile');
            }
            return profileResponseSchema.parse(await response.json()).data;
        },
        queryKey: getProfileQueryKey(user?.email),
    });

    const { mutate: updateProfile } = useMutation({
        mutationFn: async ({
            isDiscoverable,
            height,
            targetWeight,
            language,
            hasCompletedOnboarding,
        }: MutationProps): Promise<void> => {
            const response = await saveProfile({
                hasCompletedOnboarding,
                height,
                isDiscoverable,
                language,
                targetWeight,
            });
            requireActionSuccess(response);
        },
        onError: (): void => {
            showErrorNotification({
                message: t('notification.error.message'),
                title: t('notification.error.title'),
            });
        },
        onSuccess: async (_, { language, silent }): Promise<void> => {
            if (!silent) {
                showSuccessNotification({
                    message: t('notification.success.message', {
                        lng: language,
                    }),
                    title: t('notification.success.title', {
                        lng: language,
                    }),
                });
            }

            await queryClient.invalidateQueries({
                queryKey: getProfileQueryKey(user?.email),
            });
        },
    });

    const { mutate: deleteProfile, isPending: isDeleting } = useMutation({
        mutationFn: async (): Promise<void> => {
            const response = await fetch('/api/v1/user', {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Could not delete profile');
            }
        },
        onError: (): void => {
            showErrorNotification({
                message: t('notification.error.message'),
                title: t('notification.error.title'),
            });
        },
        onSuccess: async (): Promise<void> => {
            showSuccessNotification({
                message: t('notification.success.message'),
                title: t('notification.success.title'),
            });

            queryClient.clear();

            await signOut();

            router.push('/');
            router.refresh();
        },
    });

    return {
        deleteProfile,
        isDeleting,
        isFetching: isLoading || isFetching,
        profile,
        updateProfile,
        user,
    };
};
