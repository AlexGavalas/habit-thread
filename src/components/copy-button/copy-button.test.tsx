import { renderWithUser, screen } from '~test/utils';

import { CopyButton } from './copy-button';

describe('<CopyButton />', () => {
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
