'use client';

import {
    Drawer,
    Modal,
    type DrawerProps,
    type ModalProps,
    type ModalRootProps,
} from '@mantine/core';
import type { ReactElement } from 'react';

import { OverlayParentContext, useOverlayLayer } from './overlay-stack';

export const AppDrawer = (props: Readonly<DrawerProps>): ReactElement => {
    const layer = useOverlayLayer(props);
    return (
        <OverlayParentContext value={layer.id}>
            <Drawer
                {...props}
                closeOnEscape={false}
                returnFocus={false}
                trapFocus={
                    (!props.opened || layer.isTopmost) &&
                    props.trapFocus !== false
                }
                zIndex={layer.zIndex}
            />
        </OverlayParentContext>
    );
};

export const AppModal = (props: Readonly<ModalProps>): ReactElement => {
    const layer = useOverlayLayer(props);
    return (
        <OverlayParentContext value={layer.id}>
            <Modal
                {...props}
                closeOnEscape={false}
                returnFocus={false}
                trapFocus={
                    (!props.opened || layer.isTopmost) &&
                    props.trapFocus !== false
                }
                zIndex={layer.zIndex}
            />
        </OverlayParentContext>
    );
};

export const AppModalRoot = (props: Readonly<ModalRootProps>): ReactElement => {
    const layer = useOverlayLayer(props);
    return (
        <OverlayParentContext value={layer.id}>
            <Modal.Root
                {...props}
                closeOnEscape={false}
                returnFocus={false}
                trapFocus={
                    (!props.opened || layer.isTopmost) &&
                    props.trapFocus !== false
                }
                zIndex={layer.zIndex}
            />
        </OverlayParentContext>
    );
};
