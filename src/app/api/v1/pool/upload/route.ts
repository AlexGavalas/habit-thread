import { MealImportError } from '~api/meal-import/errors';
import {
    assertMealImportConfigured,
    extractMeals,
} from '~api/meal-import/extract-meals';
import { readMealDocument } from '~api/meal-import/read-document';
import { consumeMealImportAttempt } from '~api/meal-import/usage';
import { mealImport } from '~flags';
import {
    MAX_IMPORT_FILE_SIZE,
    type MealImportErrorCode,
} from '~schemas/meal-import';
import { withUser } from '~util/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const errorStatuses: Record<MealImportErrorCode, number> = {
    document_too_large: 413,
    extraction_failed: 502,
    file_too_large: 413,
    invalid_file: 400,
    no_meals: 422,
    rate_limited: 429,
    unavailable: 503,
    unreadable_document: 422,
    unsupported_type: 415,
};

const readUpload = async (request: Request): Promise<File> => {
    const reader = request.body?.getReader();
    if (!reader) {
        throw new MealImportError('invalid_file');
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done: isDone, value } = await reader.read();
            if (isDone) {
                break;
            }
            size += value.byteLength;
            // Leave room for multipart headers, below Vercel's 4.5 MB request ceiling.
            if (size > MAX_IMPORT_FILE_SIZE + 64 * 1024) {
                await reader.cancel();
                throw new MealImportError('file_too_large');
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    let form: FormData;
    try {
        form = await new Response(Buffer.concat(chunks), {
            headers: request.headers,
        }).formData();
    } catch {
        throw new MealImportError('invalid_file');
    }
    const file = form.get('file');
    if (!file || typeof file === 'string' || !file.size) {
        throw new MealImportError('invalid_file');
    }
    return file;
};

export const POST = withUser(async ({ request, user }) => {
    if (!(await mealImport())) {
        return Response.json({ message: 'Not Found' }, { status: 404 });
    }
    try {
        const file = await readUpload(request);
        const document = await readMealDocument(file);
        assertMealImportConfigured();
        await consumeMealImportAttempt(user.id);
        const meals = await extractMeals(document, request.signal);
        return Response.json({ data: meals });
    } catch (error) {
        if (error instanceof MealImportError) {
            return Response.json(
                { code: error.code },
                { status: errorStatuses[error.code] },
            );
        }
        throw error;
    }
});
