import { Flex, Title } from '@mantine/core';
import { format, isToday, startOfWeek } from 'date-fns';
import { Running } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ReadError } from '~components/read-error';
import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { useProfile } from '~hooks/use-profile';
import { useWeekActivities } from '~hooks/use-week-activities';
import { useCurrentWeek } from '~store/hooks';
import { type ActivitysMap } from '~types/activity';
import { getDaysOfWeek } from '~util/date';

import styles from './header.module.css';

export const Header = (): ReactElement => {
    const { i18n } = useTranslation();
    const { currentWeek } = useCurrentWeek();
    const { profile } = useProfile();
    const ownerUserId = useMealPlanOwnerId();
    const shouldShowActivities = ownerUserId === profile?.id;

    const currentWeekKey = format(
        startOfWeek(currentWeek, { weekStartsOn: 1 }),
        'yyyy-MM-dd',
    );

    const daysOfWeek = getDaysOfWeek(
        currentWeek,
        'EEE dd/MM',
        i18n.language === 'en' ? 'en' : 'gr',
    );

    const {
        data: activities = [],
        isError,
        isFetching,
        refetch,
    } = useWeekActivities(ownerUserId, currentWeekKey, shouldShowActivities);
    const handleRetry = (): void => {
        void refetch();
    };

    const activitiesMap = activities.reduce<ActivitysMap>((acc, activity) => {
        acc[activity.date] = activity;

        return acc;
    }, {});

    if (isError && shouldShowActivities) {
        return <ReadError onRetry={handleRetry} isRetrying={isFetching} />;
    }

    return (
        <div className={styles.wrapper}>
            <div></div>
            {daysOfWeek.map(({ timestamp, label }) => (
                <Flex
                    key={label}
                    align="center"
                    gap="xs"
                    justify="center"
                    pb="sm"
                    style={{ position: 'relative' }}
                >
                    <Title
                        c={isToday(timestamp) ? 'success.8' : undefined}
                        order={4}
                        ta="center"
                    >
                        {label}
                    </Title>
                    {activitiesMap[format(timestamp, 'yyyy-MM-dd')] && (
                        <Running />
                    )}
                </Flex>
            ))}
        </div>
    );
};
