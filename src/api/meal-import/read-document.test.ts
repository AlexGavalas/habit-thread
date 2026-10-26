/** @jest-environment node */
import { File } from 'node:buffer';

import {
    MAX_IMPORT_CHARACTERS,
    MAX_IMPORT_FILE_SIZE,
} from '~schemas/meal-import';
import { createMealDocx } from '~test/meal-import-fixtures';

import { readMealDocument } from './read-document';

jest.mock('pdf-parse', () => ({
    PDFParse: jest.fn().mockImplementation(() => ({
        destroy: jest.fn().mockResolvedValue(undefined),
        getInfo: jest.fn().mockResolvedValue({ total: 2 }),
        getText: jest.fn().mockResolvedValue({
            pages: [{ text: 'Eggs' }, { text: 'Γιαούρτι 200g' }],
        }),
    })),
}));

describe('meal document readers', () => {
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
