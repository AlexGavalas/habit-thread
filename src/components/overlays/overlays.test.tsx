import { StrictMode } from 'react';

import { ContextModalsProvider } from '~features/context-modals';
import { fireEvent, renderWithUser, screen, waitFor } from '~test/utils';

import { ManagedExample, OverlayExample } from './overlay-test-fixtures';
import { AppDrawer, AppModal } from './overlays';

describe('overlay Escape policy', () => {
    it.each([
        [AppDrawer, AppDrawer],
        [AppDrawer, AppModal],
        [AppModal, AppDrawer],
        [AppModal, AppModal],
    ])(
        'dismisses only the top layer across modal/drawer combinations (%#)',
        async (Parent, Child) => {
            expect.hasAssertions();
            const { user } = renderWithUser(
                <StrictMode>
                    <OverlayExample Parent={Parent} Child={Child} />
                </StrictMode>,
            );
            const trigger = screen.getByRole('button', { name: 'Open child' });
            await user.click(trigger);
            await user.keyboard('{Escape}');
            expect(
                screen.queryByRole('dialog', { name: 'Child layer' }),
            ).not.toBeInTheDocument();
            expect(
                screen.getByRole('dialog', { name: 'Parent layer' }),
            ).toBeVisible();
            await waitFor(() => {
                expect(trigger).toHaveFocus();
            });
            await user.keyboard('{Escape}');
            expect(
                screen.queryByRole('dialog', { name: 'Parent layer' }),
            ).not.toBeInTheDocument();
        },
    );

    it('orders initially open nested layers correctly', async () => {
        expect.hasAssertions();
        const { user } = renderWithUser(
            <OverlayExample
                Parent={AppDrawer}
                Child={AppModal}
                initiallyOpened
            />,
        );
        await user.keyboard('{Escape}');
        expect(
            screen.queryByRole('dialog', { name: 'Child layer' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('dialog', { name: 'Parent layer' }),
        ).toBeVisible();
    });

    it('does not dismiss a lower layer when the top layer blocks Escape', async () => {
        expect.hasAssertions();
        const { user } = renderWithUser(
            <OverlayExample
                Parent={AppDrawer}
                Child={AppModal}
                initiallyOpened
                blocked
            />,
        );
        await user.keyboard('{Escape}');
        expect(
            screen.getByRole('dialog', { name: 'Child layer' }),
        ).toBeVisible();
        expect(
            screen.getByRole('dialog', { name: 'Parent layer' }),
        ).toBeVisible();
    });

    it('ignores composing and repeated Escape events', () => {
        renderWithUser(
            <OverlayExample
                Parent={AppDrawer}
                Child={AppModal}
                initiallyOpened
            />,
        );
        fireEvent.keyDown(window, { isComposing: true, key: 'Escape' });
        fireEvent.keyDown(window, { key: 'Escape', repeat: true });
        expect(
            screen.getByRole('dialog', { name: 'Child layer' }),
        ).toBeVisible();
        expect(
            screen.getByRole('dialog', { name: 'Parent layer' }),
        ).toBeVisible();
    });

    it('respects inputs that reserve Escape for their own popup', () => {
        renderWithUser(
            <OverlayExample
                Parent={AppDrawer}
                Child={AppModal}
                initiallyOpened
            />,
        );
        const input = screen.getByRole('textbox', { name: 'Child input' });
        input.setAttribute('data-mantine-stop-propagation', 'true');
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(
            screen.getByRole('dialog', { name: 'Child layer' }),
        ).toBeVisible();
    });

    it('coordinates provider-managed modals with drawers', async () => {
        expect.hasAssertions();
        const { user } = renderWithUser(
            <ContextModalsProvider>
                <ManagedExample />
            </ContextModalsProvider>,
        );
        await user.click(
            screen.getByRole('button', { name: 'Open managed modal' }),
        );
        expect(
            screen.getByRole('dialog', { name: 'Managed modal' }),
        ).toBeVisible();
        await user.click(
            screen.getByRole('button', { name: 'Open nested drawer' }),
        );
        await user.keyboard('{Escape}');
        expect(
            screen.queryByRole('dialog', { name: 'Nested drawer' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('dialog', { name: 'Managed modal' }),
        ).toBeVisible();
        await user.keyboard('{Escape}');
        expect(
            screen.queryByRole('dialog', { name: 'Managed modal' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('dialog', { name: 'Parent drawer' }),
        ).toBeVisible();
        await user.keyboard('{Escape}');
        expect(
            screen.queryByRole('dialog', { name: 'Parent drawer' }),
        ).not.toBeInTheDocument();
    });

    it('retains the original trigger while moving between managed modals', async () => {
        expect.hasAssertions();
        const { user } = renderWithUser(
            <ContextModalsProvider>
                <ManagedExample />
            </ContextModalsProvider>,
        );
        const trigger = screen.getByRole('button', {
            name: 'Open managed modal',
        });
        await user.click(trigger);
        await user.click(
            screen.getByRole('button', { name: 'Open second managed modal' }),
        );
        await user.keyboard('{Escape}');
        expect(
            screen.getByRole('dialog', { name: 'Managed modal' }),
        ).toBeVisible();
        await user.keyboard('{Escape}');
        expect(
            screen.queryByRole('dialog', { name: 'Managed modal' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('dialog', { name: 'Parent drawer' }),
        ).toBeVisible();
        await waitFor(() => {
            expect(trigger).toHaveFocus();
        });
    });
});
