/** @jest-environment node */
import { File } from 'node:buffer';

import {
    MAX_IMPORT_CHARACTERS,
    MAX_IMPORT_FILE_SIZE,
} from '~schemas/meal-import';
import { createMealDocx } from '~test/meal-import-fixtures';

import { readMealDocument } from './read-document';

const mockDestroy = jest.fn<Promise<void>, []>();
const mockExtractText = jest.fn<
    Promise<{ text: string[]; totalPages: number }>,
    []
>();
const mockDocument = {
    loadingTask: { destroy: mockDestroy },
    numPages: 2,
};

jest.mock('unpdf', () => ({
    extractText: jest.fn(() => mockExtractText()),
    getDocumentProxy: jest.fn(() => Promise.resolve(mockDocument)),
}));

describe('meal document readers', () => {
    beforeEach(() => {
        mockDocument.numPages = 2;
        mockDestroy.mockResolvedValue(undefined);
        mockExtractText.mockResolvedValue({
            text: ['Eggs', 'Γιαούρτι 200g'],
            totalPages: 2,
        });
    });

    it('reads paragraphs and every table row/column, including short meals', async () => {
        expect.hasAssertions();
        const buffer = await createMealDocx(
            '<w:p><w:r><w:t>Γιαούρτι 200g</w:t></w:r></w:p>' +
                '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Eggs</w:t></w:r></w:p></w:tc>' +
                '<w:tc><w:p><w:r><w:t>Rice 150g</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
        );
        const text = await readMealDocument(
            new File([buffer], 'schedule.DOCX'),
        );
        expect(text).toContain('Γιαούρτι 200g');
        expect(text).toContain('Eggs');
        expect(text).toContain('Rice 150g');
    });

    it('joins PDF page content without page-footer artifacts', async () => {
        expect.hasAssertions();
        await expect(
            readMealDocument(new File(['%PDF-1.4'], 'plan.pdf')),
        ).resolves.toBe('Eggs\n\nΓιαούρτι 200g');
    });

    it.each([
        ['plan.doc', 'legacy', 'unsupported_type'],
        ['plan.pdf', 'not a pdf', 'invalid_file'],
        ['plan.docx', 'not a zip', 'invalid_file'],
        ['plan.docx', 'PK\u0003\u0004broken', 'unreadable_document'],
    ])('rejects %s with %s', async (name, content, code) => {
        expect.hasAssertions();
        await expect(
            readMealDocument(new File([content], name)),
        ).rejects.toMatchObject({ code });
    });

    it('bounds the file before parsing', async () => {
        expect.hasAssertions();
        await expect(
            readMealDocument(
                new File([Buffer.alloc(MAX_IMPORT_FILE_SIZE + 1)], 'plan.pdf'),
            ),
        ).rejects.toMatchObject({ code: 'file_too_large' });
    });

    it('rejects too many PDF pages before extracting text and releases the document', async () => {
        expect.hasAssertions();
        mockDocument.numPages = 21;
        await expect(
            readMealDocument(new File(['%PDF-1.4'], 'long.pdf')),
        ).rejects.toMatchObject({ code: 'document_too_large' });
        expect(mockExtractText).not.toHaveBeenCalled();
        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('rejects mixed text/image-only pages instead of importing a partial plan', async () => {
        expect.hasAssertions();
        mockExtractText.mockResolvedValueOnce({
            text: ['Eggs', ''],
            totalPages: 2,
        });
        await expect(
            readMealDocument(new File(['%PDF-1.4'], 'mixed.pdf')),
        ).rejects.toMatchObject({ code: 'unreadable_document' });
        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('releases the PDF document when text extraction fails', async () => {
        expect.hasAssertions();
        mockExtractText.mockRejectedValueOnce(new Error('Corrupt page'));
        await expect(
            readMealDocument(new File(['%PDF-1.4'], 'broken.pdf')),
        ).rejects.toMatchObject({ code: 'unreadable_document' });
        expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('rejects empty and oversized DOCX text without truncation', async () => {
        expect.hasAssertions();
        const empty = await createMealDocx('');
        const oversized = await createMealDocx(
            `<w:p><w:r><w:t>${'a'.repeat(MAX_IMPORT_CHARACTERS + 1)}</w:t></w:r></w:p>`,
        );
        await expect(
            readMealDocument(new File([empty], 'empty.docx')),
        ).rejects.toMatchObject({ code: 'unreadable_document' });
        await expect(
            readMealDocument(new File([oversized], 'large.docx')),
        ).rejects.toMatchObject({ code: 'document_too_large' });
    });
});
