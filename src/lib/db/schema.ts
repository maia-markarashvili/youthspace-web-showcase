/**
 * მონაცემთა ბაზის სქემა — PRD §6 (Neon / Postgres).
 *
 * წესები:
 *  · ID — uuid, gen_random_uuid()
 *  · დრო — timestamptz default now()
 *  · თანხები — integer, **თეთრში** (GEL × 100)
 *  · კონტენტი/ფასები — admin-managed; კოდში hardcoded პროდუქტი არ არსებობს
 *  · `slots` ცხრილი არ არსებობს (§19 გააუქმა §5.9/§6.6) — ხელმისაწვდომობა
 *    სამი დამოუკიდებელი მთვლელია bookings-ის structured date/time-ზე (§19.1)
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LandingContent } from "@/lib/landing";
import type { CourseClubDiscount, EventPeopleTier } from "@/lib/pricing";
import type { EventWeekdays, WeekdayCapacities } from "@/lib/slots";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ── 6.1 კლუბები (recurring პროდუქტი, admin CRUD) ─────────────── */
export const clubs = pgTable("clubs", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  ageRange: text("age_range"),
  description: text("description"),
  audience: text("audience"),
  format: text("format"),
  finalProduct: text("final_product"),
  coverImage: text("cover_image"),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  /* ფასის სვეტები აქ აღარ არსებობს — კლუბის ერთიანი ფასი pricing_settings-შია */
  billingPeriod: text("billing_period").notNull().default("monthly"),
  meetingDay: text("meeting_day"),
  meetingTime: text("meeting_time"),
  /** სეზონის ფარგლები: ვადამდე ყიდვისას წევრობა startDate-იდან აქტიურდება;
   *  endDate-მდე <30 დღე ან გასული → სიაში „დასრულებული კლუბები“ სექციაში.
   *  null = ლიმიტი არ მოქმედებს */
  startDate: date("start_date"),
  endDate: date("end_date"),
  maxCapacity: integer("max_capacity"),
  /** ლენდინგ-გვერდის per-club კონტენტი; null/ცარიელი ველი = ავტო-default
   *  (src/lib/landing.ts) — backfill არ სჭირდება */
  landing: jsonb("landing").$type<LandingContent>(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  /** ადმინის ტოგლი „მიღება დასრულებულია" — კლუბი ჩანს, მაგრამ საჯარო ახალი
   *  რეგისტრაცია იკეტება (განახლება და ადმინის ხელით დამატება მუშაობს) */
  registrationClosed: boolean("registration_closed").notNull().default(false),
  createdAt: createdAt(),
});

/* ── 6.2 კურსები (ერთჯერადი ე-კომერსი, admin CRUD) ────────────── */
export const courses = pgTable("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  lecturer: text("lecturer"),
  scheduleText: text("schedule_text"),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  coverImage: text("cover_image"),
  capacity: integer("capacity"),
  priceRegular: integer("price_regular").notNull(),
  /** სააქციო ფასი — null = აქცია არაა; შევსებისას საიტზე ორივე ჩანს */
  salePrice: integer("sale_price"),
  /** განვადება - თვიური ფასი ერთ თვეზე (თეთრი); null = გამორთულია.
   *  ჩართულია ⇔ ორივე სვეტი შევსებულია: ცალკე boolean განზრახ არ გვაქვს,
   *  რომ „ჩართულია, ფასი კი ცარიელი“ მდგომარეობა ვერ გაჩნდეს. */
  monthlyPrice: integer("monthly_price"),
  /** განვადების თვეების რაოდენობა (2-36); null = გამორთულია */
  monthlyMonths: integer("monthly_months"),
  /** კლუბის წევრების ფასდაკლება ამ კურსზე — თითო კლუბს თავისი განაკვეთი
   *  (მაგ. მეწარმეები 10%, მოაზროვნეები 5%). რამდენიმე კლუბის წევრზე
   *  მოქმედებს **მაქსიმალური**. ცარიელი მასივი = ფასდაკლება არ მოქმედებს. */
  clubDiscounts: jsonb("club_discounts")
    .$type<CourseClubDiscount[]>()
    .notNull()
    .default([]),
  /** კურსის ვადები: startDate გასული → სიაში „დასრულებული კურსები“ სექციაში.
   *  null = ლიმიტი არ მოქმედებს */
  startDate: date("start_date"),
  endDate: date("end_date"),
  /** ლენდინგ-გვერდის per-course კონტენტი (იხ. clubs.landing) */
  landing: jsonb("landing").$type<LandingContent>(),
  isActive: boolean("is_active").notNull().default(true),
  /** „მიღება დასრულებულია" — კურსი ჩანს, რეგისტრაცია იკეტება (იხ. clubs) */
  registrationClosed: boolean("registration_closed").notNull().default(false),
  createdAt: createdAt(),
});

