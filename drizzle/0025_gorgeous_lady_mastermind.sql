ALTER TABLE "spaces" ALTER COLUMN "price_regular" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "spaces" ALTER COLUMN "price_member" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "people_up_to" integer;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "event_morning" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "event_midday" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "event_evening" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_price_morning" integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_price_midday" integer DEFAULT 15000 NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_price_evening" integer DEFAULT 20000 NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_member_price_morning" integer;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_member_price_midday" integer;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_member_price_evening" integer;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_people_tiers" jsonb;