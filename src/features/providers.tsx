/* oxlint-disable react/jsx-max-depth -- Providers are fine to have more nesting */
'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import {
    type DehydratedState,
    HydrationBoundary,
    QueryClientProvider,
} from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { type Resource } from 'i18next';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { SessionProvider, type SessionProviderProps } from 'next-auth/react';
import { I18nProvider } from 'next-i18next/client';
import type { ReactElement } from 'react';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { Header } from '~features/header';
import { Onboarding } from '~features/onboarding';
import { currentWeekAtom } from '~store/atoms';
import { UserContext } from '~store/user-context';
import { APP_THEME, appCssVariablesResolver } from '~theme';
import { createQueryClient } from '~util/query-client';

import { ContextModalsProvider } from './context-modals';

type ProvidersProps = PropsWithChildren<
    Readonly<{
        session: SessionProviderProps['session'];
        dehydratedState: DehydratedState;
        language: string;
        resources: Resource;
        initialWeek: string;
    }>
>;

export const Providers = ({
    children,
    dehydratedState,
    session,
    language,
    resources,
    initialWeek,
}: ProvidersProps): ReactElement => {
    useEffect(() => {
        document.documentElement.lang = language === 'gr' ? 'el' : 'en';
    }, [language]);

    // These instances intentionally persist for the lifetime of this account.
    // oxlint-disable-next-line react/hook-use-state
    const [queryClient] = useState(createQueryClient);

    // oxlint-disable-next-line react/hook-use-state
    const [store] = useState(() => {
        const value = createStore();
        value.set(currentWeekAtom, parseISO(initialWeek));
        return value;
    });

    const content = (
        <UserContext>
            <Header />
            {session && <Onboarding />}
            <div className="container">{children}</div>
        </UserContext>
    );

    const modalsContent = (
        <ContextModalsProvider>
            {content}
            <Notifications />
        </ContextModalsProvider>
    );

    return (
        <I18nProvider
            fallbackLng="en"
            language={language}
            resources={resources}
            supportedLngs={['en', 'gr']}
        >
            <MantineProvider
                cssVariablesResolver={appCssVariablesResolver}
                theme={APP_THEME}
            >
                <SessionProvider session={session}>
                    <QueryClientProvider client={queryClient}>
                        <HydrationBoundary state={dehydratedState}>
                            <JotaiProvider store={store}>
                                {modalsContent}
                            </JotaiProvider>
                        </HydrationBoundary>
                    </QueryClientProvider>
                </SessionProvider>
            </MantineProvider>
        </I18nProvider>
    );
};
