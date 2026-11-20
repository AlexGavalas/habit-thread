import dynamic from 'next/dynamic';
import { type ReactElement } from 'react';

import { useProfile } from '~hooks/use-profile';

const OnboardingFlow = dynamic(() =>
    import('./onboarding-flow').then((module) => module.OnboardingFlow),
);

export const Onboarding = (): ReactElement | null => {
    const { profile } = useProfile();

    if (!profile || profile.has_completed_onboarding) {
        return null;
    }

    return (
        <OnboardingFlow
            isProfessional={profile.roles.includes('professional')}
        />
    );
};
