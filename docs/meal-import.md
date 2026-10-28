# AI meal import

## Configuration

File import is always available in the meal library. The upload endpoint
requires authentication; missing OpenAI configuration returns an `unavailable`
error (503) for valid documents without consuming AI quota.

Set `OPENAI_API_KEY` in `.env.local` and in the appropriate Vercel deployment
environments. Never expose it through `NEXT_PUBLIC_` or commit it. API billing
is separate from ChatGPT. `OPENAI_MEAL_IMPORT_MODEL` optionally overrides the
default `gpt-4.1-mini`; choose a model supporting structured outputs.

Apply migrations with `mise exec -- pnpm db:migrate` before importing. The
`meal_import_usage` table atomically limits each user to 10 AI attempts per
UTC day. Provider failures count; invalid/unreadable documents and
missing configuration do not. There are no automatic provider retries.

## Supported documents

Imports accept DOCX and text-based PDF files up to 4 MiB, 40,000 extracted
characters, and 20 PDF pages. Scanned/image-only and encrypted PDFs are not
supported; there is no OCR. Image-only PDF pages reject the whole import, but
images embedded alongside text are not interpreted. PDF text extraction can
lose layout information, so users must review the result. No days or times
are imported, and nothing is saved as a meal until the user confirms.

PDF text extraction uses `unpdf`'s serverless PDF.js bundle with its worker
inlined; no native canvas or browser DOM globals are required. The parser loads
only for PDF requests.

## Privacy and model behavior

Document text is sent directly to OpenAI using the Vercel AI SDK, without AI
Gateway or tools. Requests disable response storage (`store: false`); this does
not disable the provider's abuse-monitoring retention. Review OpenAI's data
controls and your privacy notice before configuring imports for real user data.
Source files/text and raw AI responses are not persisted or logged by the app.
Only token counts are logged. Output is schema-validated and whitespace-normalized;
only exact duplicates are removed. Requests have a 45-second model timeout and
an 8,000-token output ceiling; incomplete output is rejected rather than saved.

## Development

To add a file format, implement a reader in
[`src/api/meal-import/read-document.ts`](../src/api/meal-import/read-document.ts)
and add its extension/signature to the reader registry. Update the picker, copy
and tests; the shared AI extraction and response contract remain unchanged.

See the testing skill's [meal-import checks](../.agents/skills/writing-tests/references/e2e-setup.md#meal-import-checks)
for local verification and screenshot coverage.
