import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';
import type * as FetchPrimitives from 'next/dist/compiled/@edge-runtime/primitives';
import type nextNavigation from 'next/navigation';
import {
    ReadableStream,
    TextDecoderStream,
    TextEncoderStream,
    TransformStream,
    WritableStream,
} from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';
import { deserialize, serialize } from 'node:v8';

const clone = <Value>(value: Value): Value => {
    const cloned: unknown = deserialize(serialize(value));

    return cloned as Value;
};

Object.defineProperties(global, {
    ReadableStream: { value: ReadableStream },
    TextDecoder: { value: TextDecoder },
    TextDecoderStream: { value: TextDecoderStream },
    TextEncoder: { value: TextEncoder },
    TextEncoderStream: { value: TextEncoderStream },
    TransformStream: { value: TransformStream },
    WritableStream: { value: WritableStream },
    structuredClone: { value: clone },
});

const fetchPrimitives = jest.requireActual<typeof FetchPrimitives>(
    'next/dist/compiled/@edge-runtime/primitives',
);

Object.defineProperties(global, {
    Headers: { value: fetchPrimitives.Headers },
    Request: { value: fetchPrimitives.Request },
    Response: { value: fetchPrimitives.Response },
    fetch: { configurable: true, value: fetchPrimitives.fetch, writable: true },
});

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation((query: string) => ({
            addEventListener: jest.fn(),
            addListener: jest.fn(), // deprecated
            dispatchEvent: jest.fn(),
            matches: false,
            media: query,
            onchange: null,
            removeEventListener: jest.fn(),
            removeListener: jest.fn(), // deprecated
        })),
        writable: true,
    });
}

// Next transforms these imports into RPC references in client bundles.
jest.mock('../app/actions', () => ({
    acceptConnectionRequest: jest.fn(),
    acceptProfessionalInvitation: jest.fn(),
    inviteProfessional: jest.fn(),
    removeProfessionalRelationship: jest.fn(),
    saveMealPlan: jest.fn(),
    saveMealZoneTimes: jest.fn(),
    saveProfile: jest.fn(),
    setProfessionalDiscoverable: jest.fn(),
    setProfessionalRole: jest.fn(),
}));

jest.mock('../app/weekly-meal-zone-actions', () => ({
    saveWeeklyMealSchedule: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock<typeof nextNavigation>('next/navigation', () =>
    jest.requireActual('next-router-mock/navigation'),
);

jest.mock('server-only', () => ({}), { virtual: true });
