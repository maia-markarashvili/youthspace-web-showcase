CREATE TABLE "entry_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_ref" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"buyer_email" text,
	"amount_gel" integer NOT NULL,
	"entries_total" integer DEFAULT 4 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_passes_order_ref_unique" UNIQUE("order_ref")
);
--> statement-breakpoint
CREATE TABLE "pricing_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"club_price" integer NOT NULL,
	"additional_club_price" integer NOT NULL,
	"vip_price" integer NOT NULL,
	"single_entry_price" integer NOT NULL,
	"four_pack_price" integer NOT NULL,
	"sale_club_price" integer,
	"sale_additional_club_price" integer,
	"sale_vip_price" integer,
	"sale_single_entry_price" integer,
	"sale_four_pack_price" integer,
	"course_discounts" integer[] DEFAULT '{5,10,15,20,25}' NOT NULL,
	"club_seat_capacity" integer DEFAULT 30 NOT NULL,
	"vip_seat_capacity" integer DEFAULT 5 NOT NULL,
	"daily_entry_capacity" integer DEFAULT 15 NOT NULL,
	"four_pack_validity_days" integer DEFAULT 30 NOT NULL,
	"bank_requisites" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_settings_singleton" CHECK ("pricing_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "pass_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "sale_price" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "order_ref" text;--> statement-breakpoint
CREATE INDEX "idx_passes_phone" ON "entry_passes" USING btree ("buyer_phone","status");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pass_id_entry_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."entry_passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_order_ref_unique" UNIQUE("order_ref");