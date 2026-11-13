ALTER TABLE "clubs" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "dropin_settings" ADD COLUMN "booking_start_date" date;--> statement-breakpoint
ALTER TABLE "dropin_settings" ADD COLUMN "booking_window_days" integer DEFAULT 14 NOT NULL;