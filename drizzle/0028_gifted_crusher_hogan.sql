ALTER TABLE "bookings" ADD COLUMN "analytics_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "analytics_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "analytics_consent" boolean DEFAULT false NOT NULL;