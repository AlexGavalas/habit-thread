import type { z } from 'zod';

export const parseResponse = async <Value>(
    response: Response,
    schema: z.ZodType<Value>,
): Promise<Value> => {
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return schema.parse(await response.json());
};
