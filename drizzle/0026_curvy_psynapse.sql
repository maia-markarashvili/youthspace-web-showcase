ALTER TABLE "calendar_overrides" ALTER COLUMN "event_morning" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ALTER COLUMN "event_morning" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ALTER COLUMN "event_midday" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ALTER COLUMN "event_midday" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ALTER COLUMN "event_evening" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ALTER COLUMN "event_evening" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "event_weekdays" jsonb;