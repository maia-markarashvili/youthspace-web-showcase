CREATE TABLE "referral_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_subscription_id" uuid NOT NULL,
	"referee_subscription_id" uuid NOT NULL,
	"code" text NOT NULL,
	"discount_percent" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_credits_referee_subscription_id_unique" UNIQUE("referee_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "capacity_morning" integer;--> statement-breakpoint
ALTER TABLE "calendar_overrides" ADD COLUMN "capacity_evening" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "club_discounts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "referral_discount_percent" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "entry_capacity_morning" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "entry_capacity_evening" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "referred_by_code" text;--> statement-breakpoint
ALTER TABLE "referral_credits" ADD CONSTRAINT "referral_credits_referrer_subscription_id_subscriptions_id_fk" FOREIGN KEY ("referrer_subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credits" ADD CONSTRAINT "referral_credits_referee_subscription_id_subscriptions_id_fk" FOREIGN KEY ("referee_subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_referral_credits_referrer" ON "referral_credits" USING btree ("referrer_subscription_id","status");--> statement-breakpoint
ALTER TABLE "entry_passes" ADD CONSTRAINT "entry_passes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;