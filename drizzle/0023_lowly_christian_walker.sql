ALTER TABLE "calendar_overrides" ADD COLUMN "capacity_midday" integer;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "entry_capacity_midday" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "weekday_capacities" jsonb;