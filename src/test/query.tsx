import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, type ReactElement } from 'react';

export const createQueryTestContext = (): {
    client: QueryClient;
    Wrapper: (props: PropsWithChildren) => ReactElement;
} => {
    const client = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { gcTime: Infinity, retry: false },
        },
    });
    const Wrapper = ({ children }: PropsWithChildren): ReactElement => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { Wrapper, client };
};
