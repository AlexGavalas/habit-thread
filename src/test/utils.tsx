import { MantineProvider } from '@mantine/core';
import {
    type RenderOptions,
    type RenderResult,
    queries,
    render,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode, ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';

import { OverlayEscapeProvider } from '~components/overlays/overlay-stack';
import { i18n } from '~test/i18n';
import { APP_THEME } from '~theme';

type RenderParameters = Parameters<typeof render>;

export const renderWithUser = (
    renderParams: RenderParameters[0],
    {
        Wrapper = ({ children }): ReactNode => children,
    }: { Wrapper?: RenderOptions['wrapper'] } = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
    return {
        user: userEvent.setup(),
        ...render(renderParams, {
            queries,
            wrapper: ({ children }): ReactElement => (
                <I18nextProvider i18n={i18n}>
                    <MantineProvider
                        env="test"
                        theme={APP_THEME}
                        withCssVariables={false}
                    >
                        <Wrapper>
                            <OverlayEscapeProvider>
                                {children}
                            </OverlayEscapeProvider>
                        </Wrapper>
                    </MantineProvider>
                </I18nextProvider>
            ),
        }),
    };
};

export * from '@testing-library/react';
