import { configureAxe } from 'jest-axe';

import { act, renderWithUser, screen } from '~test/utils';

import { CopyButton } from './copy-button';

// Landmarks belong to the page, not this isolated button/portal fixture.
const axe = configureAxe({ rules: { region: { enabled: false } } });

describe('<CopyButton />', () => {
    it('has an accessible name and no detectable accessibility violations', async () => {
        expect.hasAssertions();
        const { baseElement, user } = renderWithUser(
            <CopyButton value="test" />,
        );
        await user.tab();
        expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus();
        await act(async () => {
            await expect(axe(baseElement)).resolves.toHaveNoViolations();
        });
        await user.keyboard('{Enter}');
        expect(screen.getByRole('button', { name: 'Copied' })).toHaveFocus();
        await act(async () => {
            await expect(axe(baseElement)).resolves.toHaveNoViolations();
        });
    });

    it('renders the button', () => {
        renderWithUser(<CopyButton value="test" />);

        expect(screen.getByRole('button')).toBeEnabled();
    });

    describe('when the user hovers the button', () => {
        it('shows the tooltip', async () => {
            expect.hasAssertions();

            const { user } = renderWithUser(<CopyButton value="test" />);

            const button = screen.getByRole('button', { name: 'Copy' });

            await user.hover(button);

            await expect(
                screen.findByRole('tooltip'),
            ).resolves.toHaveTextContent('Copy');
        });
    });

    describe('when user clicks the button', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('copies the value to the clipboard', async () => {
            expect.hasAssertions();

            const writeText = jest.spyOn(navigator.clipboard, 'writeText');

            const { user } = renderWithUser(<CopyButton value="test" />);

            const button = screen.getByRole('button', { name: 'Copy' });

            await user.click(button);

            expect(writeText).toHaveBeenCalledWith('test');
        });
    });
});
