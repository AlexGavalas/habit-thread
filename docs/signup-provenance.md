# Signup provenance

`user_signup_origins` records the method used when this application creates a
new account: `password` or `google`. The record is written in the same transaction
as the user (and password credentials, when applicable). Application code never
updates this record. Deleting the user cascades to the provenance record.

Apply the normal Drizzle migrations before deploying the updated auth code.
Migration `0012_track_signup_origin` creates the table.
Migration `0013_backfill_password_signup_origin` records `password` for existing
accounts with password credentials, without overwriting any recorded provenance.
This one-sided backfill relies on the historical registration invariant: password
credentials were created together with new users, not attached to existing users.
The owner confirmed there have been no imports or later credential additions.
Accounts without credentials remain `unknown`, even after a later Google sign-in.
There is no Google backfill.

## Internal lookup

Server-only application code can call
`fetchUserSignupInfo({ userId })` from `src/api/user-signup.ts`. It returns:

```ts
{
    signupMethod: 'password' | 'google' | 'unknown';
    hasPasswordCredentials: boolean;
}
```

A missing user returns `null`; database failures throw. This is an internal data
operation, not a public endpoint or Server Action. Any future external consumer
must authorize access before calling it. Profiles and sessions do not expose this
metadata.

For authorized database investigation, use a parameterized query:

```sql
SELECT u.id,
       COALESCE(o.method, 'unknown') AS signup_method,
       (c.user_id IS NOT NULL) AS has_password_credentials
FROM users AS u
LEFT JOIN user_signup_origins AS o ON o.user_id = u.id
LEFT JOIN user_credentials AS c ON c.user_id = u.id
WHERE u.email = $1;
```

## What this does not establish

- In general, a password-credentials row proves only that credentials currently
  exist. The one-time password backfill is justified by this application's
  confirmed history, not by a general rule about authentication systems.
- Missing password credentials do not prove Google signup.
- Signup provenance is not a list of linked authentication methods, the latest
  login provider, proof of email ownership, or an authorization/linking rule.
- Existing Google sign-in remains email-based. This change neither stores Google
  subjects nor strengthens or expands account linking. A later Google login
  cannot overwrite password or unknown signup provenance.

Provider-subject identity, verified-email enforcement, account-linking policy,
and login audit history require separate decisions and implementation.

## Backfill regression check

Against a disposable PostgreSQL database, run:

```sh
SIGNUP_BACKFILL_TEST_DATABASE_URL=postgres://... \
  mise exec -- pnpm test:integration --runInBand --runTestsByPath \
  src/api/signup-origin-backfill.integration.test.ts
```

The test executes the actual data migration against transaction-local temporary
tables. It covers password-only backfill, unknown accounts, preserved Google and
password provenance, and repeat execution. Database integration suites run through
`test:integration`, separately from unit tests. A missing explicit test database
URL fails the suite with an assertion rather than silently skipping it.
