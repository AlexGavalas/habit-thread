import { Alert, Button } from '@mantine/core';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

type ReadErrorProps = Readonly<{
    onRetry: () => void;
    isRetrying?: boolean;
}>;

export const ReadError = ({
    onRetry,
    isRetrying = false,
}: ReadErrorProps): ReactElement => {
    const { t } = useTranslation();
    return (
        <Alert color="danger">
            {t('errors.load')}
            <Button
                loading={isRetrying}
                onClick={onRetry}
                ml="md"
                variant="light"
            >
                {t('try_again')}
            </Button>
        </Alert>
    );
};
