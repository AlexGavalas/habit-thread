import { useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useMealPlanOwnerId } from '~features/meal-plan-owner';
import { useMealMutationState } from '~store/hooks/meal-mutation-state';
import { showErrorNotification } from '~util/notification';

import styles from './persistence-status.module.css';

export const PersistenceStatus = (): ReactElement => {
    const { t } = useTranslation();
    const ownerUserId = useMealPlanOwnerId();
    const { isSaving, hasError } = useMealMutationState(ownerUserId);
    useEffect(() => {
        if (!isSaving) {
            return;
        }
        const beforeUnload = (event: BeforeUnloadEvent): void => {
            event.preventDefault();
        };
        const click = (event: MouseEvent): void => {
            const anchor =
                event.target instanceof Element
                    ? event.target.closest('a[href]')
                    : null;
            if (
                !anchor ||
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            showErrorNotification({
                title: t('meal_plan.persistence.saving'),
                message: t('meal_plan.persistence.wait'),
            });
        };
        window.addEventListener('beforeunload', beforeUnload);
        document.addEventListener('click', click, true);
        return (): void => {
            window.removeEventListener('beforeunload', beforeUnload);
            document.removeEventListener('click', click, true);
        };
    }, [isSaving, t]);
    const message = isSaving
        ? t('meal_plan.persistence.saving')
        : hasError
          ? t('meal_plan.persistence.failed')
          : '';
    return (
        <div
            className={styles.status}
            role="status"
            aria-live="polite"
            data-saving={isSaving || undefined}
            data-error={hasError || undefined}
        >
            {isSaving && <span className={styles.spinner} aria-hidden />}
            {message}
        </div>
    );
};
