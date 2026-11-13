ALTER TABLE "bookings" ADD COLUMN "reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reserved_note" text;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "reserved_note" text;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "transfer_hold_hours" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "reserved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "reserved_note" text;