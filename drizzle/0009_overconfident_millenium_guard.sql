CREATE TABLE "meal_import_usage" (
	"user_id" bigint PRIMARY KEY NOT NULL,
	"usage_date" date NOT NULL,
	"attempts" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_import_usage" ADD CONSTRAINT "meal_import_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;