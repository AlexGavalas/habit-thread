-- Professionals are always visible, including accounts created before this rule.
UPDATE "users"
SET "is_discoverable" = true
WHERE "id" IN (
    SELECT "user_id" FROM "user_roles" WHERE "role" = 'professional'
);--> statement-breakpoint
DROP INDEX "user_roles_role_discoverable_idx";--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
ALTER TABLE "user_roles" DROP COLUMN "is_discoverable";