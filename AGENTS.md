<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Toolchain

- Use the Node.js and pnpm versions declared in `.mise.toml`.
- Run pnpm commands as `mise exec -- pnpm <command>` so repository commands do not fall back to a globally installed pnpm.

## Mantine

- Use the Mantine MCP server to check current component, hook, and API documentation before adding or changing Mantine code.

## Applying these conventions

- Apply these rules to new and meaningfully changed code. Do not perform unrelated style cleanup or wholesale renames as part of a functional change.
- Existing code is not an exception or a source of truth when it conflicts with these rules.
- Let Oxfmt own formatting and import ordering, and follow the repository's TypeScript and lint configuration. Do not duplicate formatting rules here.

## Functions and control flow

- Use arrow functions for all functions, including components, hooks, utilities, and callbacks, unless a function declaration is required by the framework or language.
- Specify explicit return types for standalone components, hooks, and utilities. Contextually typed callbacks (such as collection callbacks and event handlers) and expressions assigned an explicit function type may omit a redundant return annotation, matching `allowTypedFunctionExpressions` in the lint configuration.
- Do not add redundant inline return types to built-in collection callbacks, Jest mock factories, or test and lifecycle callbacks. Let the receiving API infer them; retain annotations only when they are necessary for inference or narrowing.
- Keep annotations that are necessary for type inference or narrowing, such as tuple return types and type predicates. Verify standalone function contracts at their definitions.
- Keep each function small where practical, logically coherent, and focused on one responsibility.
- Extract pure business calculations into ordinary functions. Extract hooks when they own a coherent state/effect lifecycle, and components around meaningful UI responsibilities.
- Do not split code or introduce abstractions merely to satisfy a line limit.
- Prefer guard clauses and a flat success path over nested branches. Omit `else` after a branch that returns.
- Use collection methods for straightforward transformations. Prefer a loop or named intermediate values when nested callbacks obscure the rule. Fewer lines do not necessarily mean clearer code.

## Types and component contracts

- Prefer `type` over `interface` and named exports, except where framework or configuration requirements dictate otherwise.
- Use `ReactElement` imported as a type from `react` instead of `JSX.Element` or `React.JSX.Element`. Preserve nullable and async contracts as `ReactElement | null` and `Promise<ReactElement>`. Keep `ReactNode` for children and other values that intentionally accept a broader range of renderable content.
- Give component props a local `ComponentNameProps` type and make the props readonly.
- Keep props types beside their component unless multiple files genuinely share them. Do not create separate type files for trivial local definitions.
- Infer database record types from Drizzle and external-input types from Zod. Do not manually maintain equivalent shapes in multiple places.
- Use camelCase for domain and UI contracts. Map database field names at the data boundary rather than leaking storage naming into new contracts.

## Ownership and organization

- Keep hooks and helpers close to where they are used. When they are reused across features, extract them to the appropriate top-level directory under `src`, such as `src/hooks` or `src/util`.
- Keep reusable UI in `src/components`, product UI in `src/features`, server-side data operations in `src/api`, and route entry points in `src/app`.
- Reserve `src/store` for shared client state and its accessors, not as a second general hooks directory.

## State and data flow

- Use React state for component-local interactions.
- Use Jotai for shared client-only state, including unsaved drafts.
- Use TanStack Query for server data and mutation lifecycle state.
- Derive values instead of storing synchronized copies.
- Keep query functions focused on fetching data. Do not use refetching to reset unrelated submission state.
- Prefer Server Actions for first-party app mutations unless an HTTP endpoint has a concrete consumer or requirement.
- Keep business and data operations shared beneath transport entry points; do not duplicate them between Server Actions and route handlers.

## Boundaries and errors

- Accept untrusted input as `unknown` and parse it at the system boundary with a runtime schema before passing it into the application.
- Parse all incoming data at its boundary, including request bodies, query parameters, external API responses, and JSON responses consumed by clients. Internal code should receive values whose schemas have already been verified.
- Never cast unknown values into trusted types. A type assertion is not validation; do not use assertions or double casts to bypass parsing.
- Use typed, discriminated results for expected action failures. Throw for unexpected failures and translate errors at transport boundaries.
- Failed reads must throw rather than silently masquerade as empty data.
- Keep user notifications in the UI or hook layer, not in domain or data-access functions.

## UI, styling, and copy

- Use Mantine props for ordinary component configuration, CSS Modules for custom layout and selectors, and shared theme tokens for repeated design values.
- Translate all user-facing copy, including public marketing copy, labels, validation messages, notifications, and accessibility text. Do not introduce hardcoded user-facing strings.

## Tests and verification

- Prefer behavior assertions in unit tests. Do not use snapshot unit tests.
- Test pure rules with unit tests and interactions through accessible queries.
- Use Playwright for critical user journeys and layout checks. Use screenshot comparisons for observable visual output in common scenarios.
- For bug fixes, add a regression test at the lowest layer that actually reproduces the failure.
- Run `mise exec -- pnpm validate` and the tests relevant to the change. Report the checks actually run and any checks not run.
- Lint configuration lives in `.oxlintrc.json`. Complexity, nesting, statement, and parameter limits are warning-level review signals, not reasons to create arbitrary abstractions. E2E flows have a higher statement allowance.
- Required language/framework exceptions must be narrow and explained beside the suppression.
