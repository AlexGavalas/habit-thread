# HabitThread

**HabitThread** connects meal planning, nutrition, activities, and health measurements so everyday choices form one clear picture of your progress.

## Features

- Track weight, body fat, and BMI, view measurement trends, and log daily activities.
- Plan meals in a weekly calendar and reuse meals from a personal meal pool.
- Set food preferences, height, target weight, and account language through onboarding and profile settings.
- Find other users, send and manage connection requests, and collaborate with nutrition professionals.

## Getting Started

After installing the dependencies, running `mise exec -- pnpm install`, configure `DATABASE_URL` in `.env.local`, then run the development server with `mise exec -- pnpm dev` and go to [http://localhost:3000](http://localhost:3000) on your browser to see the page.

## Architecture

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

Database definitions live in [`src/db/schema`](src/db/schema), with committed
migrations in [`drizzle`](drizzle). Use these as the source of truth rather than
maintaining a separate copy of the schema or API contracts in documentation.

## AI meal import

Optional DOCX and PDF meal import is controlled by the `meal-import` feature flag.
See the [AI meal import guide](docs/meal-import.md) for configuration, limits,
privacy considerations, and extension points.

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

See the [writing-tests skill](.agents/skills/writing-tests/SKILL.md) for testing
conventions and its [E2E setup guide](.agents/skills/writing-tests/references/e2e-setup.md)
for local and preview commands, isolated fixtures, cleanup, and feature-flag checks.
Never run the browser suite against production or a development database.

## Accessibility

Run `mise exec -- pnpm test:a11y` with the local environment in the E2E setup guide.
See [Accessibility testing](ACCESSIBILITY.md) for the coverage matrix, CI policy,
failure reports, and manual assistive-technology checklist.

## Misc

Interesting API: [spoonacular](https://spoonacular.com/food-api/docs).
