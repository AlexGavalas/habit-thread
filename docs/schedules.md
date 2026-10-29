# Meal schedules

## User behavior

- **Default schedule** in the meal-plan toolbar edits one daily
  list of 1–10 meal slots, with editable names and unique `HH:mm` times.
- The server computes the effective date as next Monday using the same request
  date as the rest of the app. The editor displays that exact date. A stale editor
  crossing a week boundary must reload rather than silently save for another date.
- Saving again before Monday replaces the pending version. Later Mondays create
  new versions; past and current weeks are not rewritten.
- A day's edit button edits that exact date, not the surrounding week.
- Saving a day creates an explicit override. **Use default schedule** deletes the
  override, restoring the default applicable to that date.
- Default changes leave explicit overrides alone. A small clock icon beside the
  date identifies custom schedules without adding a row to the day header.
- Successful saves close the drawer after cache reconciliation. Failures keep
  the draft open.
- Renaming or retiming retains slot identity and planned meals. Removing slots
  (including via reset) is rejected if it would detach planned meals. The error
  lists the affected dates; the entire transaction is rolled back.
- Week copy remains an explicit replacement of the destination's meals and
  schedule, as stated in its confirmation. It creates date overrides and does not
  edit the recurring default.

## Storage and resolution

`schedule_templates` stores one validated pattern per owner and effective Monday.
The pattern is a discriminated union, initially `{ kind: 'daily', slots: [...] }`.
Slots have stable keys, names, times, and optional built-in translation keys.

`weekly_meal_zones` now holds date overrides. Existing complete saved weeks are
preserved as seven overrides without rewriting their keys or meal attachments.
The week column remains useful for existing reads and the week-copy operation.

For each date:

1. Use that date's explicit override if present.
2. Otherwise use the latest template effective on or before that week.
3. If no template exists, resolve the historical `meal_zone_times` configuration,
   falling back to built-in times and translated names.

Inherited keys preserve the old `slotKey_dayLabel` format so historical meals
and links continue working. Slot keys are never derived from editable names or
times. A custom name clears its built-in translation key.

The calendar, home page, and meal-write validation all read the same effective
schedule through `fetchWeeklyMealZones`. Client reads expose `isOverride` for
custom-day badges.

## Writes and cache ownership

`schedule-actions.ts` validates unknown input and checks actor/owner access.
Domain writes share the existing owner-scoped meal-plan advisory lock, including
conflict checks, with meal writes and week copies.

Day mutations submit one day only. Default mutations affect inherited future
weeks and invalidate the owner's schedule queries. Mutation variables retain the
submitted owner/date, independent of later navigation. React owns local drafts;
TanStack Query owns server data and write lifecycle. Refetches do not replace an
open draft.

The default editor's query observer lives outside the drawer's transient
content and is enabled only when opened. This avoids Strict Mode remounts
aborting and restarting the first request, while retaining normal cancellation,
owner-scoped caching, and invalidation.

Embedded professional calendars enforce a 16rem minimum day-column width.
Navigation and drag-edge scrolling use Embla's actual scroll snaps rather than
assuming the browser viewport determines how many days fit inside a drawer.

## Extending recurrence

To add a weekly or another recurring pattern:

1. Add a schema variant with its own pattern-specific fields.
2. Extend the pure resolver to select slots for a date.
3. Add an editor for that pattern and tests for its resolution.

Effective dates, date overrides, authorization, meal safety, and cache ownership
remain unchanged. No speculative weekday fields or future-week materialization
jobs are required for the daily version.

## Migration and verification

Apply the generated `0011_military_felicia_hardy.sql` migration before running the
new app. It adds only the template table; existing schedule and meal rows stay
untouched.

Focused Jest tests cover inheritance, schemas, action boundaries, retained drafts,
retry, click-event/date separation, and navigation during saves. The schedule
Playwright spec verifies real persistence, pending-default replacement,
date overrides/reset, occupied-slot rollback, responsive layout, screenshots,
and accessibility against the isolated E2E database.
