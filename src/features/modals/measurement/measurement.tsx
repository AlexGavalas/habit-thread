import {
    Button,
    Center,
    Group,
    NumberInput,
    type NumberInputProps,
    Space,
    Text,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { type ContextModalProps } from '@mantine/modals';
import { format } from 'date-fns';
import 'dayjs/locale/el';
import type { ReactElement } from 'react';
import { type SubmitEventHandler, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTrackingMutation } from '~hooks/use-tracking-mutation';

type ModalContentProps = {
    onSave?: () => Promise<void>;
    initialData?: {
        id: string;
        date: Date;
        weight?: number;
        fat_percentage?: number;
    };
};

export const MeasurementModal = ({
    context,
    id,
    innerProps: { onSave, initialData },
}: ContextModalProps<ModalContentProps>): ReactElement => {
    const { t, i18n } = useTranslation();
    const [date, setDate] = useState<string | null>(() =>
        format(initialData?.date ?? new Date(), 'yyyy-MM-dd'),
    );
    const [weight, setWeight] = useState(initialData?.weight);
    const [fatPercent, setFatPercent] = useState(initialData?.fat_percentage);
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

    const handleWeightChange = ((value): void => {
        setWeight(Number(value));
    }) satisfies NonNullable<NumberInputProps['onChange']>;

    const handleFatPercentChange = ((value): void => {
        setFatPercent(value === '' ? undefined : Number(value));
    }) satisfies NonNullable<NumberInputProps['onChange']>;

    const handleSave = ((e): void => {
        e.preventDefault();
        if (mutation.isPending) {
            return;
        }

        if (!weight) {
            setError(t('errors.weight_empty'));
            return;
        }

        if (!date) {
            setError(t('errors.date_empty'));
            return;
        }

        mutation.mutate({
            data: { date, fatPercent: fatPercent ?? null, weight },
            id: initialData?.id,
            resource: 'measurement',
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
            <NumberInput
                decimalScale={2}
                disabled={mutation.isPending}
                error={error}
                label={t('weight')}
                min={0}
                onChange={handleWeightChange}
                onFocus={resetError}
                value={weight}
            />

            <Space h="lg" />
            <NumberInput
                decimalScale={2}
                disabled={mutation.isPending}
                label={t('fat_label')}
                max={100}
                min={0}
                onChange={handleFatPercentChange}
                value={fatPercent}
            />

            <Space h="lg" />
            <Group justify="space-between">
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
