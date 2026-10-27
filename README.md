# HabitThread

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

**HabitThread** connects meal planning, nutrition, activities, and health measurements so everyday choices form one clear picture of your progress.

## Getting Started

After installing the dependencies, running `mise exec -- pnpm install`, configure `DATABASE_URL` in `.env.local`, then run the development server with `mise exec -- pnpm dev` and go to [http://localhost:3000](http://localhost:3000) on your browser to see the page.

Routes live in `src/app`. Server Components load initial data directly through the
server-only Drizzle services in `src/api`; `src/app/api` contains Route Handlers
for browser reads, CRUD, authentication, and meal-document uploads. Server Actions handle
profile forms, calendar saves, and accepting connection requests.

TanStack Query owns interactive browser data (search, pagination, calendar navigation,
and measurement charts). Server pages hydrate these queries with a 60-second stale
time. Each account gets a separate QueryClient and Jotai store, keyed by user ID in
the root layout. Private database reads are request-scoped, not persistently cached.
Home streams meals and measurements independently through Suspense boundaries.

The profile controls language; `/en/*` and `/gr/*` remain accepted through rewrites.
Translations use the next-i18next App Router provider. Calendar dates are initialized
from a shared request snapshot to keep server and browser hydration consistent.

## AI meal import

File import is gated by the Vercel boolean flag `meal-import`, defaulting to
hidden in every environment. Enable it for the intended users through Vercel
Flags; the tab and upload endpoint use the same flag. A disabled endpoint
returns 404 before reading the document or consuming AI quota.

For local import E2E tests, set `E2E_MEAL_IMPORT=true`, for example:
`E2E_MEAL_IMPORT=true mise exec -- pnpm test:e2e e2e/authenticated/meal-import.spec.ts e2e/authenticated/meal-import-save.spec.ts --project=authenticated`.
This override only applies in local E2E mode; normal app environments use Vercel Flags.

Set `OPENAI_API_KEY` in `.env.local` and in the appropriate Vercel deployment
environments. Never expose it through `NEXT_PUBLIC_` or commit it. API billing
is separate from ChatGPT. `OPENAI_MEAL_IMPORT_MODEL` optionally overrides the
default `gpt-4.1-mini`; choose a model supporting structured outputs.

Apply migrations with `mise exec -- pnpm db:migrate` before importing. The
`meal_import_usage` table atomically limits each user to 10 AI attempts per
UTC day. Provider failures count; invalid/unreadable documents and
missing configuration do not. There are no automatic provider retries.

PDF text extraction uses `unpdf`'s serverless PDF.js bundle with its worker
inlined; no native canvas or browser DOM globals are required. The parser loads
only for PDF requests.

Import preview screenshots have separate compact and food-database-enabled
baselines; verify both locally with `E2E_FOOD_DATABASE_SEARCH=false` and `true`.

Imports accept DOCX and text-based PDF files up to 4 MiB, 40,000 extracted
characters, and 20 PDF pages. Scanned/image-only and encrypted PDFs are not
supported; there is no OCR. Image-only PDF pages reject the whole import, but
images embedded alongside text are not interpreted. PDF text extraction can
lose layout information, so users must review the result. No days or times
are imported, and nothing is saved as a meal until the user confirms.

Document text is sent directly to OpenAI using the Vercel AI SDK, without AI
Gateway or tools. Requests disable response storage (`store: false`); this does
not disable the provider's abuse-monitoring retention. Review OpenAI's data
controls and your privacy notice before enabling imports for real user data.
Source files/text and raw AI responses are not persisted or logged by the app.
Only token counts are logged. Output is schema-validated and whitespace-normalized;
only exact duplicates are removed. Requests have a 45-second model timeout and
an 8,000-token output ceiling; incomplete output is rejected rather than saved.

To add a file format, implement a reader in `src/api/meal-import/read-document.ts`
and add its extension/signature to the reader registry. Update the picker, copy
and tests; the shared AI extraction and response contract remain unchanged.

## Tech

This project uses:

- [Mantine](https://mantine.dev/) for UI components.
- [Neon](https://neon.com/) PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) for the database.
- [NextAuth](https://next-auth.js.org/) with Google and email/password authentication.
- [Jotai](https://jotai.org/) for global state.
- [Next-i18n](https://github.com/isaachinman/next-i18next) for translations (EN/GR at the moment).

## Deployment

This project is deployed on [Vercel Platform](https://vercel.com).

## Database

Copy `.env.example` to `.env.local`. The same `DATABASE_URL` works with Neon and local PostgreSQL.

For a local database, start Docker PostgreSQL and apply the committed Drizzle migration:

```sh
mise exec -- pnpm db:local:up
mise exec -- pnpm db:migrate
```

For Neon, use its pooled connection string as `DATABASE_URL` for the app and
its direct connection string as `DATABASE_URL_UNPOOLED` for migrations. The
Drizzle configuration falls back to `DATABASE_URL` for local PostgreSQL.

## End-to-end tests

Playwright uses a separate PostgreSQL database and never uses `DATABASE_URL`
from the development environment. Copy the example environment, start the
ephemeral database, and run the suite:

```sh
cp .env.e2e.example .env.e2e
mise exec -- pnpm db:e2e:up
mise exec -- pnpm test:e2e
```

Local preparation applies the committed Drizzle migrations and clears only the
dedicated e2e database. The reset refuses to run unless the database name contains
`e2e`. Fixture provisioning then uses exactly the same application flows locally
and against previews: public registration, credentials login, profile and
measurement APIs, and professional discoverability settings.

`e2e/support/fixtures.ts` defines the client, professional, and visual scenarios.
Setup verifies persisted profiles, roles, and all measurement rows before tests
start; it does not infer readiness from a summary value or assume database IDs.
Relationships begin empty and are established by the journeys that test them.

Each invocation generates an `E2E_RUN_ID`, inherited by all workers. It scopes
account emails, discoverable client names, and ignored authentication files.
CI uses its workflow run ID and attempt number. To choose a namespace explicitly:

```sh
E2E_RUN_ID=my-isolated-run mise exec -- pnpm test:e2e
```

Use 1–32 lowercase letters, digits, or hyphens, starting with a letter or digit.
Do not share a namespace between simultaneous runs. `E2E_RUN_ID` replaces the
old `E2E_USER_EMAIL` and `VISUAL_E2E_USER_EMAIL` overrides. Setup fails on an
existing account rather than reusing possibly dirty state and does not retry
provisioning. Rerun with a fresh namespace after interrupted setup.

All test projects depend on `fixtures-setup`. Its `fixtures-cleanup` teardown
deletes run-owned accounts through their authenticated user API, verifying the
exact email before deletion, then removes their local session files. This also
covers accounts created by onboarding and connection journeys. Cleanup runs
after failed tests as well, but forced cancellation or failure before successful
login can leave accounts behind. Those accounts remain isolated by namespace;
dispose of the ephemeral preview database branch to remove such leftovers.
Never upload `playwright/.auth` or run the suite against production.

Stop the local e2e database with:

```sh
mise exec -- pnpm db:e2e:down
```

Vercel preview deployments use the Neon branch injected by the Neon–Vercel
integration. Preview builds apply committed Drizzle migrations to their isolated
branch, while production builds apply them to the production branch. After a
preview deployment succeeds, the existing Playwright workflow runs validation,
Jest, and all browser tests (including accessibility and professional journeys)
against the preview URL. It requires no Neon API key, database connection string,
privileged seed endpoint, or database reset.

To test an already-running preview yourself, supply the preview URL and any
deployment-protection bypass secret in your environment, then run:

```sh
E2E_MODE=preview PLAYWRIGHT_TEST_BASE_URL=https://your-preview.example \
    mise exec -- pnpm test:e2e
```

Preview migrations remain the build's responsibility. Fixture cleanup only
touches authenticated accounts created by that test invocation; it does not
enumerate or delete other preview users.

## Accessibility

Run `mise exec -- pnpm test:a11y` with the local e2e environment described above.
See [Accessibility testing](ACCESSIBILITY.md) for the coverage matrix, CI policy,
failure reports, and manual assistive-technology checklist.

## Misc

Interesting API: [spoonacular](https://spoonacular.com/food-api/docs).
