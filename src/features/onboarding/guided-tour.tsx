import { Tour } from '@mantine/core';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocalizedPath } from '~hooks/use-localized-path';
import { BRAND_COLORS } from '~theme';

import { useSteps } from './helpers';

type GuidedTourProps = Readonly<{
    onComplete: () => void;
}>;

export const GuidedTour = ({
    onComplete,
}: GuidedTourProps): ReactElement | null => {
    const { t } = useTranslation();
    const router = useRouter();
    const localize = useLocalizedPath();
    const [shouldRun, setShouldRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [hasTourEnded, setHasTourEnded] = useState(false);
    const [isBrowser, setIsBrowser] = useState(false);

    const steps = useSteps();

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    const currentTarget = steps[stepIndex]?.target;

    useEffect(() => {
        if (!isBrowser || hasTourEnded || typeof currentTarget !== 'string') {
            return;
        }

        const startWhenTargetIsReady = (): boolean => {
            if (!document.querySelector(currentTarget)) {
                return false;
            }

            setShouldRun(true);

            return true;
        };

        if (startWhenTargetIsReady()) {
            return;
        }

        setShouldRun(false);

        const observer = new MutationObserver(() => {
            if (startWhenTargetIsReady()) {
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return (): void => {
            observer.disconnect();
        };
    }, [currentTarget, hasTourEnded, isBrowser]);

    const handleStepChange = (nextStepIndex: number): void => {
        const currentStep = steps[stepIndex];
        const nextStep = steps[nextStepIndex];

        setStepIndex(nextStepIndex);

        if (currentStep && nextStep && currentStep.route !== nextStep.route) {
            setShouldRun(false);
            router.push(localize(nextStep.route));
        }
    };

    const handleTourClose = (): void => {
        setShouldRun(false);
        setHasTourEnded(true);
        onComplete();
    };

    if (!isBrowser) {
        return null;
    }

    return (
        <Tour
            active={shouldRun}
            attributes={{
                closeButton: {
                    'aria-label': t('generic.actions.close'),
                },
            }}
            color={BRAND_COLORS[5]}
            labels={{
                back: t('generic.misc.back'),
                close: t('generic.misc.done'),
                next: t('generic.misc.next'),
                skip: t('generic.misc.skip'),
            }}
            onClose={handleTourClose}
            onStepChange={handleStepChange}
            step={stepIndex}
            styles={{
                body: {
                    paddingInlineEnd:
                        'calc(var(--mantine-spacing-lg) + var(--mantine-spacing-xs))',
                },
            }}
            withScrollIntoView
        >
            {steps.map(({ route: _route, ...step }) => (
                <Tour.Step key={step.target} {...step} />
            ))}
        </Tour>
    );
};
