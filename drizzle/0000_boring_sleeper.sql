CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_ref" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" uuid,
	"space_id" uuid,
	"booking_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount_gel" integer NOT NULL,
	"is_member_price" boolean DEFAULT false NOT NULL,
	"member_email" text,
	"promo_code" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"purchase_for" text DEFAULT 'self' NOT NULL,
	"child_name" text,
	"child_age" integer,
	"parent_consent" boolean,
	"consent_at" timestamp with time zone,
	"terms_accepted" boolean DEFAULT false NOT NULL,
	"attribution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_order_ref_unique" UNIQUE("order_ref")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"age_range" text,
	"description" text,
	"audience" text,
	"format" text,
	"final_product" text,
	"cover_image" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_price" integer NOT NULL,
	"additional_price" integer NOT NULL,
	"billing_period" text DEFAULT 'monthly' NOT NULL,
	"meeting_day" text,
	"meeting_time" text,
	"max_capacity" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"club_id" uuid,
	"slug" text,
	"title" text NOT NULL,
	"body" text,
	"author_name" text,
	"collection_slug" text,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"lecturer" text,
	"schedule_text" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_image" text,
	"capacity" integer,
	"price_regular" integer NOT NULL,
	"price_member" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dropin_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"price" integer NOT NULL,
	"daily_cap" integer NOT NULL,
	"description" text,
	"opening_hour" integer DEFAULT 10 NOT NULL,
	"closing_hour" integer DEFAULT 22 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dropin_settings_singleton" CHECK ("dropin_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"message" text,
	"payload" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price" integer NOT NULL,
	"billing_period" text DEFAULT 'monthly' NOT NULL,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"subscription_id" uuid,
	"flitt_payment_id" text,
	"order_ref" text NOT NULL,
	"amount_gel" integer NOT NULL,
	"currency" text DEFAULT 'GEL' NOT NULL,
	"method" text,
	"status" text DEFAULT 'created' NOT NULL,
	"raw_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_target_required" CHECK ("payments"."booking_id" IS NOT NULL OR "payments"."subscription_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_percent" integer,
	"grants_member_price" boolean DEFAULT false NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_image" text,
	"capacity" integer,
	"inventory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_regular" integer NOT NULL,
	"price_member" integer NOT NULL,
	"opening_hour" integer DEFAULT 10 NOT NULL,
	"closing_hour" integer DEFAULT 22 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_type" text NOT NULL,
	"club_ids" uuid[],
	"plan_id" uuid,
	"subscriber_name" text NOT NULL,
	"subscriber_email" text NOT NULL,
	"subscriber_phone" text NOT NULL,
	"amount_gel" integer NOT NULL,
	"billing_period" text DEFAULT 'monthly' NOT NULL,
	"flitt_token" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"purchase_for" text DEFAULT 'self' NOT NULL,
	"child_name" text,
	"child_age" integer,
	"parent_consent" boolean,
	"consent_at" timestamp with time zone,
	"photo_consent" boolean,
	"terms_accepted" boolean DEFAULT false NOT NULL,
	"attribution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_date" ON "bookings" USING btree ("item_type","booking_date","status");--> statement-breakpoint
CREATE INDEX "idx_bookings_item" ON "bookings" USING btree ("item_type","item_id","status");--> statement-breakpoint
CREATE INDEX "idx_bookings_space" ON "bookings" USING btree ("space_id","booking_date","status");--> statement-breakpoint
CREATE INDEX "idx_content_type" ON "content_posts" USING btree ("type","is_active");--> statement-breakpoint
CREATE INDEX "idx_content_club" ON "content_posts" USING btree ("club_id","type");--> statement-breakpoint
CREATE INDEX "idx_payments_order_ref" ON "payments" USING btree ("order_ref");--> statement-breakpoint
CREATE INDEX "idx_subs_member" ON "subscriptions" USING btree ("subscriber_email","status");