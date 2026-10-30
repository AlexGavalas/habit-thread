import { useModals } from '@mantine/modals';
import { useState, type ReactElement } from 'react';

import { AppDrawer, type AppModal } from './overlays';

type OverlayExampleProps = Readonly<{
    Parent: typeof AppDrawer | typeof AppModal;
    Child: typeof AppDrawer | typeof AppModal;
    initiallyOpened?: boolean;
    blocked?: boolean;
}>;

export const OverlayExample = ({
    Parent,
    Child,
    initiallyOpened = false,
    blocked = false,
}: OverlayExampleProps): ReactElement => {
    const [parentOpened, setParentOpened] = useState(true);
    const [childOpened, setChildOpened] = useState(initiallyOpened);
    const handleParentClose = (): void => {
        setParentOpened(false);
    };
    const handleChildClose = (): void => {
        setChildOpened(false);
    };
    const handleOpen = (): void => {
        setChildOpened(true);
    };
    return (
        <Parent
            title="Parent layer"
            opened={parentOpened}
            onClose={handleParentClose}
        >
            <button type="button" onClick={handleOpen}>
                Open child
            </button>
            <Child
                title="Child layer"
                opened={childOpened}
                closeOnEscape={!blocked}
                onClose={handleChildClose}
            >
                <input aria-label="Child input" />
            </Child>
        </Parent>
    );
};

const ManagedContent = (): ReactElement => {
    const context = useModals();
    const [opened, setOpened] = useState(false);
    const handleClose = (): void => {
        setOpened(false);
    };
    const handleOpen = (): void => {
        setOpened(true);
    };
    const handleNextModal = (): void => {
        context.openModal({
            children: <button type="button">Second modal content</button>,
            title: 'Second managed modal',
        });
    };
    return (
        <>
            <button type="button" onClick={handleOpen}>
                Open nested drawer
            </button>
            <button type="button" onClick={handleNextModal}>
                Open second managed modal
            </button>
            <AppDrawer
                title="Nested drawer"
                opened={opened}
                onClose={handleClose}
            >
                Drawer content
            </AppDrawer>
        </>
    );
};

export const ManagedExample = (): ReactElement => {
    const context = useModals();
    const [opened, setOpened] = useState(true);
    const handleClose = (): void => {
        setOpened(false);
    };
    const handleManagedOpen = (): void => {
        context.openModal({
            children: <ManagedContent />,
            title: 'Managed modal',
        });
    };
    return (
        <AppDrawer title="Parent drawer" opened={opened} onClose={handleClose}>
            <button type="button" onClick={handleManagedOpen}>
                Open managed modal
            </button>
        </AppDrawer>
    );
};
