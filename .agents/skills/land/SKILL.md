---
name: land
description: >-
    Land requested HabitThread changes through a verified GitHub pull request and
    squash merge into master. Invoke only when the user explicitly requests landing
    or merging changes, not merely review, preparation, passing checks, or skill
    installation.
disable-model-invocation: true
metadata:
    delta-action: land
---

# Land HabitThread changes

## Scope and authorization

This workflow applies to `AlexGavalas/habit-thread`. An explicit invocation of
`/land` or an equivalent landing request authorizes the workflow, including
publishing the requested changes and merging their PR. Proceed without asking for
the same permission again. Stop for genuine blockers, ambiguous scope, or unmet
requirements. Installing this skill alone does not authorize landing.

Use GitHub pull requests targeting `master`, published through `origin`, with a
squash merge. Do not push directly to `master`, use the `local` remote for
publication, bypass protections, or force-push. Verify these defaults against the
current repository settings before executing; stop if they are no longer suitable.

**Conflict preference: pause and wait for the user's decision.** Do not resolve
merge conflicts automatically, including apparently obvious conflicts. Identify
the files, preserve the conflicted state, and report that the changes have not
landed.

## Preflight and preparation

1. Read applicable `AGENTS.md`/`AGENT.md`, contribution instructions, PR templates,
   and any changed verification definitions. Honor applicable signing, authorship,
   contributor agreements, reviews, issue metadata, tests, changelog, and
   documentation requirements. Preserve their conditions and exceptions. Do not
   invent requirements that this repository does not establish. If human-authored
   submission text is required, obtain the text; generated text approved by a human
   is not a substitute.
2. Inspect status, staged and unstaged diffs, untracked files, current branch,
   history, and remotes. Establish exactly which change the request covers. Include
   relevant tests, artwork, translations, and screenshot baselines, but not
   unrelated edits, generated build output, credentials, or auth state. Never
   blanket-stage or discard unrelated work. Stop if scope cannot be established.
3. Confirm `origin` identifies `AlexGavalas/habit-thread`, GitHub authentication is
   available, and the account has publication/merge permission. Fetch
   `origin/master`. Inspect live branch protection and rulesets, permitted merge
   methods, required checks and reviews, and merge-queue requirements. A permission
   or API error is not evidence that no requirements exist. Do not weaken settings.
4. Check for an existing PR for the requested branch and verify its repository,
   base, and complete diff. Do not include an unrelated PR or stack. The personal
   Workable PR conventions and generic stacked-PR tooling are not HabitThread
   landing policy.
5. If starting on `master`, create a descriptive `feat/...`, `fix/...`, or
   `chore/...` branch before committing. If the existing feature branch contains
   unrelated commits, stop rather than silently landing them. Integrate updated
   `origin/master` with a non-interactive merge when necessary; do not rewrite a
   published branch. Pause on conflicts as specified above.
6. Verify the pinned runtime and package-manager versions in `.mise.toml`
   (currently Node.js `24.16.0` and pnpm `12.3.1`; also see `package.json` and
   `.nvmrc`). Run repository package commands through `mise exec -- pnpm`, never a
   global pnpm. If dependencies are absent or stale, install with
   `mise exec -- pnpm install --frozen-lockfile`; the package manager and lockfile
   are declared in `package.json` and `pnpm-lock.yaml`. Missing tools or credentials
   are blockers; do not silently install machine-wide tools.
7. Stage only the intended paths and make a Conventional Commit using
   `GIT_EDITOR=true mise exec -- git commit -m "type: descriptive summary"`.
   Preserve configured signing and do not disable hooks or signing to overcome an
   error. `.husky/pre-commit` runs validation and lint-staged; `.lintstagedrc` runs
   related tests; `.husky/commit-msg` and `commitlint.config.js` enforce Conventional
   Commits. The mise wrapper ensures their pnpm calls use the pinned toolchain.
   Inspect any hook-generated changes before continuing.

## Local verification

Verification must cover the final change, including any integration or hook edits.
Re-run affected checks when the contents change; earlier results for a different
revision are insufficient.

- Run `mise exec -- pnpm validate`. `package.json` defines this as lint,
  formatting validation, and TypeScript checking; `AGENTS.md` requires it.
- Run tests relevant to the diff using
  `mise exec -- pnpm test --runInBand <test-paths>`. `package.json` defines the
  `test` script as Jest under `TZ=UTC`; `jest.config.ts` configures the unit tests.
  Select concrete existing test paths; do not assume coverage thresholds are
  satisfied without a coverage run.
- For critical journeys and visual changes, run relevant Playwright tests without
  updating baselines:
  `mise exec -- pnpm test:e2e <spec-paths> --project=<project> --reporter=line`.
  `package.json` defines `test:e2e` as `playwright test`; `playwright.config.ts`
  defines projects, screenshot comparison, and the local production-build server.
  Use actual spec paths and configured project names. Review intentional baseline
  changes rather than regenerating screenshots to hide failures.
