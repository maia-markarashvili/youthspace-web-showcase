ALTER TABLE "bookings" ADD COLUMN "plan_months" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "months_paid" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "plan_next_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "monthly_price" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "monthly_months" integer;