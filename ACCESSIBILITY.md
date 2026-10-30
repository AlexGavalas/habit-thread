# Accessibility testing

HabitThread targets WCAG 2.2 Level AA. Automated checks protect specific rendered
states; they do not establish full WCAG conformance or replace assistive-technology
testing.

## Run the checks

Use the toolchain declared in `.mise.toml`:

```sh
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm exec playwright install chromium
cp .env.e2e.example .env.e2e
mise exec -- pnpm db:e2e:up
mise exec -- pnpm test:a11y
mise exec -- pnpm test --runInBand
mise exec -- pnpm validate
```

Do not overwrite an existing `.env.e2e`. The browser suite builds and starts the
production app, migrates and resets the dedicated e2e database, and seeds client
and professional accounts. The database name must contain `e2e`; never point this
at development, shared, or production data. Stop the database afterwards with
`mise exec -- pnpm db:e2e:down`.

The `@a11y` tag selects accessibility journeys; fixture setup and cleanup still
run. These tests also run as part of `test:e2e`. The existing Playwright workflow
runs validation, Jest, and the complete browser suite after successful preview
deployments. Shared application-level provisioning covers professional accounts
in both local and preview modes, without CI database credentials or a separate
accessibility workflow. See the testing skill's [E2E setup guide](.agents/skills/writing-tests/references/e2e-setup.md)
for run namespaces and cleanup. Repository administrators should make **End-to-end and accessibility**
a required branch-protection check.

## Current automated coverage

| Surface                           | Browser states                                                            | Interaction assertions                                                                              |
| --------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Public, desktop and mobile        | Landing, registration, duplicate-email error, login                       | Keyboard opening, initial focus inside dialogs, forward/backward tab wrapping, Escape, focus return |
| Onboarding, desktop and mobile    | Welcome and choice dialogs                                                | Transition between the two states                                                                   |
| Authenticated, desktop and mobile | Home, meal plan, schedule drawer                                          | Keyboard opening, dialog focus wrapping, Escape, focus return                                       |
| Professional, desktop             | Populated dashboard, client meal-plan drawer                              | Existing invitation/search/open/close journey                                                       |
| Components (Jest)                 | Onboarding welcome/choice, login dialog, copy button before/after copying | Dialog/close-button names; copy button name and keyboard activation                                 |

The food database basket additionally scans the populated selected-food state on
desktop and mobile, including modal controls, and checks that selected foods
disappear from search and return when removed. These journeys run by default
locally and in preview CI.

The duplicate-email response is deliberately stubbed to exercise the real form
and alert deterministically without creating accounts. Other browser scans use
the running app and seeded database. Initial browser coverage uses Chromium,
English, and the default light theme; mobile cases use mobile-sized viewports,
not real mobile devices.

## Adding coverage and handling failures

- Use `AppDrawer`, `AppModal`, or `AppModalRoot` from `src/components/overlays`
  for app dialogs, and `ContextModalsProvider` for managed/context modals. They
  share one account-scoped overlay stack for z-index, focus, and Escape handling.
  One Escape dismisses only the topmost dismissible layer; a layer that disables
  Escape blocks dismissal of layers below it. Do not add independent window
  Escape handlers for dialogs or bypass the shared wrappers.
- Add `@a11y` to a relevant Playwright test and call `expectAccessible(page, state)`
  from `e2e/support/accessibility.ts` after asserting the intended state is ready.
- Scan the whole page, not just a component subtree: dialogs and popovers use
  portals, and opening them can affect the rest of the page.
- The helper waits for fonts and finite animations, runs axe's supported WCAG
  A/AA rules through 2.2, and fails on every reported violation regardless of impact.
  Soft assertions collect multiple failing states but still fail the test.
- Open `playwright-report/index.html` via `mise exec -- pnpm exec playwright show-report`.
  Each scan attaches JSON with its URL, state, axe version, violations, and
  incomplete results. Nodes include selectors, HTML, remediation details, and
  rule documentation links. Review incomplete results manually.
- CI retains the HTML report and test results for 30 days. Do not upload real
  user sessions or data when reproducing failures.
- Prefer shared fixes and add behavior assertions for focus, names, errors, and
  keyboard operation. In component tests, scan `baseElement` when portals are
  involved. JSDOM does not reliably check contrast or visual layout.
- Do not disable browser rules, filter out lower-impact violations, or accept
  failures through an auto-updated baseline. Any exceptional false-positive
  suppression needs a narrow target, explanation, owner, issue, and expiry date.
  The isolated copy-button fixture disables only the page-landmark rule, since
  that rule is not a component responsibility.

## Manual review checklist

Perform this for significant interaction/layout changes and before releases.
Record the commit, browser/OS/assistive-technology versions, journeys checked,
results, and follow-up issues in the PR or release review.

- Complete primary tasks using only Tab, Shift+Tab, Enter, Space, arrow keys, and
  Escape. Check logical focus order, visible focus, no unintended traps, and
  focus not hidden by sticky UI.
- With VoiceOver/Safari and NVDA/a supported Windows browser, check landmarks,
  headings, reading order, form labels/errors, dialog names, route changes, and
  save/error announcements.
- At 200% text resizing and 400% browser zoom, check reflow, clipped content,
  unnecessary horizontal scrolling, and reachable actions.
- Check contrast, non-color state indicators, forced colors, reduced motion,
  and touch target sizes. Check charts have useful text/data alternatives.
- Verify dragging operations have usable keyboard and non-drag pointer
  alternatives. Include people who use assistive technology when possible.

## Next coverage increments

Add populated/empty meal editors and complete keyboard move/swap journeys,
schedule validation and selects, navigation menus, settings/connections forms,
nutrition/measurement charts, and destructive confirmations. Extend scans to
Greek, supported color schemes, and Firefox/WebKit keyboard smoke tests.
Existing screenshots complement these checks but are not accessibility evidence
on their own.
