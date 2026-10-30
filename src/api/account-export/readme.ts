export const EXPORT_README = `HabitThread account export — format version 1

export.json contains formatVersion, generatedAt (UTC ISO 8601), and data.
Each data property is an array, including profile; absent records are empty arrays.
csv/ contains the same tables, UTF-8 with BOM, comma-separated, CRLF rows,
double-quoted values and doubled embedded quotes. JSON is the lossless source:
CSV nulls are empty cells (indistinguishable from empty strings), and text beginning
with whitespace/control characters followed by = + - @, or tab/newline, receives
an apostrophe to prevent spreadsheet formula execution. Numeric negatives stay numbers.

Dates: day, date, localDate, usageDate, effectiveFrom and weekStart are calendar
dates YYYY-MM-DD, not instants. *At timestamps retain their stored timezone offset;
generatedAt is UTC. time and mealReminderTime are local HH:mm:ss times.
Notification timezone is an IANA zone; meal-zone times have no stored timezone.

Relationships: id is a stored record identifier. userId is the owning account.
mealItems.mealId -> meals.id; libraryItems.libraryId -> library.id.
meals.sectionKey -> zones.zoneKey for that owner's day/week, or legacy zone key.
zoneTimes contains historical effective-from times; zones are weekly schedules.
position is stored ordering. legacyKey is an optional migration mapping.
connectionUserId, requestUserId, targetUserId, professionalUserId and clientUserId
are counterpart account identifiers only, NOT exported profiles. Connections may
have reciprocal rows. Requests retain requester/recipient direction; professional
relationships retain status (pending/active), createdAt and acceptedAt.
These records do not grant access to another person's meals or tracking.

Fields and units:
profile: fullName, email, language, createdAt, height (cm), targetWeight (kg),
foodPreferencesPositive/Negative (free text), hasCompletedOnboarding and
isDiscoverable (stored booleans). roles contains assigned account role strings.
meals: meal (text), note (optional personal text), rating (stored 0–5 score),
day and sectionKey. library: content (saved meal text).
mealItems/libraryItems: name, alternativeName, brand, source and providerFoodId
identify food; quantityGrams is consumed/planned mass in g. Nutrients are per
basisGrams (g): calories in kcal; protein, carbohydrates, fat, fiber, salt and
sugar in g. Null means unknown, not zero.
measurements: weight (kg), fatPercentage (%), date.
activities: activity (free text), date.
zones: label, day, weekStart, zoneKey, legacyKey, position, time.
zoneTimes: zoneKey, effectiveFrom, time.
notificationPreferences: mealReminderEnabled, mealReminderTime, timezone,
nextNotificationAt (scheduled delivery instant, nullable).
reminderDeliveries: localDate and sentAt (recorded reminder delivery).
notifications: notificationType (stored event/request type), date and participants.
importUsage: attempts (count for usageDate), userId. Source import files are not stored.

Scope: current stored records owned by the authenticated account, its profile,
preferences, roles, tracking, schedules, and directly involving relationships.
This is not a guarantee of satisfying every GDPR Article 15 access request.
Deleted/nonexistent data is not reconstructed. No separate consent history or
meal author field is stored in this schema; ownership is not proof of authorship.
Stored request direction and relationship participants are preserved.
No counterpart names/emails, other clients' data, credentials, provider tokens,
sessions, verification secrets, push endpoints/keys or infrastructure secrets
are included. Keep this archive private; it contains personal and health data.
`;
