-- Historically, password credentials were created only with new users in the
-- registration transaction. The owner confirmed no imports or later credential
-- additions. This supports a one-sided backfill, not an inference of Google
-- signup for users without credentials. Never overwrite recorded provenance.
INSERT INTO "user_signup_origins" ("user_id", "method")
SELECT "user_id", 'password'
FROM "user_credentials"
ON CONFLICT ("user_id") DO NOTHING;
