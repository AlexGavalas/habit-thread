'use client';

import { Center, Loader } from '@mantine/core';
import { ModalsProvider, useModals } from '@mantine/modals';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import { type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
    OverlayEscapeProvider,
    getOverlayZIndex,
    overlayLayersAtom,
    useOverlayLayer,
} from '~components/overlays/overlay-stack';

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

const ManagedModalLayer = (): null => {
    const context = useModals();
    const current = context.modals.at(-1);
    useOverlayLayer({
        activeKey: current?.id,
        closeOnEscape: current?.props.closeOnEscape ?? true,
        kind: 'managed',
        onClose: () => {
            if (current) {
                context.closeModal(current.id);
            }
        },
        opened: Boolean(current),
        returnFocus: current?.props.returnFocus ?? true,
    });
    return null;
};

const ContextModals = ({
    children,
}: ContextModalsProviderProps): ReactElement => {
    const { t } = useTranslation();
    const layers = useAtomValue(overlayLayersAtom);
    const managedIndex = layers.findIndex((layer) => layer.kind === 'managed');
    const modalProps = {
        closeButtonProps: { 'aria-label': t('generic.actions.close') },
        returnFocus: false,
        trapFocus: managedIndex < 0 || managedIndex === layers.length - 1,
        zIndex: getOverlayZIndex(managedIndex),
    };
    return (
        // @ts-expect-error -- Dynamic modal components lose their specific props.
        <ModalsProvider modals={modals} modalProps={modalProps}>
            <ManagedModalLayer />
            {children}
        </ModalsProvider>
    );
};

export const ContextModalsProvider = ({
    children,
}: ContextModalsProviderProps): ReactElement => (
    <OverlayEscapeProvider>
        <ContextModals>{children}</ContextModals>
    </OverlayEscapeProvider>
);

declare module '@mantine/modals' {
    // oxlint-disable-next-line typescript/consistent-type-definitions -- Mantine requires module augmentation.
    interface MantineModalsOverride {
        modals: typeof modals;
    }
}
