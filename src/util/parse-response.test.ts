import { z } from 'zod';

import { booleanResponseSchema, countResponseSchema } from '~schemas/response';

import { parseResponse } from './parse-response';

describe('parse response', () => {
    it('preserves a zero count', async () => {
        expect.assertions(1);
        await expect(
            parseResponse(Response.json({ count: 0 }), countResponseSchema),
        ).resolves.toStrictEqual({ count: 0 });
    });

    it('preserves a false boolean result', async () => {
        expect.assertions(1);
        await expect(
            parseResponse(
                Response.json({ data: false }),
                booleanResponseSchema,
            ),
        ).resolves.toStrictEqual({ data: false });
    });

    it('rejects HTTP failures even when the body matches the success schema', async () => {
        expect.assertions(1);
        await expect(
            parseResponse(
                Response.json({ count: 0 }, { status: 500 }),
                countResponseSchema,
            ),
        ).rejects.toThrow('Request failed with status 500');
    });

    it('rejects malformed success payloads instead of treating them as empty data', async () => {
        expect.assertions(1);
        await expect(
            parseResponse(Response.json({}), countResponseSchema),
        ).rejects.toBeInstanceOf(z.ZodError);
    });

    it('rejects invalid JSON', async () => {
        expect.assertions(1);
        await expect(
            parseResponse(new Response('not JSON'), countResponseSchema),
        ).rejects.toBeInstanceOf(SyntaxError);
    });
});
