import { Button, Text } from '@mantine/core';
import { useModals } from '@mantine/modals';
import type { ReactElement } from 'react';

import { renderWithUser, screen } from '~test/utils';

import { ContextModalsProvider } from './context-modals';

const ModalOpener = (): ReactElement => {
    const modals = useModals();
    const handleOpen = (): void => {
        modals.openModal({
            children: <Text>Dialog content</Text>,
            title: 'Example dialog',
        });
    };
    return (
        <Button onClick={handleOpen} type="button">
            Open dialog
        </Button>
    );
};

describe('<ContextModalsProvider />', () => {
    it('gives shared modal close buttons a translated accessible name', async () => {
        expect.hasAssertions();
        const { user } = renderWithUser(
            <ContextModalsProvider>
                <ModalOpener />
            </ContextModalsProvider>,
        );
        await user.click(screen.getByRole('button', { name: 'Open dialog' }));
        const close = await screen.findByRole('button', { name: 'Close' });
        expect(close).toBeVisible();
        await user.click(close);
        expect(
            screen.queryByRole('dialog', { name: 'Example dialog' }),
        ).not.toBeInTheDocument();
    });
});
