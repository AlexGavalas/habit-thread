'use client';

import type { ReactElement } from 'react';
import { type PropsWithChildren, createContext, useContext } from 'react';

export type FeatureFlags = {
    isFoodDatabaseSearchEnabled: boolean;
    isMealImportEnabled: boolean;
};

const FeatureFlagsContext = createContext<FeatureFlags>({
    isFoodDatabaseSearchEnabled: false,
    isMealImportEnabled: false,
});

export const FeatureFlagsProvider = ({
    children,
    value,
}: PropsWithChildren<Readonly<{ value: FeatureFlags }>>): ReactElement => (
    <FeatureFlagsContext.Provider value={value}>
        {children}
    </FeatureFlagsContext.Provider>
);

export const useFeatureFlags = (): FeatureFlags =>
    useContext(FeatureFlagsContext);
