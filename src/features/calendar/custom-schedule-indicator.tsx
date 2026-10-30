import { Tooltip } from '@mantine/core';
import { Clock } from 'iconoir-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './content.module.css';

export const CustomScheduleIndicator = (): ReactElement => {
    const { t } = useTranslation();
    const label = t('meal_plan.schedule.custom');
    return (
        <Tooltip
            label={label}
            events={{ focus: true, hover: true, touch: true }}
            interactive
            withArrow
        >
            <span
                aria-label={label}
                className={styles.customScheduleIcon}
                role="img"
                tabIndex={0}
            >
                <Clock aria-hidden width="1em" height="1em" />
            </span>
        </Tooltip>
    );
};
