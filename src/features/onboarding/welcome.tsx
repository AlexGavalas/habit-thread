import { Alert, Button, Checkbox, Modal, Stack, Text } from '@mantine/core';
import Image from 'next/image';
import { type ChangeEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './welcome.module.css';

type WelcomeProps = Readonly<{
    error: Error | null;
    isBusy: boolean;
    onComplete: () => void;
    onContinue: () => void;
    onProfessionalChange: (professional: boolean) => void;
    onStartTour: () => void;
    phase: 'welcome' | 'choice';
    professional: boolean;
}>;

export const Welcome = ({
    error,
    isBusy,
    onComplete,
    onContinue,
    onProfessionalChange,
    onStartTour,
    phase,
    professional,
}: WelcomeProps): ReactElement => {
    const { t } = useTranslation();
    const isWelcome = phase === 'welcome';
    const handleProfessionalChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        onProfessionalChange(event.currentTarget.checked);
    };

    return (
        <Modal.Root
            centered
            closeOnClickOutside={false}
            closeOnEscape={false}
            onClose={onComplete}
            opened
            padding="lg"
            radius="lg"
            size="md"
        >
            <Modal.Overlay />
            <Modal.Content>
                <Modal.Body>
                    <Stack gap="lg">
                        <div className={styles.artwork}>
                            <Image
                                alt=""
                                className={styles.image}
                                height={200}
                                priority
                                src="/images/onboarding-thread.svg"
                                width={440}
                            />
                        </div>
                        <div className={styles.introduction}>
                            <Modal.Title className={styles.title}>
                                {t(
                                    `onboarding.welcome.${isWelcome ? 'title' : 'tour_title'}`,
                                )}
                            </Modal.Title>
                            <Text c="dimmed" mt="xs" size="sm">
                                {t(
                                    `onboarding.welcome.${isWelcome ? 'description' : 'tour_description'}`,
                                )}
                            </Text>
                        </div>
                        {isWelcome && (
                            <div className={styles.role}>
                                <Checkbox
                                    checked={professional}
                                    description={t(
                                        'onboarding.welcome.professional_description',
                                    )}
                                    disabled={isBusy}
                                    label={t(
                                        'onboarding.welcome.professional_label',
                                    )}
                                    onChange={handleProfessionalChange}
                                />
                                <Text c="dimmed" mt="sm" size="xs">
                                    {t('onboarding.welcome.settings_hint')}
                                </Text>
                            </div>
                        )}
                        {error && (
                            <Alert color="danger" role="alert">
                                {t(
                                    error.message === 'active_clients'
                                        ? 'professional.settings.active_clients_error'
                                        : 'onboarding.welcome.save_error',
                                )}
                            </Alert>
                        )}
                        {isWelcome ? (
                            <Button
                                fullWidth
                                loading={isBusy}
                                onClick={onContinue}
                            >
                                {t('onboarding.welcome.continue')}
                            </Button>
                        ) : (
                            <Stack gap="xs">
                                <Button
                                    disabled={isBusy}
                                    fullWidth
                                    onClick={onStartTour}
                                >
                                    {t('onboarding.welcome.start_tour')}
                                </Button>
                                <Button
                                    fullWidth
                                    loading={isBusy}
                                    onClick={onComplete}
                                    variant="subtle"
                                >
                                    {t('onboarding.welcome.explore')}
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </Modal.Body>
            </Modal.Content>
        </Modal.Root>
    );
};
