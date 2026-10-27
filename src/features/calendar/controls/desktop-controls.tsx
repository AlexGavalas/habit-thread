import {
    Button,
    type ButtonProps,
    Group,
    Menu,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import {
    Copy,
    EditPencil,
    FastArrowLeft,
    FastArrowRight,
    Plus,
    PrintingPage,
    StatsReport,
    MoreHoriz,
} from 'iconoir-react';
import type { ReactElement } from 'react';
import { type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentWeek } from '~store/hooks';

import styles from './controls.module.css';

type DesktopControlsProps = Readonly<{
    isCopyBlocked: boolean;
    isScheduleBlocked: boolean;
    onCopy: () => void;
    onCreateMeal: () => void;
    onEditSchedule: () => void;
    onNextWeek: () => void;
    onOverview: () => void;
    onPreviousWeek: () => void;
    onPrint: MouseEventHandler<HTMLButtonElement>;
}>;

const buttonProps = { size: 'xs' } satisfies ButtonProps;

export const DesktopControls = (props: DesktopControlsProps): ReactElement => {
    const { t } = useTranslation();
    const { currentWeek } = useCurrentWeek();
    const weekLabel = `${format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'd MMM')}–${format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'd MMM yyyy')}`;

    return (
        <Group
            align="flex-start"
            className={styles.desktopControls}
            justify="space-between"
            wrap="nowrap"
        >
            <Stack gap="sm">
                <div>
                    <Title order={2}>{t('view_weekly_meal')}</Title>
                    <Text c="dimmed" size="sm">
                        {weekLabel}
                    </Text>
                </div>
                <Group gap="sm">
                    <Button
                        {...buttonProps}
                        leftSection={<FastArrowLeft />}
                        onClick={props.onPreviousWeek}
                    >
                        {t('week.previous')}
                    </Button>
                    <Button
                        {...buttonProps}
                        onClick={props.onNextWeek}
                        rightSection={<FastArrowRight />}
                    >
                        {t('week.next')}
                    </Button>
                </Group>
            </Stack>
            <Stack align="flex-end" gap="sm">
                <Group gap="sm">
                    <Button
                        {...buttonProps}
                        disabled={props.isScheduleBlocked}
                        leftSection={<EditPencil />}
                        onClick={props.onEditSchedule}
                        variant="outline"
                    >
                        {t('meal_plan.schedule.edit')}
                    </Button>
                    <Button
                        {...buttonProps}
                        leftSection={<Plus />}
                        onClick={props.onCreateMeal}
                    >
                        {t('meal_plan.meal_library')}
                    </Button>
                    <Button
                        {...buttonProps}
                        leftSection={<StatsReport />}
                        onClick={props.onOverview}
                        variant="outline"
                    >
                        {t('see_overview')}
                    </Button>
                    <Menu position="bottom-end" width={220}>
                        <Menu.Target>
                            <Button
                                {...buttonProps}
                                aria-label={t('generic.actions.more_actions')}
                                leftSection={<MoreHoriz />}
                                variant="default"
                            >
                                {t('generic.actions.more_actions')}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item
                                disabled={props.isCopyBlocked}
                                leftSection={<Copy />}
                                onClick={props.onCopy}
                            >
                                {t('week.copy_to_next_week')}
                            </Menu.Item>
                            <Menu.Item
                                leftSection={<PrintingPage />}
                                onClick={props.onPrint}
                            >
                                {t('generic.actions.print')}
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Stack>
        </Group>
    );
};
