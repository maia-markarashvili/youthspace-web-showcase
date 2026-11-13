import "server-only";
import { and, count, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  pricingSettings,
  subscriptions,
  type PricingSettings,
} from "@/lib/db/schema";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  ENTRY_SLOT_KEYS,
  emptySlotCounts,
  slotByStartTime,
  weekdayKeyFor,
  type EntrySlotKey,
  type SlotCounts,
} from "@/lib/slots";

/**
 * ხელმისაწვდომობის მთვლელები (§19-ის პრინციპი — ცალკე slots ცხრილის გარეშე):
 * ყველაფერი pending+active/confirmed ჩანაწერებიდან ითვლება; გაუქმებული
 * სტატუსები არ ითვლება, ამიტომ გაუქმება ადგილს ავტომატურად ათავისუფლებს.
 */

export const OCCUPYING_SUB_STATUSES = ["pending", "active"];
export const OCCUPYING_BOOKING_STATUSES = ["pending", "confirmed"];

/**
 * როდის იკავებს გამოწერა ადგილს: pending ყოველთვის; active — სანამ
 * ვადა + grace-ფანჯარა (renewalGraceDays) არ ამოიწურება. გრეისში ადგილი
 * წევრს უნარჩუნდება (ვერავინ იყიდის), გრეისის მერე თავისუფლდება — cron
 * არ სჭირდება, ყველა მთვლელი ამ ერთ პირობას იყენებს.
 *
 * ბარათით გადახდისას pending რიგს `hold_expires_at` აქვს: ვადის გასვლის
 * შემდეგ (მიტოვებული checkout) ადგილს აღარ იკავებს. გადმორიცხვის რიგებს
 * ეს ველი null-ია — ისინი, როგორც აქამდე, ვადის გარეშე იკავებენ.
 */
export function occupiesSeatCondition(settings: PricingSettings) {
  return and(
    inArray(subscriptions.status, OCCUPYING_SUB_STATUSES),
    or(
      isNull(subscriptions.currentPeriodEnd),
      sql`${subscriptions.currentPeriodEnd} + make_interval(days => ${settings.renewalGraceDays}) > now()`,
    ),
    activeHoldCondition(subscriptions.status, subscriptions.holdExpiresAt),
  );
}

/** ჯავშნის იგივე პირობა bookings-ისთვის */
export function occupiesBookingCondition() {
  return and(
    inArray(bookings.status, OCCUPYING_BOOKING_STATUSES),
    activeHoldCondition(bookings.status, bookings.holdExpiresAt),
  );
}

/** „ჰოლდი ჯერ ცოცხალია": არა-pending, ან ვადა არ აქვს, ან ვადა არ გასულა */
function activeHoldCondition(
  statusColumn: typeof bookings.status | typeof subscriptions.status,
  holdColumn: typeof bookings.holdExpiresAt | typeof subscriptions.holdExpiresAt,
) {
  return or(
    ne(statusColumn, "pending"),
    isNull(holdColumn),
    sql`${holdColumn} > now()`,
  );
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const [settings] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.id, 1))
    .limit(1);
  if (!settings) {
    throw new Error("pricing_settings ცარიელია - გაუშვი db:seed");
  }
  return settings;
}

/**
 * თითო კლუბის დარჩენილი ადგილები (კლუბის id → დარჩენილი).
 * მთვლელი ინდივიდუალურია. ისტორიულ მრავალკლუბიან ჩანაწერებს `clubIds`
 * მასივი სრულად აქვთ, ამიტომ ისინი ყველა თავის კლუბს აკლებენ ადგილს.
 */
export async function clubSeatsRemainingByClub(
  settings: PricingSettings,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ clubIds: subscriptions.clubIds })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.planType, "club"),
        occupiesSeatCondition(settings),
      ),
    );

  const taken = new Map<string, number>();
  for (const row of rows) {
    for (const clubId of row.clubIds ?? []) {
      taken.set(clubId, (taken.get(clubId) ?? 0) + 1);
    }
  }

  const remaining = new Map<string, number>();
  for (const [clubId, n] of taken) {
    remaining.set(clubId, Math.max(0, settings.clubSeatCapacity - n));
  }
  return remaining;
}

/** კლუბის დარჩენილი — Map-ში არარსებობა ნიშნავს სრულ კაპასიტეტს */
export function seatsFor(
  remaining: Map<string, number>,
  clubId: string,
  settings: PricingSettings,
): number {
  return remaining.get(clubId) ?? settings.clubSeatCapacity;
}

/* ── შესვლის სლოტები (10:00–14:00 / 14:00–18:00 / 18:00–22:00) ──── */

/**
 * ამ დღეს კონკრეტული სლოტის ადგილები, სამსაფეხურიანი იერარქიით:
 * კონკრეტული დღის override ?? კვირის დღის რაოდენობა (weekday_capacities)
 * ?? გლობალური default. თითო საფეხურზე 0 ცხადი მნიშვნელობაა (სლოტი
 * დაკეტილია), null/აკლია კი შემდეგ საფეხურზე გადასვლა.
 */
