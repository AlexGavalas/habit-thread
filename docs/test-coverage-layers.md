# Test coverage layers

Keep each regression at the lowest layer that reproduces its risk. Jest covers
rules and client state transitions; Playwright covers browser behavior and the
integration of authentication, rendering, mutations and persistence.

## Coverage moved out of Playwright

These cases no longer need separate deployed-app journeys:

| Behavior                                                                | Coverage owner                                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Import preview editing, removal, undo and explicit submission           | `src/features/modals/meal-pool/file-upload.test.tsx` with real hooks and mocked fetch                                      |
| Failed import save retains edits and completes only after retry         | `src/features/modals/meal-pool/file-upload.test.tsx`                                                                       |
| Extraction error translation, retained file and retry                   | `src/features/modals/meal-pool/file-upload.test.tsx`                                                                       |
| Failed meal read shows an error rather than an empty plan, then retries | `src/features/calendar/calendar.test.tsx` with real query hooks                                                            |
| Offline tracking draft and retry payload survive failure                | `src/hooks/use-tracking-mutation.test.tsx`; real measurement persistence remains in `e2e/authenticated/app-router.spec.ts` |
| Dashboard measurement/activity buttons open their editors               | `src/features/screens/home.test.tsx` with the real modal provider                                                          |
| Missing-file and oversized multipart requests                           | `src/app/api/v1/pool/upload/route.test.ts`; file-size rules also remain in the document-reader and upload-hook tests       |
| Landing, registration and login smoke assertions                        | Consolidated into `e2e/public/accessibility.spec.ts`, alongside keyboard and focus checks                                  |

Food selection by provider/ID, restoring removed search results without another
fetch, quantity retention and submitted basket contents are integrated in
`src/features/modals/meal-pool/food-database.test.tsx`. Pure selection/item rules
remain in their colocated tests.

Manual-entry draft replacement, cancellation and undo remain in
`src/features/modals/meal-pool/manual-input.test.tsx`. Browser tests still create
and persist a variation at desktop and mobile sizes, but do not replay every
draft-state permutation.

## Browser coverage to retain

- SSR hydration and unexpected browser data requests.
- Real saves, server reads/reloads, navigation and cache reconciliation.
- Database concurrency, validation-before-deletion and independent nutrition
  records. Mocked database tests cannot replace database integration coverage.
- Professional invitations, delegated permissions and profile discovery.
- Keyboard/focus behavior, accessibility scans, responsive geometry, computed
  styles, screenshots, drag/drop and edge scrolling.
- Real file-input wiring and import preview/save integration. The local-only
  document matrix also exercises the real PDF parser, which Jest reader tests mock.

For responsive tests, preserve every relevant layout assertion and screenshot,
but avoid repeating identical backend persistence checks at every width. The
library basket retains four breakpoint checks and one real save/read-back.

Use deferred responses, not fixed latency sleeps, to exercise pending writes.
Do not loosen screenshot thresholds, remove failure coverage or increase workers
against shared mutable accounts to make CI faster. Measure CI durations and
retries before further changes; fewer test cases alone do not establish a
wall-clock improvement.
