-- Custom SQL migration file, put your code below! --

-- ტიპების გადარქმევა: გალერეა → ამბები, კლუბის პროდუქტი → ნამუშევარი (ტექსტი);
-- testimonial ტიპი მთლიანად უქმდება (მომხმარებლის გადაწყვეტილება, 2026-07-30)
UPDATE "content_posts" SET "type" = 'news' WHERE "type" = 'gallery';--> statement-breakpoint
UPDATE "content_posts" SET "type" = 'work_text' WHERE "type" = 'club_output';--> statement-breakpoint
DELETE FROM "content_posts" WHERE "type" = 'testimonial';
