import { Carousel } from '@mantine/carousel';
import { useMediaQuery } from '@mantine/hooks';
import { type EmblaCarouselType } from 'embla-carousel';
/* oxlint-disable react/jsx-handler-names -- Mantine names this callback prop getEmblaApi. */
import type { ReactElement } from 'react';
import { type ButtonHTMLAttributes, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentWeek, useMeals, useUnsavedChanges } from '~store/hooks';
import { type MealsMap } from '~types/meal';
import { type WeeklyMealZone } from '~types/meal-zone';
import { getDaysOfWeek } from '~util/date';

import styles from './content.module.css';
import { DayLane } from './day-lane';
import { useMealSwap } from './meal-swap-board';
import { useDragEdgeScroll } from './use-drag-edge-scroll';

type Props = Readonly<{
    onEditSchedule: (day?: string) => void;
    zones: WeeklyMealZone[];
}>;

export const Content = ({ onEditSchedule, zones }: Props): ReactElement => {
    const [carouselApi, setCarouselApi] = useState<EmblaCarouselType | null>(
        null,
    );
    const [selectedSlide, setSelectedSlide] = useState(0);
    const isMediumViewport = useMediaQuery('(min-width: 62em)');
    const isLargeViewport = useMediaQuery('(min-width: 75em)');
    const isExtraLargeViewport = useMediaQuery('(min-width: 88em)');
    const { i18n, t } = useTranslation();
    const { currentWeek } = useCurrentWeek();
    const { unsavedChanges } = useUnsavedChanges();
    const { meals } = useMeals();
    const swap = useMealSwap();
    const mealsMap = meals.reduce<MealsMap>((acc, meal) => {
        acc[meal.section_key] = meal;
        return acc;
    }, {});
    const days = getDaysOfWeek(
        currentWeek,
        'EEE dd/MM',
        i18n.language === 'gr' ? 'gr' : 'en',
    );
    const visibleSlides = isExtraLargeViewport
        ? 7
        : isLargeViewport
          ? 5
          : isMediumViewport
            ? 4
            : 3;
    const lastSlide = Math.max(0, days.length - visibleSlides);
    const activeEdge = useDragEdgeScroll(
        carouselApi,
        Boolean(swap?.selection?.dragging),
        lastSlide,
    );
    const canScrollNext = selectedSlide < lastSlide;
    const canScrollPrevious = lastSlide > 0 && selectedSlide > 0;
    const onCarouselReady = useCallback((api: EmblaCarouselType) => {
        setCarouselApi(api);
    }, []);
    const nextControlProps = {
        'aria-disabled': !canScrollNext,
        'aria-label': t('meal_plan.scroll_days_forward'),
        'data-inactive': canScrollNext ? undefined : true,
        onClick: (): void => {
            carouselApi?.reInit();
            carouselApi?.scrollTo(Math.min(selectedSlide + 1, lastSlide));
        },
        tabIndex: canScrollNext ? 0 : -1,
    } as ButtonHTMLAttributes<HTMLButtonElement>;
    const previousControlProps = {
        'aria-disabled': !canScrollPrevious,
        'aria-label': t('meal_plan.scroll_days_back'),
        'data-inactive': canScrollPrevious ? undefined : true,
        onClick: (): void => {
            carouselApi?.reInit();
            carouselApi?.scrollTo(Math.max(selectedSlide - 1, 0));
        },
        tabIndex: canScrollPrevious ? 0 : -1,
    } as ButtonHTMLAttributes<HTMLButtonElement>;

    return (
        <Carousel
            aria-label={t('meal_plan.week_board')}
            data-has-day-controls={lastSlide > 0 || undefined}
            data-scroll-edge={
                activeEdge === -1
                    ? 'left'
                    : activeEdge === 1
                      ? 'right'
                      : undefined
            }
            classNames={{
                container: styles.carouselContainer,
                control: styles.carouselControl,
                controls: styles.carouselControls,
                root: styles.carousel,
                slide: styles.carouselSlide,
                viewport: styles.carouselViewport,
            }}
            controlSize={28}
            emblaOptions={{
                align: 'start',
                slidesToScroll: 1,
                watchDrag: (_api, event) =>
                    !(
                        event.target instanceof Element &&
                        event.target.closest('[data-meal-drag-handle]')
                    ),
            }}
            getEmblaApi={onCarouselReady}
            nextControlProps={nextControlProps}
            onSlideChange={setSelectedSlide}
            previousControlProps={previousControlProps}
            slideGap="compact"
            slideSize={{
                base: '33.333333%',
                lg: '20%',
                md: '25%',
                xl: '14.285714%',
            }}
            withControls={lastSlide > 0}
            withIndicators={false}
        >
            {days.map(({ label, timestamp }) => (
                <Carousel.Slide key={timestamp.toISOString()}>
                    <DayLane
                        label={label}
                        meals={mealsMap}
                        onEditSchedule={onEditSchedule}
                        timestamp={timestamp}
                        unsavedChanges={unsavedChanges}
                        zones={zones}
                    />
                </Carousel.Slide>
            ))}
        </Carousel>
    );
};
