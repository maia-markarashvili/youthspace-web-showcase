ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancelled_by" text;