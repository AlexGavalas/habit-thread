CREATE TABLE "schedule_templates" (
	"user_id" bigint NOT NULL,
	"effective_from" date NOT NULL,
	"template" jsonb NOT NULL,
	CONSTRAINT "schedule_templates_user_id_effective_from_pk" PRIMARY KEY("user_id","effective_from")
);
--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;