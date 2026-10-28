import { Divider, Stack, Switch, type SwitchProps, Title } from '@mantine/core';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { MealReminders } from '~features/meal-reminders';
import { ProfessionalSettings } from '~features/professional-settings';
import { useProfile } from '~hooks/use-profile';

export const AdvancedSettings = (): ReactElement => {
    const { t } = useTranslation();
    const { isFetching, profile, updateProfile } = useProfile();
    const isProfessional = profile?.roles.includes('professional') ?? false;

    const handleIsDiscoverableChange: SwitchProps['onChange'] = ({
        target: { checked },
    }): void => {
        updateProfile({ isDiscoverable: checked });
    };

    return (
        <Stack gap="lg">
            <Title order={3}>
                {t('account_settings.sections.advanced.title')}
            </Title>
            <Stack component="section" gap="sm">
                <Title order={4}>
                    {t('account_settings.sections.advanced.profile.title')}
                </Title>
                <Switch
                    checked={
                        isProfessional || (profile?.is_discoverable ?? false)
                    }
                    description={t(
                        isProfessional
                            ? 'account_settings.sections.advanced.profile.professional_visibility_description'
                            : 'account_settings.sections.advanced.profile.toggle_discoverable_description',
                    )}
                    disabled={!profile || isFetching || isProfessional}
                    label={t(
                        'account_settings.sections.advanced.profile.toggle_discoverable_label',
                    )}
                    onChange={handleIsDiscoverableChange}
                    w="fit-content"
                />
            </Stack>
            <Divider />
            <ProfessionalSettings />
            <Divider />
            <Stack component="section" gap="md">
                <Title order={4}>{t('meal_reminders.title')}</Title>
                <MealReminders />
            </Stack>
        </Stack>
    );
};
