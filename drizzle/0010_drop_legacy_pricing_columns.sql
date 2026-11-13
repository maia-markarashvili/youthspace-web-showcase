ALTER TABLE "clubs" DROP COLUMN "base_price";--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "additional_price";--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "price_member";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "additional_club_price";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "vip_price";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "sale_additional_club_price";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "sale_vip_price";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "course_discounts";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "vip_seat_capacity";--> statement-breakpoint
ALTER TABLE "pricing_settings" DROP COLUMN "daily_entry_capacity";