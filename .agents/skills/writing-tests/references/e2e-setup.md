# End-to-end test setup

Run commands from the repository root using the toolchain in `.mise.toml`.

## Local environment

Playwright uses a separate PostgreSQL database and never uses `DATABASE_URL`
from the development environment. Copy the example environment, start the
ephemeral database, and run the suite:

```sh
cp .env.e2e.example .env.e2e
mise exec -- pnpm db:e2e:up
mise exec -- pnpm test:e2e
```

Do not overwrite an existing `.env.e2e`.

Local preparation applies the committed Drizzle migrations and clears only the
dedicated e2e database. The reset refuses to run unless the database name contains
`e2e`. Fixture provisioning then uses exactly the same application flows locally
and against previews: public registration, credentials login, and profile and
measurement APIs.
Professional accounts are automatically visible; provisioning verifies this
without a separate professional discoverability toggle.

`e2e/support/fixtures.ts` defines the client, professional, and visual scenarios.
Setup verifies persisted profiles, roles, and all measurement rows before tests
start; it does not infer readiness from a summary value or assume database IDs.
Relationships begin empty and are established by the journeys that test them.

## Run isolation and cleanup

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

## Fonts and screenshot consistency

The app self-hosts the pinned `@fontsource-variable/noto-sans` font files,
and Mantine uses that family for body text, controls, and headings. Keep the
same Playwright version locally and in the CI container.

All Playwright projects launch Chromium with `--font-render-hinting=none`.
Without it, Linux rounds glyph advances differently from macOS, which can
change line wrapping and screenshot dimensions even with identical font files.
Keep this option when configuring browser launches; do not compensate by
changing font sizes or loosening screenshot thresholds. Playwright waits for
fonts to load before taking screenshot assertions.

## Preview deployments

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

## Meal-import checks

Run the import E2E tests directly:

```sh
mise exec -- pnpm test:e2e e2e/authenticated/meal-import.spec.ts e2e/authenticated/meal-import-save.spec.ts --project=authenticated
```

File import and food database search are always enabled. Local E2E mode clears
`OPENAI_API_KEY` so uploaded documents never reach a paid external provider.

Import preview screenshots use the wide meal-library layout.
See the [meal import guide](../../../../docs/meal-import.md) for provider
configuration, document limits, and privacy considerations.
