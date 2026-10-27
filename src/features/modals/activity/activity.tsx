import { Button, Center, Group, Space, Text, Textarea } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { type ContextModalProps } from '@mantine/modals';
import { format } from 'date-fns';
import 'dayjs/locale/el';
import type { ReactElement } from 'react';
import {
    type ChangeEventHandler,
    type SubmitEventHandler,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useTrackingMutation } from '~hooks/use-tracking-mutation';

type ActivityModalProps = {
    onSave?: () => Promise<void> | void;
    initialData?: {
        id: string;
        date: Date;
        activity?: string;
    };
};

export const ActivityModal = ({
    context,
    id,
    innerProps: { onSave, initialData },
}: ContextModalProps<ActivityModalProps>): ReactElement => {
    const { t, i18n } = useTranslation();
    const [date, setDate] = useState<string | null>(() =>
        format(initialData?.date ?? new Date(), 'yyyy-MM-dd'),
    );

    const [activity, setActivity] = useState(initialData?.activity);
    const [error, setError] = useState('');
    const mutation = useTrackingMutation(id, async () => {
        await onSave?.();
        context.closeContextModal(id);
    });

    const closeModal = (): void => {
        context.closeContextModal(id);
    };

    const resetError = (): void => {
        setError('');
    };

    const handleDateChange = (value: string | null): void => {
        if (!mutation.isPending) {
            setDate(value);
        }
    };

    const handleActivityChange = ((e): void => {
        setActivity(e.target.value);
    }) satisfies ChangeEventHandler<HTMLTextAreaElement>;

    const handleSave = ((e): void => {
        e.preventDefault();
        if (mutation.isPending) {
            return;
        }

        if (!activity) {
            setError(t('errors.activity_empty'));
            return;
        }

        if (!date) {
            setError(t('errors.date_empty'));
            return;
        }

        mutation.mutate({
            data: { activity, date },
            id: initialData?.id,
            resource: 'activity',
        });
    }) satisfies SubmitEventHandler<HTMLFormElement>;

    return (
        <form className="calendar" onSubmit={handleSave}>
            <Text>{t('date')}</Text>
            <Center>
                <DatePicker
                    locale={i18n.language === 'gr' ? 'el' : 'en'}
                    onChange={handleDateChange}
                    value={date}
                />
            </Center>
            <Space h="lg" />
            <Textarea
                autosize
                disabled={mutation.isPending}
                defaultValue={activity}
                error={error}
                label={t('activity.label')}
                minRows={4}
                onChange={handleActivityChange}
                onFocus={resetError}
                placeholder={t('activity.placeholder')}
            />

            <Space h="lg" />
            <Group gap="md" justify="space-between">
                <Button
                    color="danger"
                    disabled={mutation.isPending}
                    onClick={closeModal}
                    variant="light"
                >
                    {t('generic.actions.cancel')}
                </Button>
                <Button loading={mutation.isPending} type="submit">
                    {t('generic.actions.save')}
                </Button>
            </Group>
        </form>
    );
};
