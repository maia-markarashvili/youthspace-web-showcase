ALTER TABLE "calendar_overrides" ADD COLUMN "same_day_morning" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "same_day_midday" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "same_day_evening" boolean DEFAULT false NOT NULL;