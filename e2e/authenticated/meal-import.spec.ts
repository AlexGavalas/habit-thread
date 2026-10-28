import { expect, test } from '@playwright/test';

import en from '../../public/locales/en/common.json';
import {
    createMealDocx,
    createMealPdf,
} from '../../src/test/meal-import-fixtures';
import { loadE2eEnvironment } from '../support/environment';

test('reviews, edits and removes imported meals before explicitly saving', async ({
    page,
}) => {
    await page.route('**/api/v1/pool/upload', (route) =>
        route.fulfill({
            json: { data: ['Eggs', 'Γιαούρτι 200g', 'Rice 150g'] },
        }),
    );
    await page.goto('/meal-plan');
    await page
        .getByRole('button', { exact: true, name: en.meal_plan.meal_library })
        .click();
    const dialog = page.getByRole('dialog', {
        name: en.modals.meal_pool.title,
    });
    await dialog
        .getByRole('tab', { name: en.modals.meal_pool.tabs.import })
        .click();
    await expect(dialog.getByText(en.file_types_info)).toBeVisible();
    const input = dialog.locator('input[type="file"]');
    await expect(input).toHaveAttribute('accept', '.docx,.pdf');
    await input.setInputFiles({
        buffer: createMealPdf(),
        mimeType: 'application/pdf',
        name: 'schedule.pdf',
    });
    await dialog
        .getByRole('button', { exact: true, name: en.confirmation.yes })
        .click();
    const firstMeal = dialog.getByRole('textbox', {
        exact: true,
        name: 'Meal 1',
    });
    await expect(firstMeal).toHaveValue('Eggs');
    await firstMeal.fill('Eggs with toast');
    await dialog
        .getByRole('button', { exact: true, name: 'Remove meal 2' })
        .click();
    await expect(
        dialog.getByRole('textbox', { exact: true, name: 'Meal 2' }),
    ).toHaveValue('Rice 150g');
    await expect(firstMeal).toHaveValue('Eggs with toast');
    await expect(dialog).toHaveScreenshot('meal-import-preview-wide.png');
    const saved = page.waitForRequest(
        (request) =>
            request.url().endsWith('/api/v1/pool/meal') &&
            request.method() === 'POST',
    );
    await dialog.getByRole('button', { exact: true, name: en.create }).click();
    const saveRequest = await saved;
    expect(saveRequest.postDataJSON()).toStrictEqual({
        templates: [
            { content: 'Eggs with toast', items: [] },
            { content: 'Rice 150g', items: [] },
        ],
    });
    await expect(dialog).toBeHidden();
});

test('reads real PDF and DOCX documents and rejects scanned, corrupt and oversized-page PDFs', async ({
    request,
}) => {
    test.skip(
        loadE2eEnvironment().mode !== 'local',
        'Requires the local no-provider configuration',
    );
    const docx = await createMealDocx(
        '<w:p><w:r><w:t>Γιαούρτι 200g</w:t></w:r></w:p>',
    );
    const documents = [
        {
            buffer: createMealPdf(),
            code: 'unavailable',
            name: 'plan.pdf',
            status: 503,
        },
        { buffer: docx, code: 'unavailable', name: 'plan.docx', status: 503 },
        {
            buffer: createMealPdf(['']),
            code: 'unreadable_document',
            name: 'scan.pdf',
            status: 422,
        },
        {
            buffer: createMealPdf(Array.from({ length: 21 }, () => 'Eggs')),
            code: 'document_too_large',
            name: 'long.pdf',
            status: 413,
        },
        {
            buffer: Buffer.from('%PDF-broken'),
            code: 'unreadable_document',
            name: 'broken.pdf',
            status: 422,
        },
        {
            buffer: Buffer.from('legacy doc'),
            code: 'unsupported_type',
            name: 'old.doc',
            status: 415,
        },
    ];
    for (const document of documents) {
        const response = await request.post('/api/v1/pool/upload', {
            multipart: {
                file: {
                    buffer: document.buffer,
                    mimeType: 'application/octet-stream',
                    name: document.name,
                },
            },
        });
        expect(response.status(), document.name).toBe(document.status);
        expect(await response.json(), document.name).toStrictEqual({
            code: document.code,
        });
    }
});
