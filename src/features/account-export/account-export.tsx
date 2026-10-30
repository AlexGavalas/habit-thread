'use client';

import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsActions } from '~features/settings-actions';

import styles from './account-export.module.css';

export const AccountExport = (): ReactElement => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<
        'idle' | 'pending' | 'failed' | 'complete'
    >('idle');

    const handleDownload = async (): Promise<void> => {
        if (status === 'pending') {
            return;
        }
        setStatus('pending');
        try {
            const response = await fetch('/api/account-export', {
                cache: 'no-store',
            });
            if (
                !response.ok ||
                response.headers.get('Content-Type') !== 'application/zip'
            ) {
                throw new Error('Export failed');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'habitthread-account-export.zip';
            document.body.append(link);
            link.click();
            link.remove();
            // Give the browser time to start the download before releasing the blob.
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60_000);
            setStatus('complete');
        } catch {
            setStatus('failed');
        }
    };

    return (
        <section
            aria-labelledby="account-export-title"
            className={styles.section}
        >
            <h3 id="account-export-title">{t('account_export.title')}</h3>
            <p>{t('account_export.description')}</p>
            <SettingsActions>
                <button
                    aria-describedby="account-export-status"
                    className={styles.button}
                    disabled={status === 'pending'}
                    onClick={handleDownload}
                    type="button"
                >
                    {t(
                        status === 'pending'
                            ? 'account_export.pending'
                            : 'account_export.download',
                    )}
                </button>
            </SettingsActions>
            <p
                aria-live="polite"
                id="account-export-status"
                role={status === 'failed' ? 'alert' : 'status'}
            >
                {status === 'failed' && t('account_export.failed')}
                {status === 'complete' && t('account_export.complete')}
            </p>
        </section>
    );
};
