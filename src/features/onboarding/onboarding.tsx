import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';

import { useLocalizedPath } from '~hooks/use-localized-path';
import { useProfile } from '~hooks/use-profile';

import { saveProfile, setProfessionalRole } from '../../app/actions';
import { GuidedTour } from './guided-tour';
import { Welcome } from './welcome';

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

type OnboardingFlowProps = Readonly<{
    isProfessional: boolean;
}>;

const OnboardingFlow = ({
    isProfessional,
}: OnboardingFlowProps): ReactElement | null => {
    const [phase, setPhase] = useState<'welcome' | 'choice' | 'tour' | 'done'>(
        'welcome',
    );
    const [professional, setProfessional] = useState(isProfessional);
    const queryClient = useQueryClient();
    const router = useRouter();
    const localize = useLocalizedPath();

    const roleMutation = useMutation({
        mutationFn: async (): Promise<void> => {
            if (professional === isProfessional) {
                return;
            }
            const result = await setProfessionalRole({ enabled: professional });
            if (!result.ok) {
                throw new Error(
                    result.error ?? 'Could not save professional role',
                );
            }
        },
        onSuccess: async () => {
            setPhase('choice');
            await queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    const completionMutation = useMutation({
        mutationFn: async (): Promise<void> => {
            const result = await saveProfile({ hasCompletedOnboarding: true });
            if (!result.ok) {
                throw new Error('Could not complete onboarding');
            }
        },
        onSuccess: async () => {
            setPhase('done');
            await queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    const handleComplete = (): void => {
        setPhase('choice');
        completionMutation.mutate();
    };

    const handleStartTour = (): void => {
        router.push(localize('/home'));
        setPhase('tour');
    };

    const handleContinue = (): void => {
        roleMutation.mutate();
    };

    if (phase === 'done') {
        return null;
    }
    if (phase === 'tour') {
        return <GuidedTour onComplete={handleComplete} />;
    }

    return (
        <Welcome
            error={
                phase === 'welcome'
                    ? roleMutation.error
                    : completionMutation.error
            }
            isBusy={roleMutation.isPending || completionMutation.isPending}
            onComplete={handleComplete}
            onContinue={handleContinue}
            onProfessionalChange={setProfessional}
            onStartTour={handleStartTour}
            phase={phase}
            professional={professional}
        />
    );
};