export function resolveSlotCapacity(
  settings: PricingSettings,
  dateISO: string,
  override?: SlotOverride,
): SlotCounts {
  const weekday = settings.weekdayCapacities?.[weekdayKeyFor(dateISO)];
  return {
    morning:
      override?.capacityMorning ??
      weekday?.morning ??
      settings.entryCapacityMorning,
    midday:
      override?.capacityMidday ??
      weekday?.midday ??
      settings.entryCapacityMidday,
    evening:
      override?.capacityEvening ??
      weekday?.evening ??
      settings.entryCapacityEvening,
  };
}

export type SlotOverride = {
  capacityMorning: number | null;
  capacityMidday: number | null;
  capacityEvening: number | null;
};

/** სლოტების მდგომარეობა ერთ დღეზე — მთვლელები + ღონისძიების დროშა */
export type SlotUsage = {
  left: SlotCounts;
  used: SlotCounts;
  /** მხოლოდ შესვლების (itemType='dropin') ჯამი — მისაღების დაფა ამას აჩვენებს,
   *  რომ ღონისძიების რიგი «+1»-ად არ ჩაითვალოს */
  dropinUsed: SlotCounts;
  /** ამ სლოტზე ღონისძიების (itemType='space') occupying ჯავშანი დგას */
  event: Record<EntrySlotKey, boolean>;
};

/**
 * დარჩენილი ადგილები (თარიღი → სლოტი → რიცხვი).
 * `overrides`-ს გამომძახებელი გადმოსცემს (კალენდრის ერთი მოთხოვნიდან),
 * რომ თითო თარიღზე ცალკე select არ გაკეთდეს.
 *
 * ⚠ ღონისძიების ჯავშანი (`itemType='space'`, ერთიანი სივრცე) სლოტს
 * **მთლიანად** კეტავს: event=true → left=0, კაპასიტეტის მიუხედავად.
 * dropin-რიგები `quantity` 1-ით ითვლება (sum-ი ისტორიულ წონიან რიგებსაც
 * უძლებს); ჯვარედინი ბლოკის მეორე მხარე (შესვლები მალავს ღონისძიებას)
 * `upcomingEventSlots`-შია.
 */
export async function entryRemainingBySlot(
  dates: string[],
  settings: PricingSettings,
  overrides?: Map<string, SlotOverride>,
): Promise<Map<string, SlotUsage>> {
  const result = new Map<string, SlotUsage>();
  if (dates.length === 0) return result;

  const rows = await db
    .select({
      date: bookings.bookingDate,
      start: bookings.startTime,
      /* postgres-ის sum() bigint-ს აბრუნებს (drizzle/postgres.js სტრიქონად
         მოაქვს overflow-ის თავიდან ასაცილებლად) - ::int cast-ით ვიცავთ
         `bucket[slot.key] += row.n`-ის რიცხვით (და არა სტრიქონულ) შეკრებას */
      n: sql<number>`sum(${bookings.quantity})::int`,
      /* coalesce: ჯგუფი მხოლოდ space-რიგს რომ შეიცავდეს, FILTER-ის sum NULL-ია */
      dropinN: sql<number>`coalesce(sum(${bookings.quantity}) filter (where ${bookings.itemType} = 'dropin'), 0)::int`,
      hasEvent: sql<boolean>`bool_or(${bookings.itemType} = 'space')`,
    })
    .from(bookings)
    .where(
      and(
        inArray(bookings.itemType, ["dropin", "space"]),
        occupiesBookingCondition(),
        inArray(bookings.bookingDate, dates),
      ),
    )
    .groupBy(bookings.bookingDate, bookings.startTime);

  /* დაკავებული ადგილები სლოტებად — უცნობი საათი იგნორირდება */
  const taken = new Map<string, SlotCounts>();
  const takenDropin = new Map<string, SlotCounts>();
  const eventAt = new Map<string, Record<EntrySlotKey, boolean>>();
  for (const row of rows) {
    const slot = slotByStartTime(row.start);
    if (!slot) continue;
    const bucket = taken.get(row.date) ?? emptySlotCounts();
    bucket[slot.key] += row.n;
    taken.set(row.date, bucket);
    const dropinBucket = takenDropin.get(row.date) ?? emptySlotCounts();
    dropinBucket[slot.key] += row.dropinN;
    takenDropin.set(row.date, dropinBucket);
    if (row.hasEvent) {
      const flags =
        eventAt.get(row.date) ??
        ({ morning: false, midday: false, evening: false } as Record<
          EntrySlotKey,
          boolean
        >);
      flags[slot.key] = true;
      eventAt.set(row.date, flags);
    }
  }

  for (const date of dates) {
    const capacity = resolveSlotCapacity(settings, date, overrides?.get(date));
    const used = taken.get(date) ?? emptySlotCounts();
    const event =
      eventAt.get(date) ??
      ({ morning: false, midday: false, evening: false } as Record<
        EntrySlotKey,
        boolean
      >);
    const left = emptySlotCounts();
    for (const key of ENTRY_SLOT_KEYS) {
      /* ღონისძიება მთელ სლოტს იკავებს — შესვლები აღარ იყიდება */
      left[key] = event[key] ? 0 : Math.max(0, capacity[key] - used[key]);
    }
    /* used-იც ბრუნდება: same-day წესს (≥1 ჯავშანი უკვე არსებობს?) და
       მისაღების დაფას სჭირდება - left < capacity ⟺ used > 0 */
    result.set(date, {
      left,
      used,
      dropinUsed: takenDropin.get(date) ?? emptySlotCounts(),
      event,
    });
  }
  return result;
}

