import { Center, Loader } from '@mantine/core';
import { type ReactElement } from 'react';

export const CenterLoader = (): ReactElement => (
    <Center py="md">
        <Loader />
    </Center>
);
