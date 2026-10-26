'use client';

import { Center, Loader } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import dynamic from 'next/dynamic';
import { type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const CenterLoader = (): ReactElement => (
    <Center py="md">
        <Loader />
    </Center>
);

export const modals = {
    activity: dynamic(
        () => import('./modals/activity').then((m) => m.ActivityModal),
        { loading: CenterLoader },
    ),
    'delete-account': dynamic(
        () =>
            import('./modals/delete-account').then((m) => m.DeleteAccountModal),
        { loading: CenterLoader },
    ),
    meal: dynamic(() => import('./modals/meal').then((m) => m.MealModal), {
        loading: CenterLoader,
    }),
    'meal-note': dynamic(
        () => import('./modals/meal-note').then((m) => m.MealNoteModal),
        { loading: CenterLoader },
    ),
    'meal-pool': dynamic(
        () => import('./modals/meal-pool').then((m) => m.MealPoolModal),
        { loading: CenterLoader },
    ),
    'meal-rating': dynamic(
        () => import('./modals/meal-rating').then((m) => m.MealRatingModal),
        { loading: CenterLoader },
    ),
    measurement: dynamic(
        () => import('./modals/measurement').then((m) => m.MeasurementModal),
        { loading: CenterLoader },
    ),
    'week-overview': dynamic(
        () => import('./modals/week-overview').then((m) => m.WeekOverviewModal),
        { loading: CenterLoader },
    ),
} as const;

type ContextModalsProviderProps = Readonly<{
    children: ReactNode;
}>;

export const ContextModalsProvider = ({
    children,
}: ContextModalsProviderProps): ReactElement => {
    const { t } = useTranslation();
    const modalProps = {
        closeButtonProps: { 'aria-label': t('generic.actions.close') },
    };
    return (
        // @ts-expect-error -- Dynamic modal components lose their specific props.
        <ModalsProvider modals={modals} modalProps={modalProps}>
            {children}
        </ModalsProvider>
    );
};

declare module '@mantine/modals' {
    // oxlint-disable-next-line typescript/consistent-type-definitions -- Mantine requires module augmentation.
    interface MantineModalsOverride {
        modals: typeof modals;
    }
}
