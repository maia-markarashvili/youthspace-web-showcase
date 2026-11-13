CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"pass_id" uuid,
	"subscription_id" uuid,
	"admin_id" uuid NOT NULL,
	"admin_email" text NOT NULL,
	"method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_one_target" CHECK (num_nonnulls("visits"."booking_id", "visits"."pass_id", "visits"."subscription_id") = 1),
	CONSTRAINT "visits_method" CHECK ("visits"."method" in ('qr', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_pass_id_entry_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."entry_passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_visits_booking" ON "visits" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_visits_pass" ON "visits" USING btree ("pass_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_visits_subscription" ON "visits" USING btree ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_visits_created" ON "visits" USING btree ("created_at");