/** კურსის დარჩენილი ადგილები (capacity null → ლიმიტი არ არის → null) */
export async function courseSeatsRemaining(
  courseId: string,
  capacity: number | null,
): Promise<number | null> {
  if (capacity === null) return null;
  const [row] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.itemType, "course"),
        eq(bookings.itemId, courseId),
        occupiesBookingCondition(),
      ),
    );
  return Math.max(0, capacity - (row?.n ?? 0));
}

/** პასის გამოყენებული შესვლები — bookings-იდან ითვლება (drift-ის გარეშე) */
export async function passEntriesUsed(passId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.passId, passId),
        occupiesBookingCondition(),
      ),
    );
  return row?.n ?? 0;
}

/**
 * პასების გამოყენებული შესვლები დაჯგუფებულად — passId → count.
 * კაბინეტი მრავალ პასს ერთი მოთხოვნით ითვლის (N+1-ის ნაცვლად).
 */
export async function passEntriesUsedByPass(
  passIds: string[],
): Promise<Map<string, number>> {
  const used = new Map<string, number>();
  if (passIds.length === 0) return used;
  const rows = await db
    .select({ passId: bookings.passId, n: count() })
    .from(bookings)
    .where(and(inArray(bookings.passId, passIds), occupiesBookingCondition()))
    .groupBy(bookings.passId);
  for (const row of rows) {
    if (row.passId) used.set(row.passId, row.n);
  }
  return used;
}

/** პასის შესვლების გამიჯვნა პირველი-ვიზიტის წესისთვის (გაუქმებადობა) */
export type PassEntriesBreakdown = {
  /** occupying ჯავშნები bookingDate <= დღეს — ვიზიტი შედგა/მიმდინარეობს */
  consumed: number;
  /** occupying ჯავშნები bookingDate > დღეს */
  future: number;
  /** ყველაზე ადრეული მომავალი ჯავშნის თარიღი (გაუქმების ვადისთვის) */
  earliestFutureISO: string | null;
};

/**
 * passEntriesUsedByPass-ის და (გაუქმებადობისთვის) — consumed/future
 * გამიჯვნა + უახლოესი მომავალი თარიღი, ერთი დაჯგუფებული მოთხოვნით.
 * ჯამი (consumed+future) იგივეა, რაც passEntriesUsedByPass-ის count.
 */
export async function passEntriesBreakdownByPass(
  passIds: string[],
  todayISO: string,
): Promise<Map<string, PassEntriesBreakdown>> {
  const result = new Map<string, PassEntriesBreakdown>();
  if (passIds.length === 0) return result;
  const rows = await db
    .select({
      passId: bookings.passId,
      consumed: sql<number>`count(*) filter (where ${bookings.bookingDate} <= ${todayISO})::int`,
      future: sql<number>`count(*) filter (where ${bookings.bookingDate} > ${todayISO})::int`,
      earliestFutureISO: sql<
        string | null
      >`min(${bookings.bookingDate}) filter (where ${bookings.bookingDate} > ${todayISO})`,
    })
    .from(bookings)
    .where(and(inArray(bookings.passId, passIds), occupiesBookingCondition()))
    .groupBy(bookings.passId);
  for (const row of rows) {
    if (row.passId) {
      result.set(row.passId, {
        consumed: row.consumed,
        future: row.future,
        earliestFutureISO: row.earliestFutureISO,
      });
    }
  }
  return result;
}

/**
 * წევრის ყველა აქტიური კლუბი ტელეფონით — კურსის ფასდაკლების საფუძველი.
 * ყველა ოკუპირებული გამოწერის `clubIds`-ის **გაერთიანება** (და არა
 * მაქსიმუმი: ორ ცალკე გამოწერაზე გამოწერილი წევრი ორივეს ფასდაკლებას
 * უნდა ხედავდეს). pending-იც ითვლება — მყიდველი ჯერ გადარიცხვას ელოდება;
 * გრეისში ფასდაკლება უნარჩუნდება, გრეისს მიღმა — აღარ.
 * ნომრები ბოლო 9 ციფრით დარდება — „+995 599…" და „599…" ერთი წევრია.
 */
export async function memberClubIdsForPhone(
  phone: string,
  settings: PricingSettings,
): Promise<string[]> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 5) return [];

  const rows = await db
    .select({ clubIds: subscriptions.clubIds })
    .from(subscriptions)
    .where(
      and(
        sql`right(regexp_replace(${subscriptions.subscriberPhone}, '\\D', '', 'g'), 9) = ${digits}`,
        occupiesSeatCondition(settings),
      ),
    );

  const ids = new Set<string>();
  for (const row of rows) {
    for (const clubId of row.clubIds ?? []) ids.add(clubId);
  }
  return [...ids];
}
