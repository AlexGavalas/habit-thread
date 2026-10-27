/** @jest-environment node */
import { NextRequest } from 'next/server';

import { MealImportError } from '~api/meal-import/errors';
import {
    assertMealImportConfigured,
    extractMeals,
} from '~api/meal-import/extract-meals';
import { readMealDocument } from '~api/meal-import/read-document';
import { consumeMealImportAttempt } from '~api/meal-import/usage';
import { mealImport } from '~flags';
import { MAX_IMPORT_FILE_SIZE } from '~schemas/meal-import';
import type { RouteHandlerWithUser } from '~util/session';

import { POST } from './route';

jest.mock('~flags', () => ({ mealImport: jest.fn() }));
jest.mock('~api/meal-import/extract-meals', () => ({
    assertMealImportConfigured: jest.fn(),
    extractMeals: jest.fn(),
}));
jest.mock('~api/meal-import/read-document', () => ({
    readMealDocument: jest.fn(),
}));
jest.mock('~api/meal-import/usage', () => ({
    consumeMealImportAttempt: jest.fn(),
}));
jest.mock('~util/session', () => ({
    withUser:
        (
            handler: RouteHandlerWithUser,
        ): ((request: NextRequest) => Promise<Response>) =>
        (request) =>
            handler({
                request,
                user: {
                    created_at: '',
                    email: 'test@example.com',
                    food_preferences_negative: null,
                    food_preferences_positive: null,
                    full_name: 'Test',
                    has_completed_onboarding: true,
                    height: null,
                    id: 7,
                    is_discoverable: false,
                    language: 'en',
                    professional_is_discoverable: false,
                    roles: [],
                    target_weight: null,
                },
            }),
}));

const makeRequest = (body: string): NextRequest =>
    new NextRequest('http://localhost/api/v1/pool/upload', {
        body,
        headers: {
            'Content-Type': 'multipart/form-data; boundary=meal-import-test',
        },
        method: 'POST',
    });

const uploadForm = (): string =>
    '--meal-import-test\r\nContent-Disposition: form-data; name="file"; filename="plan.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\r\n--meal-import-test--\r\n';

describe('meal upload transport', () => {
    beforeEach(() => {
        jest.mocked(mealImport).mockResolvedValue(true);
        jest.mocked(readMealDocument).mockResolvedValue('Eggs');
        jest.mocked(extractMeals).mockResolvedValue(['Eggs']);
        jest.mocked(consumeMealImportAttempt).mockResolvedValue(undefined);
        jest.mocked(assertMealImportConfigured).mockImplementation(
            () => undefined,
        );
    });

    it('rejects disabled imports before reading documents or consuming AI quota', async () => {
        expect.hasAssertions();
        jest.mocked(mealImport).mockResolvedValueOnce(false);
        const response = await POST(makeRequest(uploadForm()));
        expect(response.status).toBe(404);
        expect(readMealDocument).not.toHaveBeenCalled();
        expect(consumeMealImportAttempt).not.toHaveBeenCalled();
    });

    it('returns the existing preview contract without saving meals', async () => {
        expect.hasAssertions();
        const response = await POST(makeRequest(uploadForm()));
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({
            data: ['Eggs'],
        });
        expect(consumeMealImportAttempt).toHaveBeenCalledWith(7);
    });

    it('rejects missing files and malformed multipart before parsing', async () => {
        expect.hasAssertions();
        const missing = await POST(makeRequest('--meal-import-test--\r\n'));
        const malformed = await POST(makeRequest('not multipart'));
        expect([missing.status, malformed.status]).toStrictEqual([400, 400]);
        expect(readMealDocument).not.toHaveBeenCalled();
    });

    it('bounds streamed request bodies without trusting Content-Length', async () => {
        expect.hasAssertions();
        const response = await POST(
            makeRequest('x'.repeat(MAX_IMPORT_FILE_SIZE + 65537)),
        );
        expect(response.status).toBe(413);
        expect(readMealDocument).not.toHaveBeenCalled();
    });

    it('does not consume quota or call OpenAI when the document is unreadable', async () => {
        expect.hasAssertions();
        jest.mocked(readMealDocument).mockRejectedValueOnce(
            new MealImportError('unreadable_document'),
        );
        const response = await POST(makeRequest(uploadForm()));
        expect(response.status).toBe(422);
        expect(consumeMealImportAttempt).not.toHaveBeenCalled();
        expect(extractMeals).not.toHaveBeenCalled();
    });

    it('returns an actionable configuration error without consuming quota', async () => {
        expect.hasAssertions();
        jest.mocked(assertMealImportConfigured).mockImplementationOnce(() => {
            throw new MealImportError('unavailable');
        });
        const response = await POST(makeRequest(uploadForm()));
        expect(response.status).toBe(503);
        expect(consumeMealImportAttempt).not.toHaveBeenCalled();
    });

    it('rejects exhausted quota before calling OpenAI', async () => {
        expect.hasAssertions();
        jest.mocked(consumeMealImportAttempt).mockRejectedValueOnce(
            new MealImportError('rate_limited'),
        );
        const response = await POST(makeRequest(uploadForm()));
        expect(response.status).toBe(429);
        expect(extractMeals).not.toHaveBeenCalled();
    });
});
