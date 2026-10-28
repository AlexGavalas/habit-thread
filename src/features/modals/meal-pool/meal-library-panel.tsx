import type { ReactElement, ReactNode } from 'react';

import styles from './meal-pool.module.css';

type MealLibraryPanelProps = Readonly<{
    actions: ReactNode;
    children: ReactNode;
    workspace?: boolean;
}>;

export const MealLibraryPanel = ({
    actions,
    children,
    workspace = false,
}: MealLibraryPanelProps): ReactElement => (
    <div className={styles.libraryPanel}>
        <div
            className={`${styles.content} ${workspace ? styles.workspace : ''}`}
        >
            {children}
        </div>
        <footer className={styles.actions}>{actions}</footer>
    </div>
);
