ALTER TABLE "spaces" ADD COLUMN "booking_mode" text DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "slot_units" integer DEFAULT 8 NOT NULL;