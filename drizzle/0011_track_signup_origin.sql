CREATE TABLE "user_signup_origins" (
	"method" text NOT NULL,
	"user_id" bigint PRIMARY KEY NOT NULL,
	CONSTRAINT "user_signup_origins_method_check" CHECK ("user_signup_origins"."method" in ('password', 'google'))
);
--> statement-breakpoint
ALTER TABLE "user_signup_origins" ADD CONSTRAINT "user_signup_origins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;