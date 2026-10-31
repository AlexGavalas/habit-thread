import Image from 'next/image';
import type { ReactElement } from 'react';
import { type CSSProperties } from 'react';

import { APP_NAME } from '~constants/brand';
import { APP_TOKENS, BRAND_COLORS } from '~theme/theme';

import styles from './app-startup.module.css';

const startupStyle = {
    '--startup-background': APP_TOKENS.color.surfacePage,
    '--startup-color': BRAND_COLORS[8],
    '--startup-spinner-active': BRAND_COLORS[6],
    '--startup-spinner-track': BRAND_COLORS[1],
    background: APP_TOKENS.color.surfacePage,
    color: BRAND_COLORS[8],
    display: 'grid',
    fontFamily: "'Noto Sans Variable', sans-serif",
    inset: 0,
    minHeight: '100dvh',
    padding: '2rem',
    placeItems: 'center',
    position: 'fixed',
    zIndex: 1000,
} satisfies CSSProperties & Record<`--startup-${string}`, string>;

export const AppStartup = (): ReactElement => {
    return (
        <div className={styles.startup} role="status" style={startupStyle}>
            <div aria-hidden="true" className={styles.content}>
                <Image
                    alt=""
                    className={styles.mark}
                    height={72}
                    loading="eager"
                    src="/brand/habitthread-symbol.png"
                    width={72}
                />
                <span className={styles.brand}>{APP_NAME}</span>
                <span className={styles.spinner} />
            </div>
            <span className={styles.visuallyHidden}>Loading {APP_NAME}</span>
        </div>
    );
};
