-- Custom SQL migration file, put your code below! --

-- ღონისძიების დროშები სამმდგომარეობიანი ხდება (2026-09-01): ძველი `false`
-- ნიშნავდა „დროშა არ დგას", ახლა კი „ხელით დაკეტილს" — ამიტომ ძველი false
-- ითარგმნება NULL-ად („კვირის ბადის მიხედვით"). `true` რიგებს არ ეხება.
-- იდემპოტენტურია: მეორედ გაშვებისას false-ები აღარ არსებობს.
UPDATE "calendar_overrides" SET "event_morning" = NULL WHERE "event_morning" = false;--> statement-breakpoint
UPDATE "calendar_overrides" SET "event_midday" = NULL WHERE "event_midday" = false;--> statement-breakpoint
UPDATE "calendar_overrides" SET "event_evening" = NULL WHERE "event_evening" = false;
