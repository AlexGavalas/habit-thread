---
name: server-mutations
description: Implement and review HabitThread Server Actions, mutation route handlers, and shared data writes. Use when changing input validation, authorization, transactions, mutation results, or server cache invalidation.
---

# Server mutations

Follow applicable `AGENTS.md` instructions. Read the relevant installed Next.js guides in `node_modules/next/dist/docs/` before changing framework code. Existing implementations illustrate the domain; legacy broad catches, storage-shaped contracts, or weak validation are not exceptions to current rules.

## Choose the boundary

- Prefer Server Actions for first-party app mutations. Add or retain an HTTP endpoint only for a concrete consumer or HTTP requirement.
- Keep route entry points and Server Actions in `src/app`; keep reusable business and data operations in `src/api`, protected with `server-only` where appropriate. Actions imported by clients belong in a dedicated file with `'use server'`.
- Keep transport entry points thin. Share validation rules, authorization policies, and business operations beneath transports instead of implementing different rules for an action and a route.

## Validate and authorize

- Accept external action input as `unknown`. Parse request bodies, query parameters, and external service responses at their boundaries with Zod; reuse schemas in `src/schemas` and infer input types from them.
- Never bypass types or use type casts. Use actual types and validated values. Map storage names to camelCase at the data boundary for new domain/UI contracts; infer database records from Drizzle.
- Obtain the actor from the server session, never from a submitted identity. A submitted owner identifies the target, not permission to act on it.
- Authenticate and authorize every externally callable mutation, even if the page already checked access. Reuse `getCurrentUser` from `src/api/session.ts` and the policies exported through `src/api/professional.ts`.
- For delegated meal-plan writes, distinguish actor from owner and reuse `canAccessMealPlan`/`requireMealPlanAccess` in `src/api/professional/access.ts`. Access requires an active relationship and professional role unless the actor is the owner; delegated editing does not grant owner-only note/rating changes.
- Scope updates and deletes by the authorized owner as well as record IDs. Explicitly select allowed writable fields; never spread untrusted input into database writes. Check operation-specific constraints such as date ranges and allowed transitions.

## Preserve data integrity

- Put related writes in one transaction and pass its database handle through shared operations. Do not report success or invalidate caches before the transaction commits.
- Decide how overlapping writes and retries behave. Use database constraints, atomic operations, or scoped locking when needed; client-side disabled controls are not concurrency protection.
- For meal/week changes, inspect `src/api/meal-plan.ts`, `src/api/meal-plan-lock.ts`, and `src/api/copy-meal-week.ts` together. Preserve their shared owner-scoped locking and retry-safe slot behavior rather than introducing an independent write path.
- Retry a write only when its semantics are safe after a lost response. Do not assume a timeout means nothing was committed.

## Return results and refresh consumers

- Use typed discriminated results for expected failures, with stable reasons such as invalid input or forbidden access. Keep user-facing translations and notifications in the UI/hook layer.
- Throw unexpected failures from business/data functions. At HTTP boundaries, translate errors to appropriate status codes without exposing internals; do not blanket-catch infrastructure failures as ordinary validation failures or empty success.
- Return only serializable data the caller needs. Do not expose raw records containing private fields, credentials, or internal error details.
- Invalidate affected server paths/tags after a successful write using the installed Next.js APIs. Existing meal mutations refresh `/home` and `/meal-plan`; inspect all consumers rather than copying this list for unrelated features.
- Server revalidation and the browser's TanStack Query cache are separate responsibilities. Return enough authoritative data for client reconciliation or define the relevant client invalidation in the consuming hook; use the `client-data-flow` skill for that work.

## Verify

Use the `writing-tests` skill. Cover malformed input, missing authentication, unauthorized owner/record IDs, delegated restrictions, transaction failure, and successful results/invalidation as relevant. For retry-sensitive operations, cover duplicate submission and overlapping writes. Assert that rejected requests cannot write or invalidate.

Run relevant Jest tests and `mise exec -- pnpm validate`. Use Playwright for changed critical persistence journeys against the documented isolated E2E environment. Report checks actually run and any skipped or blocked checks.
