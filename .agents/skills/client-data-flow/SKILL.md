---
name: client-data-flow
description: Implement and review HabitThread client queries, mutations, editors, and shared state. Use when choosing state ownership, managing unsaved drafts, reconciling caches, or handling pending writes, failures, and navigation races.
---

# Client data flow

Follow applicable `AGENTS.md` instructions. Trace the server contract and all consumers before changing a data flow. Existing hooks show domain behavior, not permission to copy legacy placement, duplicated lifecycle state, type casts, or storage-shaped contracts.

## Choose one owner for each value

- Use React state for local interactions, Jotai for shared client-only state including shared unsaved drafts, and TanStack Query for server data and mutation lifecycle state.
- Derive filtered data, totals, dirty state, and pending flags from their source instead of maintaining synchronized copies. A draft is deliberately editable state, not a second server cache; define when it is initialized, committed, reset, or discarded.
- Keep feature-specific hooks/helpers near the feature. Put genuinely cross-feature hooks in `src/hooks`; reserve `src/store` for shared client state and accessors, not general fetching or business logic.
- Extract pure calculations into ordinary functions. Extract hooks for coherent state/effect lifecycles, not merely to shorten components.

## Fetch trustworthy, correctly scoped data

- Include every input that changes the returned data in the query key, especially owner, week/date range, filters, and search. Reuse existing key builders where available; avoid separate key definitions for reads and writes.
- Resolve the effective owner consistently through `src/features/meal-plan-owner/meal-plan-owner.tsx`. Do not fetch or mutate while the required identity is unresolved; cache scope is not server authorization.
- For meal data, reuse `getMealsQueryKey` in `src/store/hooks/meal-mutation-state.ts`. Seed initial data only when it belongs to the exact query scope, not merely the same component.
- Keep query functions focused on fetching. Check HTTP status, parse JSON responses with a runtime schema, and throw on transport/schema failures. Never bypass types or use type casts; use the actual schema-derived contract.
- Pass the query's abort signal to fetch where applicable. Keep loading, successful empty data, and failed reads distinct in the UI; do not make errors look like empty results.
- Do not reset drafts, submission errors, or unrelated UI state from a query function or refetch. Make those transitions explicit in the interaction that owns them.

## Make mutation lifecycle explicit

- Prefer first-party Server Actions and use the `server-mutations` skill for server changes. Handle their discriminated results deliberately; do not treat a resolved failure result as a successful write.
- Use TanStack Query mutation state for shared server-write lifecycle. Derive cross-component pending/error state from the mutation cache where needed rather than creating another shared `isSaving` flag.
- Capture owner, week, affected records/slots, and payload in mutation variables at submission. Success, rollback, and invalidation must use those variables, not whatever owner/week is currently visible after navigation.
- Keep user notifications in UI/hooks and translate all user-facing messages. Preserve the draft on failure; close/reset an editor only after success. Prevent duplicate submits while allowing the user to recover and retry.
- Treat local modal submission coordination separately from shared write state; `src/features/modals/use-editor-submit.ts` illustrates close/error handling. Do not copy lifecycle flags into unrelated components.
- Await required reconciliation/invalidation before reporting completion when the UI depends on it. Refresh all affected query scopes, not the entire cache by default. Server path revalidation does not invalidate TanStack Query automatically.

## Handle optimistic updates and overlapping writes

- Choose optimism only when the expected result and rollback are clear. Pending feedback without removing data can be safer for destructive changes; `src/store/hooks/meals.ts` keeps deleting meals visible until confirmed.
- Before an optimistic update, cancel affected in-flight reads and capture the data needed for rollback. On success, reconcile with authoritative returned records, including generated IDs.
- Roll back only the records/slots touched by the failed mutation. Restoring a whole-query snapshot can erase an unrelated successful edit.
- Define which writes conflict. Block or serialize overlapping writes while allowing independent edits when safe; a mutation key groups writes but does not itself serialize them.
- Reuse the meal-plan write coordination in `src/store/hooks/meal-mutation-state.ts` and `src/store/hooks/use-meal-mutation.ts`. Account for operations affecting multiple weeks, such as week-copy, and prevent stale refetches from overwriting pending edits.
- Do not automatically retry non-idempotent writes. A lost response may follow a committed write; retries must agree with the server's duplicate-handling contract.
- Completing a background write must not redirect a user who navigated elsewhere or overwrite the newly visible scope. Inspect `src/store/hooks/weekly-schedule.ts` for the existing navigation guard.

## Verify

Use the `writing-tests` skill. Test relevant pending/success/failure transitions, retained drafts, generated-ID reconciliation, overlapping edits, targeted rollback, and navigation or owner changes during a write. Use deferred promises rather than timing delays.

Run relevant Jest tests and `mise exec -- pnpm validate`. Use Playwright for changed critical journeys and verify persistence after reload where applicable. Report checks actually run and any skipped or blocked checks.
