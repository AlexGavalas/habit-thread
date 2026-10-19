import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement } from 'react';

import { useProfile } from '~hooks/use-profile';
import { renderWithUser, screen, waitFor } from '~test/utils';
import { type UserProfile } from '~types/user';

import { saveProfile, setProfessionalRole } from '../../app/actions';
import { Onboarding } from './onboarding';

jest.mock('~hooks/use-profile');
jest.mock('./guided-tour', () => ({
    GuidedTour: ({ onComplete }: { onComplete: () => void }): ReactElement => (
        <button onClick={onComplete} type="button">
            Finish tour
        </button>
    ),
}));

const renderOnboarding = (): ReturnType<typeof renderWithUser> => {
    const client = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    return renderWithUser(<Onboarding />, {
        Wrapper: ({ children }) => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        ),
    });
};

const getProfile = (profile: UserProfile | undefined): UserProfile => {
    if (!profile) {
        throw new Error('Expected a profile fixture');
    }
    return profile;
};

describe('<Onboarding />', () => {
    beforeEach(() => {
        jest.mocked(saveProfile).mockResolvedValue({ ok: true });
        jest.mocked(setProfessionalRole).mockResolvedValue({ ok: true });
        jest.mocked(useProfile).mockReturnValue({
            deleteProfile: jest.fn(),
            isDeleting: false,
            isFetching: false,
            profile: {
                created_at: '2026-10-03',
                email: 'user@example.test',
                food_preferences_negative: null,
                food_preferences_positive: null,
                full_name: 'Test User',
                has_completed_onboarding: false,
                height: null,
                id: 1,
                is_discoverable: false,
                language: 'en',
                professional_is_discoverable: false,
                roles: [],
                target_weight: null,
            },
            updateProfile: jest.fn(),
            user: { email: 'user@example.test', name: 'Test User' },
        });
    });

    it('waits for the profile before opening onboarding', () => {
        jest.mocked(useProfile).mockReturnValue({
            ...useProfile(),
            profile: undefined,
        });
        renderOnboarding();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not reopen onboarding for completed accounts', () => {
        const result = useProfile();
        jest.mocked(useProfile).mockReturnValue({
            ...result,
            profile: {
                ...getProfile(result.profile),
                has_completed_onboarding: true,
            },
        });
        renderOnboarding();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('uses the existing professional role as the checkbox default', () => {
        const result = useProfile();
        jest.mocked(useProfile).mockReturnValue({
            ...result,
            profile: {
                ...getProfile(result.profile),
                roles: ['professional'],
            },
        });
        renderOnboarding();
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('saves the professional choice without completing onboarding', async () => {
        expect.hasAssertions();
        const { user } = renderOnboarding();
        await user.click(screen.getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await screen.findByRole('button', { name: 'Show me around' });
        expect(setProfessionalRole).toHaveBeenCalledWith({ enabled: true });
        expect(saveProfile).not.toHaveBeenCalled();
    });

    it('keeps the welcome screen and allows retry after a role save failure', async () => {
        expect.hasAssertions();
        jest.mocked(setProfessionalRole).mockResolvedValueOnce({ ok: false });
        const { user } = renderOnboarding();
        await user.click(screen.getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
            'Please try again',
        );
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await expect(
            screen.findByRole('button', { name: 'Show me around' }),
        ).resolves.toBeVisible();
    });

    it('completes onboarding when exploring without a tour', async () => {
        expect.hasAssertions();
        const { user } = renderOnboarding();
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(
            await screen.findByRole('button', { name: 'Explore on my own' }),
        );
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
        expect(setProfessionalRole).not.toHaveBeenCalled();
        expect(saveProfile).toHaveBeenCalledWith({
            hasCompletedOnboarding: true,
        });
    });

    it('keeps the choice available after a completion failure', async () => {
        expect.hasAssertions();
        jest.mocked(saveProfile).mockRejectedValueOnce(
            new Error('Network failure'),
        );
        const { user } = renderOnboarding();
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(
            await screen.findByRole('button', { name: 'Explore on my own' }),
        );
        await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
            'Please try again',
        );
        await user.click(
            screen.getByRole('button', { name: 'Explore on my own' }),
        );
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('starts the optional tour and completes only when it ends', async () => {
        expect.hasAssertions();
        const { user } = renderOnboarding();
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(
            await screen.findByRole('button', { name: 'Show me around' }),
        );
        expect(saveProfile).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Finish tour' }));
        await waitFor(() => {
            expect(saveProfile).toHaveBeenCalledWith({
                hasCompletedOnboarding: true,
            });
        });
    });
});
