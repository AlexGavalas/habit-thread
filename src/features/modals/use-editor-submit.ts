import { modals } from '@mantine/modals';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useEditorSubmit = (
    modalId?: string,
): {
    error: string;
    isSaving: boolean;
    submit: (operation: () => Promise<void> | void) => Promise<boolean>;
} => {
    const { t } = useTranslation();
    const pending = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (modalId) {
            modals.updateContextModal({
                closeButtonProps: { disabled: isSaving },
                closeOnClickOutside: !isSaving,
                closeOnEscape: !isSaving,
                modalId,
            });
        }
    }, [isSaving, modalId]);
    const submit = async (
        operation: () => Promise<void> | void,
    ): Promise<boolean> => {
        if (pending.current) {
            return false;
        }
        pending.current = true;
        setIsSaving(true);
        setError('');
        try {
            await operation();
            return true;
        } catch {
            setError(`${t('errors.meal_save')}. ${t('try_again')}`);
            return false;
        } finally {
            pending.current = false;
            setIsSaving(false);
        }
    };
    return { error, isSaving, submit };
};
