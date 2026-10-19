import { type TourProps } from '@mantine/core';
import mockRouter from 'next-router-mock';

import { useLocalizedPath } from '~hooks/use-localized-path';
import { act, renderWithUser, waitFor } from '~test/utils';

import { GuidedTour } from './guided-tour';

const mockTour = jest.fn<null, [TourProps]>(() => null);

jest.mock('@mantine/core', () => {
    const actual =
        jest.requireActual<typeof import('@mantine/core')>('@mantine/core');

    return {
        ...actual,
        Tour: Object.assign((props: TourProps) => mockTour(props), {
            Step: actual.Tour.Step,
        }),
    };
});

jest.mock('~hooks/use-localized-path');

describe('<GuidedTour />', () => {
    const onComplete = jest.fn();

    beforeEach(() => {
        mockRouter.setCurrentUrl('/home');
        jest.mocked(useLocalizedPath).mockReturnValue((path) => path);
    });

    afterEach(() => {
        document.querySelector('#daily-meals-container')?.remove();
    });

    it('waits for the current target before running the tour', async () => {
        expect.hasAssertions();

        renderWithUser(<GuidedTour onComplete={onComplete} />);

        await waitFor(() => {
            expect(mockTour).toHaveBeenLastCalledWith(
                expect.objectContaining({ active: false }),
            );
        });

        const target = document.createElement('div');
        target.id = 'daily-meals-container';
        document.body.append(target);

        await waitFor(() => {
            expect(mockTour).toHaveBeenLastCalledWith(
                expect.objectContaining({ active: true }),
            );
        });
    });

    it('configures localized guided navigation and target scrolling', async () => {
        expect.hasAssertions();

        const target = document.createElement('div');
        target.id = 'daily-meals-container';
        document.body.append(target);

        renderWithUser(<GuidedTour onComplete={onComplete} />);

        await waitFor(() => {
            expect(mockTour).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    active: true,
                    attributes: {
                        closeButton: { 'aria-label': 'Close' },
                    },
                    labels: {
                        back: 'Back',
                        close: 'Done',
                        next: 'Next',
                        skip: 'Skip',
                    },
                    onClose: expect.any(Function),
                    onStepChange: expect.any(Function),
                    step: 0,
                    styles: {
                        body: {
                            paddingInlineEnd:
                                'calc(var(--mantine-spacing-lg) + var(--mantine-spacing-xs))',
                        },
                    },
                    withScrollIntoView: true,
                }),
            );
        });
    });

    it('pauses the tour and navigates when the next step is on another route', async () => {
        expect.assertions(2);

        const target = document.createElement('div');
        target.id = 'daily-meals-container';
        document.body.append(target);

        renderWithUser(<GuidedTour onComplete={onComplete} />);

        await waitFor(() => {
            expect(mockTour).toHaveBeenLastCalledWith(
                expect.objectContaining({ active: true }),
            );
        });

        act(() => {
            mockTour.mock.lastCall?.[0].onStepChange?.(2);
        });

        expect(mockRouter.asPath).toBe('/meal-plan');
    });

    it('completes onboarding when the tour is closed', async () => {
        expect.assertions(2);

        const target = document.createElement('div');
        target.id = 'daily-meals-container';
        document.body.append(target);

        renderWithUser(<GuidedTour onComplete={onComplete} />);

        await waitFor(() => {
            expect(mockTour).toHaveBeenLastCalledWith(
                expect.objectContaining({ active: true }),
            );
        });

        act(() => {
            mockTour.mock.lastCall?.[0].onClose?.();
        });

        expect(onComplete).toHaveBeenCalledWith();
    });
});
