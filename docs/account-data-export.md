# Account data export (format 1)

The authenticated `GET /api/account-export` download creates an in-memory ZIP.
The server resolves the owner through `getCurrentUser`; no account ID or delegated
meal-plan owner is accepted from the request. All reads share a read-only,
repeatable-read transaction. Responses, including failures, are private/no-store.
Nothing is persisted to public storage.

## Stored-data inventory

| Source                                 | Export                      | Scope                                                                             |
| -------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `users`                                | `profile`                   | Own allowlisted profile, food preferences, onboarding/discoverability preferences |
| `user_roles`                           | `roles`                     | Own role assignments                                                              |
| `meals`, `meal_items`                  | `meals`, `mealItems`        | Owned planned meals, notes/ratings, foods; items joined through owned parent      |
| `meals_pool`, `meal_pool_items`        | `library`, `libraryItems`   | Own saved meals/foods; items joined through owned parent                          |
| `meal_zone_times`, `weekly_meal_zones` | `zoneTimes`, `zones`        | Own historical zone times and weekly schedules                                    |
| `schedule_templates`                   | `scheduleTemplates`         | Own stored recurring schedules, including historical effective dates              |
| `user_signup_origins`                  | `signupOrigins`             | Own recorded password/google signup method; absent means unknown                  |
| `measurements`, `activities`           | Same names                  | Own tracking records                                                              |
| `notification_preferences`             | `notificationPreferences`   | Own stored reminder preference and scheduling state                               |
| `meal_reminder_deliveries`             | `reminderDeliveries`        | Own recorded delivery history                                                     |
| `meal_import_usage`                    | `importUsage`               | Own stored dated attempt counter; imported source files are not stored            |
| `connections`, `notifications`         | Same names                  | Rows directly involving the account; participant IDs and request direction only   |
| `professional_clients`                 | `professionalRelationships` | Rows directly involving the account; participant IDs, status and timestamps only  |
| `user_credentials`                     | Excluded                    | Password hashes                                                                   |
| `push_subscriptions`                   | Excluded                    | Endpoints, authentication and encryption keys                                     |

No counterpart profile joins occur, including for professionals exporting their
account: client meals/tracking are not owned by that professional. The captured
schema has no separate consent-history table or meal-authorship fields. Ownership
must not be described as authorship. Stored request direction is retained. Export
only currently stored records, not reconstructed deleted data or assumed history.
This feature does not promise to exhaust every Article 15 access request.

`columns.ts` is an explicit, camelCase field allowlist; new schema fields are not
automatically published. Signup provenance is exported only where stored and is
never inferred from credentials or described as a linked authentication provider.

## Archive contract

`export.json` is the lossless structured source with `formatVersion: 1`,
`generatedAt` and `data`. Each table is an array, including singleton records.
`csv/` includes all 18 tables even when empty. `README.txt` records the generation
timestamp, fields/units, date conventions, relationship references, nullable
values and CSV spreadsheet protection. CSV uses UTF-8 BOM, quoted cells, doubled
quotes and CRLF record separators. Formula-like text is apostrophe-prefixed;
numeric negatives remain numeric and JSON text is unchanged. Schedule template
JSON is validated at the data boundary and serialized as JSON text inside CSV.

The existing JSZip 3.10.2 dependency is promoted from development to runtime;
no new archive implementation or additional dependency was introduced.

## Validation and operational notes

Focused Jest tests exercise SQL ownership predicates (including parent joins),
allowlisted columns, authentication/fail-closed behavior, safe download headers,
archive decompression/CRC, Unicode and CSV safety, and UI pending/retry/download
behavior. SQL tests use a Drizzle proxy, not a live PostgreSQL database.

`e2e/authenticated/account-export.spec.ts` exercises authenticated and anonymous
downloads against the real database, ignored submitted owner IDs, signup provenance,
ZIP contents, keyboard activation, axe scans, responsive screenshots and matching
export/delete button heights. The 320px advanced-settings screenshot covers the
new card in its surrounding layout.

The synchronous download builds the archive in memory; exceptionally large
accounts may need a future bounded/background-export workflow. Do not silently
truncate records.
