import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

import tsconfig from './tsconfig.json' with { type: 'json' };

const config: Config = {
    clearMocks: true,

    collectCoverage: false,
    collectCoverageFrom: [
        'src/{components,features,hooks}/**/*.{ts,tsx}',
        '!**/index.ts',
    ],
    coverageReporters: ['text'],

    coverageThreshold: {
        global: {
            branches: 80,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },

    moduleNameMapper: {
        ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
            prefix: '<rootDir>/',
        }),
        '\\.css$': 'identity-obj-proxy',
    },
    modulePaths: [tsconfig.compilerOptions.rootDir],

    roots: ['<rootDir>'],

    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

    testEnvironment: 'jsdom',

    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)', '!**/*.integration.test.ts'],

    testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/.delta/'],

    transform: {
        '^.+\\.[jt]sx?$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.test.json',
            },
        ],
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/.pnpm/(?!(jotai)@)'],
};

export default config;
