import '@fontsource-variable/noto-sans';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { dehydrate } from '@tanstack/react-query';
import { format, startOfWeek } from 'date-fns';
import { type Metadata, type Viewport } from 'next';
import type { ReactElement } from 'react';
import { Suspense, type ReactNode } from 'react';

import { getCurrentUser, getRequestDate, getServerSession } from '~api/session';
import { AppStartup } from '~components/app-startup';
import {
    APP_DESCRIPTION,
    APP_NAME,
    APP_SHARE_IMAGE_ALT,
    APP_URL,
} from '~constants/brand';
import { Providers } from '~features/providers';
import { foodDatabaseSearch, mealImport } from '~flags';
import { getResources, getT } from '~util/i18n';
import { createQueryClient } from '~util/query-client';
import { getProfileQueryKey } from '~util/query-keys';

import '@mantine/carousel/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '../styles/globals.css';

const APPLE_STARTUP_SCREENS = [
    [320, 568, 2, 640, 1136],
    [360, 780, 3, 1080, 2340],
    [375, 667, 2, 750, 1334],
    [414, 736, 3, 1080, 1920],
    [375, 812, 3, 1125, 2436],
    [414, 896, 2, 828, 1792],
    [414, 896, 3, 1242, 2688],
    [390, 844, 3, 1170, 2532],
    [393, 852, 3, 1179, 2556],
    [402, 874, 3, 1206, 2622],
    [420, 912, 3, 1260, 2736],
    [428, 926, 3, 1284, 2778],
    [430, 932, 3, 1290, 2796],
    [440, 956, 3, 1320, 2868],
    [744, 1133, 2, 1488, 2266],
    [768, 1024, 2, 1536, 2048],
    [810, 1080, 2, 1620, 2160],
    [820, 1180, 2, 1640, 2360],
    [834, 1112, 2, 1668, 2224],
    [834, 1194, 2, 1668, 2388],
    [834, 1210, 2, 1668, 2420],
    [1024, 1366, 2, 2048, 2732],
    [1032, 1376, 2, 2064, 2752],
] as const;

const appleStartupImages = [
    '/images/apple-startup/apple-startup-1320x2868.png',
    ...APPLE_STARTUP_SCREENS.flatMap(
        ([width, height, pixelRatio, portraitWidth, portraitHeight]) => {
            const media = `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${pixelRatio})`;

            return [
                {
                    media: `${media} and (orientation: portrait)`,
                    url: `/images/apple-startup/apple-startup-${portraitWidth}x${portraitHeight}.png`,
                },
                {
                    media: `${media} and (orientation: landscape)`,
                    url: `/images/apple-startup/apple-startup-${portraitHeight}x${portraitWidth}.png`,
                },
            ];
        },
    ),
];

export const metadata: Metadata = {
    alternates: {
        canonical: '/',
    },
    appleWebApp: {
        capable: true,
        startupImage: appleStartupImages,
        statusBarStyle: 'default',
        title: APP_NAME,
    },
    applicationName: APP_NAME,
    category: 'health and fitness',
    creator: APP_NAME,
    description: APP_DESCRIPTION,
    formatDetection: {
        telephone: false,
    },
    keywords: [
        'meal planning',
        'nutrition tracking',
        'activity tracking',
        'health progress',
    ],
    metadataBase: new URL(APP_URL),
    openGraph: {
        description: APP_DESCRIPTION,
        locale: 'en_US',
        siteName: APP_NAME,
        title: APP_NAME,
        type: 'website',
        url: '/',
    },
    publisher: APP_NAME,
    robots: {
        follow: true,
        index: true,
    },
    title: {
        default: APP_NAME,
        template: `%s | ${APP_NAME}`,
    },
    twitter: {
        card: 'summary_large_image',
        description: APP_DESCRIPTION,
        images: [
            {
                alt: APP_SHARE_IMAGE_ALT,
                url: '/opengraph-image',
            },
        ],
        title: APP_NAME,
    },
};

export const viewport: Viewport = {
    colorScheme: 'light',
    themeColor: '#047d55',
    viewportFit: 'cover',
};
const AppContent = async ({
    children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> => {
    const [
        session,
        profile,
        isFoodDatabaseSearchEnabled,
        isMealImportEnabled,
        requestDate,
    ] = await Promise.all([
        getServerSession(),
        getCurrentUser(),
        foodDatabaseSearch(),
        mealImport(),
        getRequestDate(),
    ]);

    const language = profile?.language === 'gr' ? 'gr' : 'en';

    const { i18n } = await getT('common', { lng: language });

    const queryClient = createQueryClient();

    queryClient.setQueryData(getProfileQueryKey(profile?.email), profile);

    return (
        <Providers
            key={profile?.id ?? 'anonymous'}
            dehydratedState={dehydrate(queryClient)}
            featureFlags={{ isFoodDatabaseSearchEnabled, isMealImportEnabled }}
            initialWeek={format(
                startOfWeek(requestDate, { weekStartsOn: 1 }),
                'yyyy-MM-dd',
            )}
            language={language}
            resources={getResources(i18n, ['common'])}
            session={session}
        >
            {children}
        </Providers>
    );
};

const RootLayout = ({
    children,
}: Readonly<{ children: ReactNode }>): ReactElement => {
    return (
        <html data-scroll-behavior="smooth" lang="en" {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript />
            </head>
            <body>
                <Suspense fallback={<AppStartup />}>
                    <AppContent>{children}</AppContent>
                </Suspense>
            </body>
        </html>
    );
};

export default RootLayout;
