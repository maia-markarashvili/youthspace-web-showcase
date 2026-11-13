CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"eyebrow" text,
	"title" text NOT NULL,
	"slogan_under" text,
	"body" text NOT NULL,
	"image" text NOT NULL,
	"image_alt" text NOT NULL,
	"cta1_label" text,
	"cta1_href" text,
	"cta2_label" text,
	"cta2_href" text,
	"stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_texts" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
