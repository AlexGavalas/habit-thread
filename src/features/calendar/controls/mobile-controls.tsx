import { ActionIcon, Button, Group, Menu, Stack, Title } from '@mantine/core';
import {
    Copy,
    EditPencil,
    FastArrowLeft,
    FastArrowRight,
    MoreHoriz,
    Plus,
    PrintingPage,
    StatsReport,
} from 'iconoir-react';
import type { ReactElement } from 'react';
import { type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './controls.module.css';

type MobileControlsProps = Readonly<{
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

export const MobileControls = (props: MobileControlsProps): ReactElement => {
    const { t } = useTranslation();

    return (
        <Stack className={styles.mobileControls} gap="sm">
            <Group align="center" justify="space-between" wrap="nowrap">
                <Title order={2} size="h3">
                    {t('view_weekly_meal')}
                </Title>
                <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                        aria-label={t('week.previous')}
                        size="var(--app-size-action)"
                        variant="outline"
                        onClick={props.onPreviousWeek}
                    >
                        <FastArrowLeft />
                    </ActionIcon>
                    <ActionIcon
                        aria-label={t('week.next')}
                        size="var(--app-size-action)"
                        variant="outline"
                        onClick={props.onNextWeek}
                    >
                        <FastArrowRight />
                    </ActionIcon>
                </Group>
            </Group>
            <Group grow gap="sm" wrap="nowrap">
                <Button leftSection={<Plus />} onClick={props.onCreateMeal}>
                    {t('create_meal')}
                </Button>
                <Menu position="bottom-end" width={220}>
                    <Menu.Target>
                        <Button
                            aria-label={t('meal_plan.more_actions')}
                            rightSection={<MoreHoriz />}
                            variant="outline"
                        >
                            {t('meal_plan.more_actions')}
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            disabled={props.isScheduleBlocked}
                            leftSection={<EditPencil />}
                            onClick={props.onEditSchedule}
                        >
                            {t('meal_plan.schedule.edit')}
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<StatsReport />}
                            onClick={props.onOverview}
                        >
                            {t('see_overview')}
                        </Menu.Item>
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
    );
};
