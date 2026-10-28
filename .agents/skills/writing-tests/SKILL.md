---
name: writing-tests
description: Write and revise focused, reliable tests in HabitThread using Jest, React Testing Library, and Playwright. Use when adding tests, fixing regressions, or reviewing test coverage and reliability.
---

# Writing tests

Follow applicable `AGENTS.md` instructions. Existing tests are examples, not exceptions to those rules. Read the code under test, nearby tests, and shared setup before choosing coverage.

## Choose useful coverage

- Test observable behavior and contracts, not private methods, component state, incidental markup, or internal call sequences. A behavior-preserving refactor should not require rewriting or adding tests.
- Use the lowest layer that reproduces the risk: pure rules and schemas in Jest; components and hooks with React Testing Library; real browser behavior, critical journeys, persistence, and layout with Playwright.
- For bug fixes, add a regression that fails for the original cause and passes with the fix. Cover meaningful boundaries and failure modes, not every implementation branch or every combination.
- Include relevant invalid input, authorization, empty states, pending states, failure/retry, and rollback cases. Do not duplicate every case across layers; use browser tests to verify that the pieces work together.

## Keep tests easy to read

- Colocate Jest tests as `*.test.ts` or `*.test.tsx`; put Playwright specs in the appropriate `e2e/{public,authenticated,professional,visual}` directory.
- Name tests for a condition and its expected outcome. Keep arrange, act, and assert easy to distinguish, with one coherent behavior per test; multiple assertions are useful when they describe that behavior.
- Use small, explicit fixtures with the actual application types. Never bypass types or use type casts; use type annotations or `satisfies` to check fixtures and mocks against their actual contracts.
- Reuse existing helpers when they fit; extract shared setup only when it removes meaningful duplication without hiding the scenario. Do not suffix helper or other identifiers with `Harness`; name them for their purpose.
- Use `it.each`/`test.each` for the same rule applied to different inputs, not unrelated scenarios. Keep expected results independent of the implementation being tested. Do not use snapshot unit tests.

## Jest and React Testing Library

- Use `renderWithUser`, `screen`, and other exports from `~test/utils`. The render helper supplies Mantine, the app theme, translations, and a fresh `userEvent` session. Await user interactions.
- Prefer role and accessible name or label queries, scoped with `within` when needed. Use `getBy*` for present content, `queryBy*` for absence, and `findBy*` for content that appears asynchronously. Avoid CSS selectors and test IDs when an accessible query expresses the behavior.
- Assert visible results with jest-dom matchers. Test hooks through their public contract with `renderHook`; wrap direct state-changing hook calls in `act`.
- Perform a single action per `act` call and keep all assertions outside `act`. Await completion of that action within the same call when necessary.
- Await promises and async assertions. Use `waitFor` for assertions, not actions that could repeat. Control races with deferred promises rather than sleeps; `~test/meal-plan` provides an existing `deferred` helper.
- Give each test fresh Jotai stores and QueryClients where applicable. Reuse `createMealPlanTestContext` from `~test/meal-plan` for meal-plan hooks; clear its QueryClient after use. Disable query retries in isolated tests.
- Mock boundaries such as network, database, authentication, and framework effects, not the rule being tested. Assert calls when the call itself is the contract, such as an authorized write or cache invalidation.
- Check `src/test/setup.ts`: it already supplies browser shims, router mocking, jest-dom/axe matchers, and mocks for several Server Actions. Use `jest.unmock` for an action module when testing its real implementation.
- `jest.config.ts` clears call history, not mock implementations. Set explicit defaults per test and restore spies, fake timers, and modified globals in cleanup hooks. Use fake timers only for time-dependent behavior, restore real timers afterwards, and configure user-event timer advancement when needed. Jest scripts already run with `TZ=UTC`; fix the clock when behavior uses now.

## Playwright, visual checks, and accessibility

- Use accessible locators and Playwright's auto-waiting actions and retrying assertions. Wait for an observable ready state, not arbitrary timeouts. Keep tests independent: no reliance on another test's mutations or execution order.
- Exercise real application flows for critical journeys. Stub requests narrowly for otherwise hard-to-reproduce failures; verify actual persistence by reloading when persistence is the behavior under test.
- Reuse `e2e/support` fixtures, authentication, and layout helpers. Read [E2E setup](references/e2e-setup.md) before running browser tests: it covers the dedicated local e2e database or isolated preview, run-scoped accounts, managed cleanup, and meal-import checks. Never target production, reuse a concurrent run's namespace, or commit credentials/authentication state.
- For visible changes, use `toHaveScreenshot` at relevant desktop/mobile sizes; use `expectModalScreenshot` for dialogs and `expectNoHorizontalOverflow` for overflow checks. Inspect image diffs before accepting baseline changes; never loosen thresholds or update baselines just to make a failure pass.
- Follow `ACCESSIBILITY.md`: combine keyboard/focus/name assertions with axe scans. Use `expectAccessible` from `e2e/support/accessibility.ts` and the `@a11y` tag for browser coverage; scan `baseElement` for component tests with portals. Automated scans do not replace interaction or manual accessibility checks.

## Verify

Use the toolchain in `.mise.toml`:

```sh
mise exec -- pnpm test --runInBand --runTestsByPath src/path/example.test.ts
mise exec -- pnpm test:e2e e2e/authenticated/example.spec.ts --project=authenticated
mise exec -- pnpm validate
```

Replace example paths with relevant tests; prepare the e2e environment as documented before running browser tests. Run broader tests when shared behavior changes. Report exactly which checks ran and which were blocked or skipped. Treat coverage as a way to find untested risks, not a reason to add low-value assertions or weaken existing checks.
