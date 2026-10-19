import {
    Alert,
    Button,
    Divider,
    PasswordInput,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { Google } from 'iconoir-react';
import type { ReactElement } from 'react';
import { type MouseEventHandler, type SubmitEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

type AuthFormProps = Readonly<{
    error: string | null;
    isRegistering: boolean;
    isSubmitting: boolean;
    onGoogleLogin: MouseEventHandler<HTMLButtonElement>;
    onSubmit: SubmitEventHandler<HTMLFormElement>;
    onToggleMode: () => void;
}>;

export const AuthForm = ({
    error,
    isRegistering,
    isSubmitting,
    onGoogleLogin,
    onSubmit,
    onToggleMode,
}: AuthFormProps): ReactElement => {
    const { t } = useTranslation();

    return (
        <Stack gap="md" pt="sm">
            <Button
                leftSection={<Google />}
                onClick={onGoogleLogin}
                variant="outline"
            >
                {t('login.google')}
            </Button>
            <Divider label={t('login.or')} labelPosition="center" />
            <form onSubmit={onSubmit}>
                <Stack gap="sm">
                    {isRegistering && (
                        <TextInput
                            required
                            aria-label={t('login.full_name')}
                            autoComplete="name"
                            label={t('login.full_name')}
                            name="fullName"
                        />
                    )}
                    <TextInput
                        required
                        aria-label={t('login.email')}
                        autoComplete="email"
                        label={t('login.email')}
                        name="email"
                        type="email"
                    />
                    <PasswordInput
                        required
                        aria-label={t('login.password')}
                        autoComplete={
                            isRegistering ? 'new-password' : 'current-password'
                        }
                        label={t('login.password')}
                        minLength={8}
                        name="password"
                    />
                    {error && (
                        <Alert color="danger" variant="outline">
                            {error}
                        </Alert>
                    )}
                    <Button loading={isSubmitting} type="submit">
                        {t(
                            isRegistering
                                ? 'login.create_account'
                                : 'login.email_submit',
                        )}
                    </Button>
                </Stack>
            </form>
            <Text size="sm" ta="center">
                {t(isRegistering ? 'login.has_account' : 'login.no_account')}
                <Button
                    ml="xs"
                    onClick={onToggleMode}
                    size="compact-sm"
                    type="button"
                    variant="outline"
                >
                    {t(isRegistering ? 'login.sign_in' : 'login.sign_up')}
                </Button>
            </Text>
        </Stack>
    );
};
