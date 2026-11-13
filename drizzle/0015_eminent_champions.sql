CREATE TABLE "phone_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"trusted_until" timestamp with time zone,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pricing_settings" ADD COLUMN "otp_required_for_transfer" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_phone_verif_phone" ON "phone_verifications" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "idx_phone_verif_trust" ON "phone_verifications" USING btree ("phone","trusted_until");--> statement-breakpoint
CREATE INDEX "idx_phone_verif_ip" ON "phone_verifications" USING btree ("ip","created_at");