ALTER TABLE "payments" DROP CONSTRAINT "payments_target_required";--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "pass_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "return_token" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_pass_id_entry_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."entry_passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payments_return_token" ON "payments" USING btree ("return_token");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_target_required" CHECK ("payments"."booking_id" IS NOT NULL OR "payments"."subscription_id" IS NOT NULL OR "payments"."pass_id" IS NOT NULL);