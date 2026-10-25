import { axe } from 'jest-axe';
import { signIn } from 'next-auth/react';
import mockRouter from 'next-router-mock';

import { act, renderWithUser, screen } from '~test/utils';

import { UserActions } from './user-actions';

jest.mock('next-auth/react', () => {
    const actual =
        jest.requireActual<typeof import('next-auth/react')>('next-auth/react');

    return { ...actual, signIn: jest.fn() };
});

describe('<UserActions />', () => {
    const mockSignIn = jest.mocked(signIn);

    beforeEach(() => {
        mockRouter.setCurrentUrl('/');
        mockSignIn.mockResolvedValue({
            error: null,
            ok: true,
            status: 200,
            url: 'https://production.example.com/home',
        });
    });

    it('opens a login modal with Google and email options', async () => {
        expect.assertions(3);
        const { user } = renderWithUser(<UserActions hasUser={false} />);

        await user.click(screen.getByRole('button', { name: 'Log in' }));

        expect(
            screen.getByRole('button', { name: 'Continue with Google' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('submits email and password credentials', async () => {
        expect.assertions(2);
        const { user } = renderWithUser(<UserActions hasUser={false} />);

        await user.click(screen.getByRole('button', { name: 'Log in' }));
        await user.type(screen.getByLabelText('Email'), 'USER@example.com');
        await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(
            screen.getByRole('button', { name: 'Log in with email' }),
        );

        expect(mockSignIn).toHaveBeenCalledWith('credentials', {
            callbackUrl: '/',
            email: 'USER@example.com',
            password: 'password123',
            redirect: false,
        });
        expect(mockRouter.asPath).toBe('/');
    });

    it('names the login dialog and close button for assistive technology', async () => {
        expect.hasAssertions();
        const { baseElement, user } = renderWithUser(
            <UserActions hasUser={false} />,
        );
        await user.click(screen.getByRole('button', { name: 'Log in' }));
        expect(
            screen.getByRole('dialog', { name: 'Log in to HabitThread' }),
        ).toBeVisible();
        expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
        await act(async () => {
            await expect(axe(baseElement)).resolves.toHaveNoViolations();
        });
    });
});
