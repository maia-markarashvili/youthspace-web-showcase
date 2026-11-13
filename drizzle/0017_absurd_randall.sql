CREATE TABLE "account_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"email" text,
	"birth_date" date,
	"relationship" text DEFAULT 'self' NOT NULL,
	"parent_consent" boolean,
	"photo_consent" boolean,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_profiles_relationship" CHECK ("account_profiles"."relationship" in ('self', 'child', 'other'))
);
--> statement-breakpoint
CREATE TABLE "account_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"google_id" text,
	"full_name" text NOT NULL,
	"phone" text,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "accounts_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "accounts_status" CHECK ("accounts"."status" in ('pending', 'active', 'disabled'))
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_profiles_account" ON "account_profiles" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_account_verif_account" ON "account_verifications" USING btree ("account_id","purpose","created_at");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_profile_id_account_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_passes" ADD CONSTRAINT "entry_passes_profile_id_account_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_profile_id_account_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;