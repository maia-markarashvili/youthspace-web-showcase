-- Custom SQL migration file, put your code below! --

-- ძველი დღიური კაპასიტეტი → ორივე ახალი სლოტი (10-14 და 18-22)
UPDATE "pricing_settings"
   SET "entry_capacity_morning" = "daily_entry_capacity",
       "entry_capacity_evening" = "daily_entry_capacity"
 WHERE "id" = 1;
--> statement-breakpoint

-- VIP პაკეტი გაუქმდა. VIP რიგებს club_ids ისედაც სრულად აქვთ შევსებული,
-- ამიტომ 'club'-ად გადარქმევის შემდეგ თითოეული კლუბის მთვლელი მათაც ითვლის.
-- ამის გარეშე vipSeatsRemaining-ის წაშლისთანავე VIP წევრი ვერცერთ კლუბში
-- ვერ იკავებდა ადგილს და კლუბები თავისუფალ ადგილებს აჩვენებდნენ.
UPDATE "subscriptions" SET "plan_type" = 'club' WHERE "plan_type" = 'vip';
--> statement-breakpoint

-- კურსის ფასდაკლება კლუბების რაოდენობიდან → per-club განაკვეთებზე.
-- ძველი course_discounts[1] („1 კლუბი") ედება ყველა კლუბს — ეს ზუსტად
-- იმეორებს დღევანდელ ქცევას ერთკლუბიანი წევრისთვის და სეზონის შუაში
-- ფასის ნახტომს გამორიცხავს. სვეტის წაშლამდე ეს აუცილებელია, თორემ
-- ყველა კურსის ფასდაკლება უხმაუროდ 0 გახდებოდა.
UPDATE "courses"
   SET "club_discounts" = COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
                  'clubId', "clubs"."id",
                  'percent', (SELECT "course_discounts"[1] FROM "pricing_settings" WHERE "id" = 1)))
           FROM "clubs"
          WHERE (SELECT "course_discounts"[1] FROM "pricing_settings" WHERE "id" = 1) > 0
       ), '[]'::jsonb);
--> statement-breakpoint

-- ძველი drop-in ჯავშნები მთელ დღეზე იწერებოდა (10:00:00–22:00:00). მათი
-- start_time ემთხვევა ახალ დილის სლოტს, ამიტომ დილის ადგილებს შეჭამდნენ
-- საღამოს გათავისუფლების გარეშე. მომავალი ჩანაწერები დილის სლოტად ცხადდება
-- (წარსული თარიღები ხელმისაწვდომობის მთვლელში არასდროს ხვდება).
UPDATE "bookings"
   SET "end_time" = '14:00'
 WHERE "item_type" = 'dropin'
   AND "start_time" = '10:00:00'
   AND "end_time" = '22:00:00'
   AND "booking_date" >= CURRENT_DATE;
