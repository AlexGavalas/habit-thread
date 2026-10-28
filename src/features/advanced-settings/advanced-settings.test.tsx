import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';

import { useProfile } from '~hooks/use-profile';
import { testUser } from '~test/user';
import { renderWithUser, screen } from '~test/utils';

import { AdvancedSettings } from './advanced-settings';

jest.mock('~hooks/use-profile');
jest.mock('~features/meal-reminders', () => ({
    MealReminders: (): null => null,
}));

const renderSettings = (): ReturnType<typeof renderWithUser> => {
    const client = new QueryClient();
    return renderWithUser(<AdvancedSettings />, {
        Wrapper: ({ children }): ReactElement => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        ),
    });
};

describe('profile visibility settings', () => {
    const updateProfile = jest.fn();

    beforeEach(() => {
        jest.mocked(useProfile).mockReturnValue({
            deleteProfile: jest.fn(),
            isDeleting: false,
            isFetching: false,
            profile: testUser,
            updateProfile,
            user: { email: testUser.email, name: testUser.full_name },
        });
    });

    it('associates the professional account helper text with its toggle', () => {
        renderSettings();
        expect(
            screen.getByRole('switch', {
                name: /^Use HabitThread as a professional/,
            }),
        ).toHaveAccessibleDescription(
            'Enable professional tools while keeping your normal HabitThread experience. Your profile will be visible in all searches while professional mode is enabled.',
        );
    });

    it('offers one visibility toggle for personal accounts', async () => {
        expect.hasAssertions();
        const { user } = renderSettings();
        const visibility = screen.getByRole('switch', {
            name: /^Is my profile visible to other users\?/,
        });
        expect(visibility).not.toBeChecked();
        expect(
            screen.queryByRole('switch', { name: 'Allow clients to find me' }),
        ).not.toBeInTheDocument();
        await user.click(visibility);
        expect(updateProfile).toHaveBeenCalledWith({ isDiscoverable: true });
    });

    it('locks visibility on and explains why for professionals', async () => {
        expect.hasAssertions();
        jest.mocked(useProfile).mockReturnValue({
            ...useProfile(),
            profile: {
                ...testUser,
                is_discoverable: true,
                roles: ['professional'],
            },
        });
        const { user } = renderSettings();
        const visibility = screen.getByRole('switch', {
            name: /^Is my profile visible to other users\?/,
        });
        expect(visibility).toBeChecked();
        expect(visibility).toBeDisabled();
        expect(visibility).toHaveAccessibleDescription(
            /Disable professional mode before hiding your profile/,
        );
        expect(
            screen.queryByRole('switch', { name: 'Allow clients to find me' }),
        ).not.toBeInTheDocument();
        await user.click(visibility);
        expect(updateProfile).not.toHaveBeenCalled();
    });
});
