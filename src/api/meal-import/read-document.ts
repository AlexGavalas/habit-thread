import * as cheerio from 'cheerio';
import mammoth from 'mammoth';
import 'server-only';

import {
    MAX_IMPORT_CHARACTERS,
    MAX_IMPORT_FILE_SIZE,
    MAX_IMPORT_PAGES,
} from '~schemas/meal-import';

import { MealImportError } from './errors';

type DocumentReader = Readonly<{
    extension: string;
    signature: Buffer;
    read: (buffer: Buffer) => Promise<string>;
}>;

const readDocx = async (buffer: Buffer): Promise<string> => {
    const result = await mammoth.convertToHtml(
        { buffer },
        // Images are not part of text-only import and must not be expanded to base64.
        {
            convertImage: mammoth.images.imgElement(() =>
                Promise.resolve({ src: '' }),
            ),
        },
    );
    const $ = cheerio.load(result.value);
    $('img').remove();
    $('br').replaceWith('\n');
    $('td, th').append(' | ');
    $('p, li, tr, h1, h2, h3, h4, h5, h6').append('\n');
    return $.root().text();
};

const readPdf = async (buffer: Buffer): Promise<string> => {
    // Text extraction uses the serverless PDF.js build, not native canvas rendering.
    // Load it only for PDFs so DOCX/validation requests do not initialize PDF.js.
    const { extractText, getDocumentProxy } = await import('unpdf');
    const document = await getDocumentProxy(new Uint8Array(buffer), {
        maxImageSize: 16_777_216,
    });
    try {
        if (document.numPages > MAX_IMPORT_PAGES) {
            throw new MealImportError('document_too_large');
        }
        const { text } = await extractText(document, { mergePages: false });
        // Reject image-only pages instead of silently importing only part of a plan.
        if (text.some((page) => !page.trim())) {
            throw new MealImportError('unreadable_document');
        }
        return text.join('\n\n');
    } finally {
        await document.loadingTask.destroy();
    }
};

// Add formats here; extraction and transport do not depend on the file format.
const readers: readonly DocumentReader[] = [
    {
        extension: '.docx',
        read: readDocx,
        signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    },
    { extension: '.pdf', read: readPdf, signature: Buffer.from('%PDF-') },
];

export const readMealDocument = async (
    file: Pick<File, 'name' | 'size' | 'arrayBuffer'>,
): Promise<string> => {
    if (file.size > MAX_IMPORT_FILE_SIZE) {
        throw new MealImportError('file_too_large');
    }
    const reader = readers.find(({ extension }) =>
        file.name.toLowerCase().endsWith(extension),
    );
    if (!reader) {
        throw new MealImportError('unsupported_type');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.subarray(0, reader.signature.length).equals(reader.signature)) {
        throw new MealImportError('invalid_file');
    }
    let text: string;
    try {
        text = (await reader.read(buffer)).trim();
    } catch (error) {
        if (error instanceof MealImportError) {
            throw error;
        }
        throw new MealImportError('unreadable_document');
    }
    if (!text) {
        throw new MealImportError('unreadable_document');
    }
    if (text.length > MAX_IMPORT_CHARACTERS) {
        throw new MealImportError('document_too_large');
    }
    return text;
};
