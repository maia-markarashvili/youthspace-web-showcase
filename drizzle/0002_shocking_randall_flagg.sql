CREATE TABLE "calendar_overrides" (
	"date" date PRIMARY KEY NOT NULL,
	"is_open" boolean NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "renewal_grace_days" integer DEFAULT 5 NOT NULL;