/* ── 6.3 სივრცეები (B2B, admin CRUD, ფასით) ───────────────────── */
export const spaces = pgTable("spaces", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  coverImage: text("cover_image"),
  capacity: integer("capacity"),
  inventory: jsonb("inventory").$type<string[]>().notNull().default([]),
  /* legacy საათობრივი ფასები — ღონისძიების მოდელზე გადასვლის (2026-08-30)
     შემდეგ აღარ გამოიყენება: ფასი pricing_settings.event_price_*-შია.
     სვეტები რჩება (არასდროს ვშლით), ფორმა აღარ გზავნის → default 0 */
  priceRegular: integer("price_regular").notNull().default(0),
  priceMember: integer("price_member").notNull().default(0),
  /** legacy — ჩვენების საათები; ღონისძიების მოდელში აღარ გამოიყენება */
  openingHour: integer("opening_hour").notNull().default(10),
  closingHour: integer("closing_hour").notNull().default(22),
  /** legacy (§5-ის units/full მოდელი) — ღონისძიების ერთიან დაჯავშნაზე
   *  გადასვლის შემდეგ აღარ გამოიყენება; სვეტები ისტორიისთვის რჩება */
  bookingMode: text("booking_mode").notNull().default("disabled"),
  slotUnits: integer("slot_units").notNull().default(8),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

/* ── 6.4 აბონემენტის პაკეტები — legacy: აპი აღარ კითხულობს (გეგმები
   მოიხსნა), ცხრილი პოლიტიკით რჩება — drop-მიგრაცია არ კეთდება ────── */
export const membershipPlans = pgTable("membership_plans", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  price: integer("price").notNull(),
  billingPeriod: text("billing_period").notNull().default("monthly"),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

/* ── 6.5 drop-in კონფიგი (singleton) ──────────────────────────── */
export const dropinSettings = pgTable(
  "dropin_settings",
  {
    id: integer("id").primaryKey().default(1),
    price: integer("price").notNull(),
    dailyCap: integer("daily_cap").notNull(),
    description: text("description"),
    openingHour: integer("opening_hour").notNull().default(10),
    closingHour: integer("closing_hour").notNull().default(22),
    /** საჯავშნო ფანჯარა: საწყისი თარიღი (null = დღეს) + რამდენი დღე ჩანს */
    bookingStartDate: date("booking_start_date"),
    bookingWindowDays: integer("booking_window_days").notNull().default(14),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("dropin_settings_singleton", sql`${t.id} = 1`)],
);

/* ── 6.14 ფასების კონფიგი (singleton) — გაყიდვების მოდელი ───────
   კლუბის ერთი ფასი / ერთჯერადი / 4× — სტანდარტული და სააქციო ფასები;
   მეგობრის კოდის განაკვეთი; სლოტების გლობალური კაპასიტეტები.
   (კურსის ფასდაკლებები courses.club_discounts-შია — per-club განაკვეთები.) */
export const pricingSettings = pgTable(
  "pricing_settings",
  {
    id: integer("id").primaryKey().default(1),
    clubPrice: integer("club_price").notNull(),
    singleEntryPrice: integer("single_entry_price").notNull(),
    fourPackPrice: integer("four_pack_price").notNull(),
    /** სააქციო ფასები — null = აქცია არ არის; შევსებისას საიტზე ორივე ჩანს */
    saleClubPrice: integer("sale_club_price"),
    saleSingleEntryPrice: integer("sale_single_entry_price"),
    saleFourPackPrice: integer("sale_four_pack_price"),
    clubSeatCapacity: integer("club_seat_capacity").notNull().default(30),
    fourPackValidityDays: integer("four_pack_validity_days")
      .notNull()
      .default(30),
    /** ვადის გასვლის შემდეგ რამდენ დღეს უნარჩუნდება წევრს ადგილი (grace) —
     *  ამ ფანჯარაში ადგილს სხვა ვერ იყიდის, განახლება კი ძველი ვადიდან ითვლება */
    renewalGraceDays: integer("renewal_grace_days").notNull().default(5),
    /** მეგობრის კოდის ფასდაკლება% — მოწვეულს პირველ თვეზე, მომყვანს კი
     *  შემდეგ განახლებაზე (თითო მოყვანილი მეგობარი = ერთი ფასდაკლებული თვე) */
    referralDiscountPercent: integer("referral_discount_percent")
      .notNull()
      .default(10),
    /** შესვლის სლოტების ადგილები — გლობალური default. იერარქია:
     *  calendar_overrides.capacity_* ?? weekday_capacities ?? ეს ველები
     *  (0 = სლოტი დახურულია). midday (14-18) ძირითადად კლუბების დროა,
     *  ამიტომ default 0 — მფლობელი ხსნის კვირის დღეებით ან override-ით */
    entryCapacityMorning: integer("entry_capacity_morning").notNull().default(15),
    entryCapacityMidday: integer("entry_capacity_midday").notNull().default(0),
    entryCapacityEvening: integer("entry_capacity_evening").notNull().default(15),
    /** კვირის დღეების რაოდენობები — {mon:{morning,midday,evening},...};
     *  აკლია/null = გლობალურ default-ზე გადასვლა, 0 = იმ კვირის დღეს დაკეტვა */
    weekdayCapacities: jsonb("weekday_capacities").$type<WeekdayCapacities>(),
    /** ღონისძიების (სივრცის ერთიანი დაჯავშნის) სლოტის ფასები თეთრებში —
     *  ჯამი = სლოტის ფასი + ხალხის საფეხურის დანამატი (event_people_tiers) */
    eventPriceMorning: integer("event_price_morning").notNull().default(10000),
    eventPriceMidday: integer("event_price_midday").notNull().default(15000),
    eventPriceEvening: integer("event_price_evening").notNull().default(20000),
    /** წევრის ფასი სლოტზე — null = არ მოქმედებს; მოქმედებს მხოლოდ მაშინ,
     *  თუ სტანდარტულზე ნაკლებია (eventSlotPrice ამას აწესრიგებს) */
    eventMemberPriceMorning: integer("event_member_price_morning"),
    eventMemberPriceMidday: integer("event_member_price_midday"),
    eventMemberPriceEvening: integer("event_member_price_evening"),
    /** ხალხის 4 საფეხური [{upTo, price(თეთრი)}...] — null = კოდის
     *  DEFAULT_EVENT_PEOPLE_TIERS; ყოველთვის eventPeopleTiers()-ით იკითხება */
    eventPeopleTiers: jsonb("event_people_tiers").$type<EventPeopleTier[]>(),
    /** ღონისძიების კვირის ბადე — {mon:{morning:true,evening:true},...};
     *  მხოლოდ მონიშნულები იწერება, აკლია/null = ის სლოტი იმ კვირის დღეს
     *  არ იყიდება. კონკრეტული დღის გამონაკლისი (calendar_overrides.event_*)
     *  ბადეს ჯაბნის — იხ. resolveEventSlotOpen (lib/slots.ts) */
    eventWeekdays: jsonb("event_weekdays").$type<EventWeekdays>(),
    /** გადარიცხვის რეკვიზიტები — ყიდვის წარმატების ეკრანზე ჩანს */
    bankRequisites: text("bank_requisites"),
    /** გადმორიცხვის pending ჯავშნის ჰოლდი საათებში — ვადის გასვლის შემდეგ
     *  ადგილი ავტომატურად თავისუფლდება (occupies*Condition). 0 = უვადოდ,
     *  ძველი ქცევა */
    transferHoldHours: integer("transfer_hold_hours").notNull().default(72),
    /** გადმორიცხვით ყიდვისას SMS-კოდის მოთხოვნა უცნობი ნომრისთვის (§4) —
     *  გამორთვისას ყველაფერი ისეა, როგორც ადრე. UBILL-ის credentials-ის
     *  არარსებობისას ისედაც არ ითხოვება (otpRequired() ორივეს ამოწმებს) */
    otpRequiredForTransfer: boolean("otp_required_for_transfer")
      .notNull()
      .default(true),
    /** საჯარო „დარჩა N" მთვლელების გლობალური ჩამრთველი (2026-09-07) —
     *  გამორთულია = რიცხვები საიტზე არსად ჩანს; sold-out ეტიკეტები, ადმინი
     *  და drop-in-ის სლოტ-მთვლელები ამას არ ემორჩილება. ლენდინგებზე თითო
     *  კლუბ/კურსის landing.showSeats დამატებით პირობად რჩება */
    showPublicSeats: boolean("show_public_seats").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("pricing_settings_singleton", sql`${t.id} = 1`)],
);

/* ── 6.16 კალენდრის გამონაკლისები — drop-in დღეების მართვა ──────
   ჩანაწერი არ არის = default (სამუშაო დღე ღია, შაბ-კვირა დახურული);
   isOpen=true → ხელით გახსნილი შაბ-კვირა; isOpen=false → დახურული დღე (უქმე) */
export const calendarOverrides = pgTable("calendar_overrides", {
  /** 'YYYY-MM-DD' */
  date: date("date").primaryKey(),
  isOpen: boolean("is_open").notNull(),
  note: text("note"),
  /** ამ დღის შესვლის ადგილები სლოტზე — null = კვირის დღის/გლობალური
   *  default, 0 = სლოტი ამ დღეს დახურულია */
  capacityMorning: integer("capacity_morning"),
  capacityMidday: integer("capacity_midday"),
  capacityEvening: integer("capacity_evening"),
  /** დღესვე გაყიდვის ნებართვა სლოტზე — მოქმედებს მხოლოდ მაშინ, როცა
   *  date = მიმდინარე დღე: უამისოდ დღევანდელი სლოტი მხოლოდ მაშინ იყიდება,
   *  თუ მასზე უკვე არსებობს ≥1 ჯავშანი (ოპერატორი ისედაც მოდის) */
  sameDayMorning: boolean("same_day_morning").notNull().default(false),
  sameDayMidday: boolean("same_day_midday").notNull().default(false),
  sameDayEvening: boolean("same_day_evening").notNull().default(false),
  /** ღონისძიების სლოტის **გამონაკლისი** ამ დღეს (2026-09-01-დან სამმდგომარეობიანი):
   *  null = კვირის ბადის მიხედვით (pricing_settings.event_weekdays),
   *  true = ხელით გახსნილი (ჯაბნის ბადესაც და დღის დახურვასაც),
   *  false = ხელით დაკეტილი. ჯვარედინი ბლოკი (შესვლები ⟷ ღონისძიება)
   *  ჯავშნების არსებობით ითვლება — იხ. resolveEventSlotOpen (lib/slots.ts) */
  eventMorning: boolean("event_morning"),
  eventMidday: boolean("event_midday"),
  eventEvening: boolean("event_evening"),
  createdAt: createdAt(),
});

/* ── 6.15 შესვლის აბონემენტი (4×) — გამოყენება bookings-იდან ითვლება ── */
export const entryPasses = pgTable(
  "entry_passes",
  {
    id: id(),
    orderRef: text("order_ref").notNull().unique(),
    buyerName: text("buyer_name").notNull(),
    buyerPhone: text("buyer_phone").notNull(),
    buyerEmail: text("buyer_email"),
    /** მომხმარებლის ანგარიშის პროფილი (§20) — null = სტუმრის/ძველი ყიდვა */
    profileId: uuid("profile_id").references(() => accountProfiles.id),
    amountGel: integer("amount_gel").notNull(),
    entriesTotal: integer("entries_total").notNull().default(4),
    /** კლუბის წევრობის ბონუს-პასი — რომელ გამოწერას ეკუთვნის (null = ნაყიდი
     *  4-პაკეტი). განახლებისას იგივე რიგი გადაიწერება (order_ref unique-ია),
     *  entriesTotal ხდება სიცოცხლის მთვლელი: used + 4 */
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    /** pending | active | expired | cancelled */
    status: text("status").notNull().default("pending"),
    /** ანალიტიკის თანხმობა ყიდვისას — იხ. bookings.analytics_consent */
    analyticsConsent: boolean("analytics_consent").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** ბარათით გადახდის დროებითი ჯავშანი — ვადის გასვლის შემდეგ pending რიგი
     *  აღარ ითვლება (მიტოვებული checkout). null = გადმორიცხვა, ვადა არ აქვს */
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    /** ადმინმა ხელით დაუკავა ადგილი გადახდის გარეშე (§1.5) — status pending
     *  რჩება, holdExpiresAt null-ია (უვადოდ იკავებს), ეს ველი კი აღნიშნავს
     *  „გადაუხდელად დაკავებულს" ჩვეულებრივი გადმორიცხვისგან განსხვავებით */
    reservedAt: timestamp("reserved_at", { withTimezone: true }),
    reservedNote: text("reserved_note"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** ვინ გააუქმა: 'customer' | 'admin' | 'system'; null = ძველი ჩანაწერი */
    cancelledBy: text("cancelled_by"),
    createdAt: createdAt(),
  },
  (t) => [index("idx_passes_phone").on(t.buyerPhone, t.status)],
);

/* ── 6.7 ერთჯერადი ჯავშნები (dropin / course / space) ─────────── */
export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    orderRef: text("order_ref").notNull().unique(),
    /** 'dropin' | 'course' | 'space' */
    itemType: text("item_type").notNull(),
    /** courses.id / spaces.id (dropin → null) */
    itemId: uuid("item_id"),
    /** §19.1 — რომელი ოთახია დაჯავშნილი (space booking-ზე; სხვაგან null) */
    spaceId: uuid("space_id").references(() => spaces.id),
    /** 4×-პასით დაჯავშნილი შესვლა — პასის დარჩენილი შესვლები ამით ითვლება */
    passId: uuid("pass_id").references(() => entryPasses.id),
    bookingDate: date("booking_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerPhone: text("buyer_phone").notNull(),
    /** მომხმარებლის ანგარიშის პროფილი (§20) — null = სტუმრის/ძველი ყიდვა */
    profileId: uuid("profile_id").references(() => accountProfiles.id),
    quantity: integer("quantity").notNull().default(1),
    /** ღონისძიების ჯავშნის ხალხის საფეხურის ზღვარი („N ადამიანამდე") —
     *  მხოლოდ itemType='space'-ზე; სხვაგან null */
    peopleUpTo: integer("people_up_to"),
    amountGel: integer("amount_gel").notNull(),
    /** კურსის თვიური გეგმა: სულ რამდენი თვეა. null = ერთიანად გადახდილი
     *  ჯავშანი. `amount_gel` ორივე შემთხვევაში ერთი ჩამოჭრის თანხაა -
     *  თვიურზე ეს **პირველი თვეა**, არასდროს გეგმის ჯამი. */
    planMonths: integer("plan_months"),
    /** რეალურად გადახდილი თვეები - დადასტურებაზე 1, მერე ადმინი ზრდის */
    monthsPaid: integer("months_paid").notNull().default(0),
    /** შემდეგი თვის ვადა - კურსის ანალოგი subscriptions.current_period_end-ისა.
     *  null = გეგმა დასრულდა (ან თვიური გეგმა არ აქვს). ავტომატური ჩამოჭრა
     *  არ ხდება: ადმინი ამ ვადით აგზავნის ხელით SMS-შეხსენებას. */
    planNextDueAt: timestamp("plan_next_due_at", { withTimezone: true }),
    isMemberPrice: boolean("is_member_price").notNull().default(false),
    memberEmail: text("member_email"),
    promoCode: text("promo_code"),
    /** pending | confirmed | cancelled | refunded */
    status: text("status").notNull().default("pending"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    /** ადმინმა ხელით დაუკავა ადგილი გადახდის გარეშე (§1.5) — იხ. entry_passes */
    reservedAt: timestamp("reserved_at", { withTimezone: true }),
    reservedNote: text("reserved_note"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** ვინ გააუქმა: 'customer' | 'admin' | 'system'; null = ძველი ჩანაწერი */
    cancelledBy: text("cancelled_by"),
    /* §13 სამართლებრივი — nullable schema-ში, required ლოგიკურად */
    purchaseFor: text("purchase_for").notNull().default("self"),
    childName: text("child_name"),
    childAge: integer("child_age"),
    parentConsent: boolean("parent_consent"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    termsAccepted: boolean("terms_accepted").notNull().default(false),
    /** ანალიტიკის/მარკეტინგის თანხმობა ყიდვის მომენტში (ბანერის cookie) —
     *  CAPI user_data მხოლოდ true-ზე იგზავნება (ეტაპი 5, 2026-09-03) */
    analyticsConsent: boolean("analytics_consent").notNull().default(false),
    /* §12 — { source, utm_source, utm_medium, utm_campaign } */
    attribution: jsonb("attribution"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_bookings_status").on(t.status),
    index("idx_bookings_date").on(t.itemType, t.bookingDate, t.status),
    index("idx_bookings_item").on(t.itemType, t.itemId, t.status),
    index("idx_bookings_space").on(t.spaceId, t.bookingDate, t.status),
  ],
);

/* ── 6.8 recurring გამოწერები (კლუბები + აბონემენტი) = წევრობა ── */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    /** 'club' | 'vip' | 'membership' (legacy) */
    planType: text("plan_type").notNull(),
    /** მოკლე კოდი (CLB-##### ტიპის; ძველი SIV-) — ტელეფონთან ერთად იდენტიფიკატორი */
    orderRef: text("order_ref").unique(),
    /** club_type: არჩეული კლუბები (base + additional) */
    clubIds: uuid("club_ids").array(),
    planId: uuid("plan_id").references(() => membershipPlans.id),
    subscriberName: text("subscriber_name").notNull(),
    subscriberEmail: text("subscriber_email").notNull(),
    subscriberPhone: text("subscriber_phone").notNull(),
    /** მომხმარებლის ანგარიშის პროფილი (§20) — null = სტუმრის/ძველი ყიდვა */
    profileId: uuid("profile_id").references(() => accountProfiles.id),
    amountGel: integer("amount_gel").notNull(),
    billingPeriod: text("billing_period").notNull().default("monthly"),
    /** ფაზა 2 (auto-charge); MVP-ში გამოუყენებელი (§14) */
    flittToken: text("flitt_token"),
    /** მეგობრის კოდი, რომელიც ამ ყიდვისას შეიყვანეს (აუდიტისთვის) */
    referredByCode: text("referred_by_code"),
    /** active | expired | cancelled (§14) */
    status: text("status").notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /** ბარათით გადახდის დროებითი ჯავშანი — ვადის გასვლის შემდეგ pending რიგი
     *  ადგილს აღარ იკავებს. null = გადმორიცხვა, ვადა არ აქვს */
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    /** ადმინმა ხელით დაუკავა ადგილი გადახდის გარეშე (§1.5) — იხ. entry_passes */
    reservedAt: timestamp("reserved_at", { withTimezone: true }),
    reservedNote: text("reserved_note"),
    /** §12 — მხოლოდ აქტიური გაუქმებისას (არა expired) */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    /** ვინ გააუქმა: 'customer' | 'admin' | 'system'; null = ძველი ჩანაწერი */
    cancelledBy: text("cancelled_by"),
    /* §13 */
    purchaseFor: text("purchase_for").notNull().default("self"),
    childName: text("child_name"),
    childAge: integer("child_age"),
    parentConsent: boolean("parent_consent"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    /** §17 — ცალკე თანხმობა ფოტო/ვიდეო/სახელის საჯარო გამოყენებაზე */
    photoConsent: boolean("photo_consent"),
    termsAccepted: boolean("terms_accepted").notNull().default(false),
    /** ანალიტიკის თანხმობა ყიდვისას — იხ. bookings.analytics_consent */
    analyticsConsent: boolean("analytics_consent").notNull().default(false),
    attribution: jsonb("attribution"),
    createdAt: createdAt(),
  },
  (t) => [index("idx_subs_member").on(t.subscriberEmail, t.status)],
);

/* ── 6.17 რეფერალური კრედიტები — „მოიყვანე მეგობარი" ────────────
   მოწვეული ფასდაკლებას ყიდვისთანავე იღებს (subscriptions.amount_gel-ში
   დაფიქსირებული); მომყვანს ერთი ფასდაკლებული თვე ერიცხება, რომელსაც
   განახლებისას ხარჯავს. მომყვანი **subscription_id-თი** იდენტიფიცირდება —
   ეს რიგი განახლებებს შორის უცვლელია (renewSubscription იმავე რიგს ცვლის),
   ტელეფონის სტრიქონი კი არა. */
export const referralCredits = pgTable(
  "referral_credits",
  {
    id: id(),
    /** ვისი კოდიც გამოიყენეს — მას ერგება ფასდაკლებული თვე */
    referrerSubscriptionId: uuid("referrer_subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    /** ერთი მოწვეული ყიდვა = ერთი კრედიტი (unique) */
    refereeSubscriptionId: uuid("referee_subscription_id")
      .notNull()
      .unique()
      .references(() => subscriptions.id),
    /** ნაკრეფი კოდი — აუდიტისთვის */
    code: text("code").notNull(),
    /** განაკვეთის snapshot — ადმინის მოგვიანებითი ცვლილება დაპირებას არ გადაწერს */
    discountPercent: integer("discount_percent").notNull(),
    /** pending (მოწვეული ჯერ არ დადასტურდა) | available | used | cancelled */
    status: text("status").notNull().default("pending"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_referral_credits_referrer").on(t.referrerSubscriptionId, t.status),
  ],
);

/* ── 6.9 გადახდები (Flitt) ────────────────────────────────────── */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    /** 4-შესვლიანი პაკეტის ყიდვა — ერთადერთი, რომელსაც booking/subscription
     *  არ ჰყავს (მხოლოდ entry_passes რიგი იქმნება) */
    passId: uuid("pass_id").references(() => entryPasses.id),
    flittPaymentId: text("flitt_payment_id"),
    orderRef: text("order_ref").notNull(),
    amountGel: integer("amount_gel").notNull(),
    currency: text("currency").notNull().default("GEL"),
    method: text("method"),
    /** created | paid | failed | refunded */
    status: text("status").notNull().default("created"),
    rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
    /** დაბრუნების გვერდის საიდუმლო — order_ref მხოლოდ 90k ვარიანტია და
     *  მეგობრის კოდად საჯაროდ ვრცელდება, ამიტომ სტატუსს ტოკენით ვხსნით */
    returnToken: text("return_token"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_payments_order_ref").on(t.orderRef),
    uniqueIndex("idx_payments_return_token").on(t.returnToken),
    check(
      "payments_target_required",
      sql`${t.bookingId} IS NOT NULL OR ${t.subscriptionId} IS NOT NULL OR ${t.passId} IS NOT NULL`,
    ),
  ],
);

/* ── 6.10 promo-კოდები (§18) — ფიჩა არ აშენებულა: აპი ცხრილს არ კითხულობს,
   პოლიტიკით რჩება — drop-მიგრაცია არ კეთდება ───────────────────── */
export const promoCodes = pgTable("promo_codes", {
  id: id(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent"),
  grantsMemberPrice: boolean("grants_member_price").notNull().default(false),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/* ── 6.11 ლიდები (partner + contact + registration) ───────────── */
export const leads = pgTable("leads", {
  id: id(),
  /** 'b2b_partner' | 'contact' | 'registration' */
  type: text("type").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  message: text("message"),
  payload: jsonb("payload"),
  status: text("status").notNull().default("new"),
  createdAt: createdAt(),
});

/* ── 6.12 ნიუსლეთერი + admin ──────────────────────────────────── */
export const subscribers = pgTable("subscribers", {
  id: id(),
  email: text("email").notNull().unique(),
  source: text("source"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const adminUsers = pgTable(
  "admin_users",
  {
    id: id(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    /** 'admin' (მფლობელი, სრული წვდომა) | 'reception' (მხოლოდ /admin/desk) */
    role: text("role").notNull().default("admin"),
    /** false = შესვლა აკრძალულია და ცოცხალი JWT-ც უქმდება (loadAdmin ამოწმებს) */
    isActive: boolean("is_active").notNull().default(true),
    /** JWT-ის თაობა — პაროლის შეცვლა/დეაქტივაცია ზრდის და ძველი ტოკენები კვდება */
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [check("admin_users_role", sql`${t.role} in ('admin', 'reception')`)],
);

/* ── 6.16 ადმინის აუდიტის ჟურნალი — ვინ, როდის, რა (§3.4) ───────
   ნედლი ტელეფონი/მეილი აქ არასდროს იწერება — თორემ ჟურნალი თავად
   გახდება ის ბაზა, რომლისგანაც ვიცავთ. */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: id(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminUsers.id),
    /** snapshot — ადმინის წაშლის შემდეგაც იკითხება */
    adminEmail: text("admin_email").notNull(),
    /** 'desk.search' | 'desk.checkin' | 'desk.visit' | 'desk.resend_code'
     *  | 'order.confirm' | 'order.cancel' | 'user.create' | 'user.deactivate' | ... */
    action: text("action").notNull(),
    /** 'subscription' | 'booking' | 'pass' | 'admin_user' */
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    /** order_ref — ადამიანისთვის, ID-ის ნაცვლად */
    targetRef: text("target_ref"),
    /** ⚠ არასდროს შეიცავს ნედლ ტელეფონს/ელფოსტას */
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_audit_admin").on(t.adminId, t.createdAt),
    index("idx_audit_created").on(t.createdAt),
  ],
);

/* ── 6.17 ვიზიტები — მოსვლის ფაქტობრივი ჟურნალი (QR/ხელით მიღება) ─
   ზუსტად ერთი სამიზნე (ჯავშანი / პასი / გამოწერა) + ოპერატორი + დრო.
   პასის შესვლების ხარჯვას **არ** ეხება (ის ჯავშნებით ითვლება,
   availability.ts) — ეს მხოლოდ „ვინ, როდის, ვინ მიიღო" ჩანაწერია.
   PII-სვეტები აქ არ არის — სახელები წაკითხვისას join-ით მოდის. */
export const visits = pgTable(
  "visits",
  {
    id: id(),
    bookingId: uuid("booking_id").references(() => bookings.id),
    passId: uuid("pass_id").references(() => entryPasses.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminUsers.id),
    /** snapshot — ოპერატორი ადმინის წაშლის შემდეგაც იკითხება (audit-ის პრინციპი) */
    adminEmail: text("admin_email").notNull(),
    /** 'qr' | 'manual' */
    method: text("method").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_visits_booking").on(t.bookingId, t.createdAt),
    index("idx_visits_pass").on(t.passId, t.createdAt),
    index("idx_visits_subscription").on(t.subscriptionId, t.createdAt),
    index("idx_visits_created").on(t.createdAt),
    check(
      "visits_one_target",
      sql`num_nonnulls(${t.bookingId}, ${t.passId}, ${t.subscriptionId}) = 1`,
    ),
    check("visits_method", sql`${t.method} in ('qr', 'manual')`),
  ],
);

/* ── 6.13 კონტენტი: ამბები + ნამუშევრები (ტექსტი/ვიდეო/კვლევა) ─ */
export const contentPosts = pgTable(
  "content_posts",
  {
    id: id(),
    /** 'news' | 'work_text' | 'work_video' | 'work_research' */
    type: text("type").notNull(),
    clubId: uuid("club_id").references(() => clubs.id),
    slug: text("slug").unique(),
    title: text("title").notNull(),
    body: text("body"),
    authorName: text("author_name"),
    /** აჯგუფებს ერთი კონკურსის/ღონისძიების ჩანაწერებს (§16) */
    collectionSlug: text("collection_slug"),
    media: jsonb("media").$type<string[]>().notNull().default([]),
    /** work_video: YouTube ბმული (thumbnail + embed აქედან) */
    youtubeUrl: text("youtube_url"),
    /** work_research: ატვირთული PDF (/uploads/<uuid>.pdf) */
    fileUrl: text("file_url"),
    /** დაკავშირებული ბმულები — დეტალის გვერდზე ღილაკებად; null = არ არის */
    relatedLinks: jsonb("related_links").$type<{ label: string; href: string }[]>(),
    isFeatured: boolean("is_featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_content_type").on(t.type, t.isActive),
    index("idx_content_club").on(t.clubId, t.type),
  ],
);

/* ── 6.14 ჰერო-სლაიდერი (მთავარი გვერდის ბანერები, admin CRUD) ── */
export const heroSlides = pgTable("hero_slides", {
  id: id(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  eyebrow: text("eyebrow"),
  title: text("title").notNull(),
  /** სლოგანის ხაზი სათაურის ქვემოთ (მაგ. „გართობა · ურთიერთობა · განვითარება“) */
  sloganUnder: text("slogan_under"),
  body: text("body").notNull(),
  image: text("image").notNull(),
  imageAlt: text("image_alt").notNull(),
  cta1Label: text("cta1_label"),
  cta1Href: text("cta1_href"),
  cta2Label: text("cta2_label"),
  cta2Href: text("cta2_href"),
  /** დიდი რიცხვები (მაგ. „226 ახალგაზრდა“) — ცარიელი მასივი = სტატები არ ჩანს */
  stats: jsonb("stats").$type<{ value: string; label: string }[]>()
    .notNull()
    .default([]),
  createdAt: createdAt(),
});

/* ── 6.15 საიტის ტექსტები: მხოლოდ override-ები ────────────────────
   default-ები კოდშია (src/lib/site-texts/registry) — რიგის არარსებობა
   ნიშნავს default-ს, წაშლა = default-ზე დაბრუნება */
export const siteTexts = pgTable("site_texts", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ── 6.16 იურიდიული დოკუმენტების PDF-ვერსიები ─────────────────────
   /terms და /privacy გვერდების ტექსტის ქვემოთ „მოქმედია {თარიღი}-დან"
   სიად ჩანს. მიმდინარე ტექსტი site_texts-შია (terms.body / privacy.body),
   აქ მხოლოდ ატვირთული PDF-ები თარიღებით. */
export const legalVersions = pgTable(
  "legal_versions",
  {
    id: id(),
    /** 'terms' | 'privacy' */
    kind: text("kind").notNull(),
    /** /uploads/<uuid>.pdf */
    fileUrl: text("file_url").notNull(),
    /** ამ დღიდან მოქმედი ვერსია */
    effectiveFrom: date("effective_from").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("idx_legal_kind").on(t.kind, t.effectiveFrom)],
);

/* ── 6.17 ტელეფონის დადასტურება (§4) — გადმორიცხვით ყიდვის SMS-კოდი
   უცნობი ნომრისთვის. cron არ გვაქვს, ამიტომ ძველი რიგები lazy-delete-ით
   იწმინდება (otp.ts-ის startPhoneVerification-ში, ჩაწერისას). */
export const phoneVerifications = pgTable(
  "phone_verifications",
  {
    id: id(),
    /** normalizePhoneDigits() — ბოლო 9 ციფრი, ერთადერთი საძებნი ფორმა */
    phone: text("phone").notNull(),
    /** HMAC-SHA256(SESSION_SECRET, phone:code) — ნედლი კოდი არასდროს ინახება */
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** null = ჯერ არ დადასტურებულა */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /** ამ დრომდე იმავე ნომერს კოდი აღარ სჭირდება (ერთი ვიზიტის განმავლობაში
     *  ორი ნივთის ყიდვისას მეორე SMS აღარ იხარჯება) */
    trustedUntil: timestamp("trusted_until", { withTimezone: true }),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_phone_verif_phone").on(t.phone, t.createdAt),
    index("idx_phone_verif_trust").on(t.phone, t.trustedUntil),
    index("idx_phone_verif_ip").on(t.ip, t.createdAt),
  ],
);

/* ── 6.20 მომხმარებლის ანგარიშები (customer accounts) ──────────────
   ერთი ანგარიში = ერთი login-იდენტობა (Google ან მეილი/პაროლი), რომელშიც
   ერთიანდება რამდენიმე პროფილი (მშობელი + შვილები). ყიდვები (subscriptions/
   bookings/entry_passes) პროფილს უკავშირდება profile_id-ით; ძველი/სტუმრის
   ყიდვები profile_id=null რჩება და კაბინეტში დადასტურებული ტელეფონით/მეილით
   ამოტივტივდება. admin_users-ისგან სრულად დამოუკიდებელი (სხვა cookie/DAL). */
export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    email: text("email").notNull().unique(),
    /** null = მხოლოდ OAuth-ით (Google) შესვლა, პაროლი არ აქვს */
    passwordHash: text("password_hash"),
    /** Google OAuth `sub` — null = პაროლით ანგარიში */
    googleId: text("google_id").unique(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    /** null = ჯერ არ დადასტურებულა (Google → ავტომ. დადასტურებული) */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    /** pending (აქტივაციის მოლოდინში) | active | disabled */
    status: text("status").notNull().default("pending"),
    /** სესიის თაობა — პაროლის reset/დეაქტივაცია ზრდის, ძველი ტოკენი კვდება
     *  (admin_users.token_version-ის იგივე ლოგიკა) */
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "accounts_status",
      sql`${t.status} in ('pending', 'active', 'disabled')`,
    ),
  ],
);

/* პროფილი = მომსახურე ადამიანი (თავად მშობელი ან შვილი). self-პროფილი
   ავტომ. იქმნება რეგისტრაციისას; მშობელი ამატებს ბავშვებს. */
export const accountProfiles = pgTable(
  "account_profiles",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    birthDate: date("birth_date"),
    /** 'self' (ანგარიშის მფლობელი) | 'child' | 'other' */
    relationship: text("relationship").notNull().default("self"),
    /** §13 — არასრულწლოვნის მშობლის თანხმობა */
    parentConsent: boolean("parent_consent"),
    /** §17 — ფოტო/ვიდეო/სახელის საჯარო გამოყენება */
    photoConsent: boolean("photo_consent"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_account_profiles_account").on(t.accountId),
    check(
      "account_profiles_relationship",
      sql`${t.relationship} in ('self', 'child', 'other')`,
    ),
  ],
);

/* ანგარიშის დადასტურების/აღდგენის კოდი — აქტივაცია (მეილი+SMS ერთი კოდით),
   პაროლის აღდგენა, არხის ცვლილება. ნედლი კოდი არ ინახება (HMAC).
   cron არ გვაქვს → ძველი lazy-delete ჩაწერისას (phone_verifications-ის მსგავსად). */
export const accountVerifications = pgTable(
  "account_verifications",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** 'activate' | 'password_reset' | 'phone_change' | 'email_change' */
    purpose: text("purpose").notNull(),
    /** HMAC-SHA256(SESSION_SECRET, accountId:purpose:code) — ნედლი კოდი არ ინახება */
    codeHash: text("code_hash").notNull(),
    /** რომელი არხით გაიგზავნა რეალურად — კოდის შეყვანა მხოლოდ იმ არხს
     *  ადასტურებს, რომლითაც მართლა მივიდა: ორივეზე გაგზავნისას ტელეფონს
     *  ვერ ჩავთვლით დადასტურებულად (მეილით მიღებული კოდით სხვისი ნომრის
     *  „დადასტურება" შეიძლებოდა და კაბინეტი მის ისტორიას აჩვენებდა) */
    emailSent: boolean("email_sent").notNull().default(false),
    smsSent: boolean("sms_sent").notNull().default(false),
    /** HMAC(ნომერი) — SMS-fallback-ის per-ნომრის დღიური ლიმიტისთვის.
     *  ნედლი ნომერი აქ განზრახ არ ინახება (ეს ცხრილი PII-ს არ აგროვებს). */
    smsPhoneKey: text("sms_phone_key"),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** null = ჯერ არ გამოყენებულა */
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_account_verif_account").on(
      t.accountId,
      t.purpose,
      t.createdAt,
    ),
  ],
);

export type Club = typeof clubs.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type PricingSettings = typeof pricingSettings.$inferSelect;
export type CalendarOverride = typeof calendarOverrides.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type DropinSettings = typeof dropinSettings.$inferSelect;
export type ReferralCredit = typeof referralCredits.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type ContentPost = typeof contentPosts.$inferSelect;
export type HeroSlide = typeof heroSlides.$inferSelect;
export type LegalVersion = typeof legalVersions.$inferSelect;

export const CONTENT_TYPES = [
  "news",
  "work_text",
  "work_video",
  "work_research",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** ნამუშევრების ქვეტიპები — „ნამუშევრები“ ტაბი და კლუბის ლენდინგის §6 */
export const WORK_TYPES = ["work_text", "work_video", "work_research"] as const;