- Local Playwright requires an isolated e2e database. Use
  `mise exec -- pnpm db:e2e:up` only for the dedicated service defined in
  `package.json` and `docker-compose.yml`. Configure `E2E_DATABASE_URL` and local
  test settings according to `.env.e2e.example` and
  `e2e/support/environment.ts`, without writing real credentials into tracked
  files. `e2e/global.setup.ts` resets data: verify the actual database is disposable
  and its name contains `e2e`; never substitute a development or production
  database. Coordinate with other test runs using the same database.
- When selecting another port, keep `PORT`, `PLAYWRIGHT_TEST_BASE_URL`, and
  `NEXTAUTH_URL` aligned. `e2e/support/environment.ts` supplies the auth settings and
  `playwright.config.ts` passes the test environment to the local server.
- A local Playwright run builds the app via `mise exec -- pnpm preview`, defined
  in `package.json` as build followed by start. If a relevant change does not run
  that local server, use `mise exec -- pnpm build` when production-build verification
  is needed; the command is defined in `package.json`.
- If a required local check cannot run, report the blocker rather than treating
  remote CI or an earlier run as an automatic substitute. Documentation-only
  changes may omit unrelated behavioral/build tests, but still require validation
  and all applicable remote requirements.

For the onboarding change, the concrete relevant commands are:

```sh
mise exec -- pnpm test --runInBand src/features/onboarding src/app/professional-actions.test.ts
mise exec -- pnpm test:e2e e2e/public/onboarding.spec.ts --project=public --reporter=line
```

These invocations use the scripts in `package.json`, tests in
`src/features/onboarding/` and `src/app/professional-actions.test.ts`, and the
`public` project in `playwright.config.ts` for
`e2e/public/onboarding.spec.ts`. Supply the isolated local environment described
above. They are not a replacement for remote preview checks.

## Publish and verify the exact revision

1. Confirm the committed diff still matches the requested scope and local checks.
   Push the feature branch to `origin` without force. Record its head SHA.
2. Create or reuse a PR explicitly targeting `master` in
   `AlexGavalas/habit-thread`. Use `gh pr create` with explicit base, head, title,
   and body via non-interactive flags, or update the existing PR. Use a Conventional
   Commit squash title. Describe the actual change and verification, and follow any
   current repository template. Do not invent Jira or label requirements. Do not
   mark reviews approved on someone else's behalf.
3. Verify the PR head equals the locally verified SHA and the diff contains no
   unrelated changes. Verify the PR is ready, mergeable, and satisfies current
   review requirements. Treat unresolved change requests as a blocker; approval
   of an earlier revision is insufficient when policy requires fresh approval.
4. Inspect Vercel deployment status and the associated GitHub Actions run for this
   exact head. `.github/workflows/playwright.yml` checks out the deployment SHA
   and runs Playwright only after a successful `Preview` deployment. A skipped
   `test` job for another deployment, a production deployment, or a green check
   from an earlier SHA does not establish preview-test success.
5. Require a successful Vercel preview and successful associated Playwright `test`
   job for code/UI changes, plus every currently required check. Use
   `gh pr checks <number> --repo AlexGavalas/habit-thread` and the commit
   check-run/status and deployment APIs to confirm the association and conclusions.
   `gh pr checks --required` alone is insufficient when no protections are
   configured. Follow bounded checks/waits and inspect failures; pending, missing,
   skipped in place of expected tests, failing, or unverifiable required results
   block landing. Do not assume starting checks means they passed.
6. The preview workflow requires the GitHub repository secret
   `VERCEL_AUTOMATION_BYPASS_SECRET`; the workflow validates its presence.
   If deployment or CI cannot run because credentials or infrastructure are
   missing, report that blocker without exposing secrets or bypassing verification.
7. Recheck the current PR head, base, reviews, repository rules, and check results
   immediately before merging. If the head or relevant base integration changes,
   revalidate the new state. If rules now require a queue, use the supported queue
   path and wait for actual merge and final required checks; enqueueing is not
   successful landing.

## Merge and confirm

When the exact revision has passed all applicable checks and reviews, squash merge
with a head-SHA guard:

```sh
gh pr merge <number> --repo AlexGavalas/habit-thread --squash --match-head-commit <verified-head-sha>
```

Replace the placeholders with the verified PR number and SHA. Do not use `--admin`
or treat auto-merge enablement as completion. Do not automatically delete a branch
that may have unrelated local work.

Query the PR to confirm it is actually `MERGED` into `master` and obtain its merge
commit SHA. Fetch `origin/master` and verify the merge commit is an ancestor of that
remote branch. Report the PR URL, landed commit, destination, verification results,
and any remaining limitations. If the PR is open, merely queued, blocked, or its
merge cannot be verified at the destination, explicitly report that the changes
have **not landed**.

Preserve unrelated local edits and do not reset, clean, switch, or rewrite the
user's primary checkout. Leave branch/container cleanup alone unless it is known
to be safe and within the requested scope.
