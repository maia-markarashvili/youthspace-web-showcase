CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"target_ref" text,
	"detail" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_admin" ON "admin_audit_log" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role" CHECK ("admin_users"."role" in ('admin', 'reception'));