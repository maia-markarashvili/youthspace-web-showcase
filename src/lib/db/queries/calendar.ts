import "server-only";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { addDays, isDateOpen, todayTbilisi } from "@/lib/calendar";
import { db } from "@/lib/db";
import {
  entryRemainingBySlot,
  getPricingSettings,
  occupiesBookingCondition,
  resolveSlotCapacity,
} from "@/lib/db/queries/availability";
import { getDropinSettings } from "@/lib/db/queries/catalog";
import { bookings, calendarOverrides } from "@/lib/db/schema";
import {
  ENTRY_SLOTS,
  resolveEventSlotOpen,
  slotByKey,
  slotByStartTime,
  type EntrySlotKey,
} from "@/lib/slots";

/**
 * კალენდრის გამონაკლისები (§6.16) — drop-in დღეების ღია/დაკეტილი მდგომარეობა
 * და სლოტების per-date კაპასიტეტები.
 * ჩანაწერი არ არის = default: სამუშაო დღე ღია, შაბ-კვირა დაკეტილი,
 * კაპასიტეტი გლობალური (pricing_settings.entry_capacity_*).
 */

export type CalendarOverrideInfo = {
  isOpen: boolean;
  note: string | null;
  capacityMorning: number | null;
  capacityMidday: number | null;
  capacityEvening: number | null;
  /** დღესვე გაყიდვის ნებართვა თითო სლოტზე (მოქმედებს მხოლოდ date=დღეს) */
  sameDay: Record<EntrySlotKey, boolean>;
  /** ღონისძიების სლოტის გამონაკლისი — null = კვირის ბადის მიხედვით,
   *  true = ხელით გახსნილი, false = ხელით დაკეტილი (resolveEventSlotOpen) */
  event: Record<EntrySlotKey, boolean | null>;
};

export async function listOverridesInRange(
  fromDate: string,
  toDate: string,
): Promise<Map<string, CalendarOverrideInfo>> {
  const rows = await db
    .select()
    .from(calendarOverrides)
    .where(
      and(
        gte(calendarOverrides.date, fromDate),
        lte(calendarOverrides.date, toDate),
      ),
    );
  return new Map(
    rows.map((row) => [
      row.date,
      {
        isOpen: row.isOpen,
        note: row.note,
        capacityMorning: row.capacityMorning,
        capacityMidday: row.capacityMidday,
        capacityEvening: row.capacityEvening,
        sameDay: {
          morning: row.sameDayMorning,
          midday: row.sameDayMidday,
          evening: row.sameDayEvening,
        },
        event: {
          morning: row.eventMorning,
          midday: row.eventMidday,
          evening: row.eventEvening,
        },
      },
    ]),
  );
}

export type EntrySlotOption = {
  date: string;
  slot: EntrySlotKey;
  /** „10:00–14:00" */
  slotLabel: string;
  remaining: number;
  capacity: number;
};

/* პირველ ღია დღემდე ვსკანირებთ მაქსიმუმ ამდენ დღეს — თუ კალენდარი უფრო შორსაა
   დახურული (მაგ. სეზონამდე), ჯავშნა ცარიელი რჩება (გონივრული ზღვარი) */
const BOOKING_HORIZON_DAYS = 120;

/**
 * საჯავშნო ფანჯრის ღია დღეების სია — გაზიარებული drop-in-ისა და space-ისთვის.
 *  · საწყისი სკანირება = max(დღეს, dropin_settings.bookingStartDate)
 *  · **ფანჯარა კალენდრის პირველი ღია დღიდან იწყება** (არა მიმდინარე დღიდან) —
 *    თუ ახლო დღეები დახურულია (მაგ. სივრცე სექტემბრამდე), picker მაინც
 *    გამოჩნდება პირველი ხელმისაწვდომი დღით
 *  · ფანჯარა = bookingWindowDays კალენდარული დღე იმ პირველი ღია დღიდან
 *  · ღიაობა — isDateOpen (შაბ-კვირა default-ით დაკეტილი, overrides ჯაბნის)
 */
async function bookingOpenDates(): Promise<{
  openDates: string[];
  overrides: Map<string, CalendarOverrideInfo>;
}> {
  const dropin = await getDropinSettings();
  const today = todayTbilisi();
  // ISO-სტრიქონები სწორად დარდება <>-ით — max(დღეს, დაწყების თარიღი)
  const configuredStart = dropin?.bookingStartDate ?? today;
  const start = configuredStart > today ? configuredStart : today;
  const windowDays = dropin?.bookingWindowDays ?? 14;

  // overrides მთელ სკან-ჰორიზონტზე + ფანჯარაზე (calendar_overrides პატარაა)
  const overrides = await listOverridesInRange(
    start,
    addDays(start, BOOKING_HORIZON_DAYS + windowDays),
  );

  // პირველი ღია დღე start-იდან
  let firstOpen: string | null = null;
  for (let i = 0; i < BOOKING_HORIZON_DAYS; i++) {
    const date = addDays(start, i);
    if (isDateOpen(date, overrides.get(date)?.isOpen)) {
      firstOpen = date;
      break;
    }
  }
  if (!firstOpen) return { openDates: [], overrides };

  // firstOpen-იდან windowDays კალენდარული დღე, დახურულები გამოტოვებული
  const openDates: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const date = addDays(firstOpen, i);
    if (isDateOpen(date, overrides.get(date)?.isOpen)) {
      openDates.push(date);
    }
  }
  return { openDates, overrides };
}

/**
 * drop-in საჯავშნო (თარიღი, სლოტი) წყვილები — drop-in გვერდისთვისაც და
 * server action-ვალიდაციისთვისაც. სლოტი სიაში არ ხვდება, თუ კაპასიტეტი 0-ია
 * (დახურული) ან ადგილები ამოიწურა; დღე, რომელსაც ვერცერთი სლოტი დარჩა, ქრება.
 */
export async function upcomingEntrySlots(): Promise<EntrySlotOption[]> {
  const { openDates, overrides } = await bookingOpenDates();
  if (openDates.length === 0) return [];

  const settings = await getPricingSettings();
  const remaining = await entryRemainingBySlot(openDates, settings, overrides);

  const today = todayTbilisi();
  const options: EntrySlotOption[] = [];
  for (const date of openDates) {
    const counts = remaining.get(date);
    if (!counts) continue;
    const { left, used } = counts;
    const capacity = resolveSlotCapacity(settings, date, overrides.get(date));
    for (const slot of ENTRY_SLOTS) {
      /* დღევანდელი სლოტი იყიდება მხოლოდ თუ (ა) მასზე უკვე არსებობს ≥1
         ჯავშანი (ოპერატორი ისედაც მოდის) ან (ბ) ჩართულია დღესვე-გაყიდვის
         ტოგლი (მისაღებიდან). მომავალი დღეები უცვლელია. */
      if (date === today) {
        const sameDay = overrides.get(date)?.sameDay[slot.key] ?? false;
        if (used[slot.key] === 0 && !sameDay) continue;
      }
      if (capacity[slot.key] > 0 && left[slot.key] > 0) {
        options.push({
          date,
          slot: slot.key,
          slotLabel: slot.label,
          remaining: left[slot.key],
          capacity: capacity[slot.key],
        });
      }
    }
  }
  return options;
}

/* ── მისაღების დაფა: უახლოესი დღეების ჯავშნები + დღესვე-გაყიდვის დროშები ── */

/** სლოტზე მდგარი ღონისძიების (სივრცის) ჯავშანი — მისაღების დაფის ჭდისთვის */
export type DeskEventBooking = {
  buyerName: string;
  /** «N ადამიანამდე» საფეხური; ძველ რიგებზე შეიძლება null იყოს */
  peopleUpTo: number | null;
  /** "pending" (გადახდას/გადმორიცხვას ელოდება) | "confirmed" */
  status: string;
};

export type DeskSlotDay = {
  date: string;
  isToday: boolean;
  slots: {
    key: EntrySlotKey;
    label: string;
    /** დაკავებული — მხოლოდ შესვლები (ღონისძიება ცალკე ჭდით ჩანს) */
    used: number;
    capacity: number;
    sameDay: boolean;
    /** სლოტზე ღონისძიების ჯავშანი დგას — დაფაზე ცალკე ინიშნება */
    eventBooking: DeskEventBooking | null;
  }[];
};

/**
 * ღონისძიების occupying ჯავშნები მოცემულ თარიღებზე, `date|slotKey` გასაღებით.
 * კონსტრუქციით სლოტზე მაქს. ერთი occupying ღონისძიებაა (advisory lock +
 * ჯვარედინი ბლოკი booking-actions-ში); დუბლის შემთხვევაში confirmed იმარჯვებს.
 */
async function deskEventBookings(
  dates: string[],
): Promise<Map<string, DeskEventBooking>> {
  const result = new Map<string, DeskEventBooking>();
  if (dates.length === 0) return result;

  const rows = await db
    .select({
      date: bookings.bookingDate,
      start: bookings.startTime,
      buyerName: bookings.buyerName,
      peopleUpTo: bookings.peopleUpTo,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.itemType, "space"),
        occupiesBookingCondition(),
        inArray(bookings.bookingDate, dates),
      ),
    );

  for (const row of rows) {
    const slot = slotByStartTime(row.start);
    if (!slot) continue;
    const key = `${row.date}|${slot.key}`;
    const existing = result.get(key);
    if (existing && existing.status === "confirmed") continue;
    result.set(key, {
      buyerName: row.buyerName,
      peopleUpTo: row.peopleUpTo,
      status: row.status,
    });
  }
  return result;
}

/**
 * მისაღების (რეგისტრატორის) დაფა — უახლოესი ღია დღეების ჯავშნების
 * რაოდენობები სლოტებად + დღესვე-გაყიდვის დროშები. მფლობელი წინა დღეს
 * ამით გეგმავს ოპერატორის გამოყვანას; booking-ფანჯრისგან დამოუკიდებელია
 * (bookingStartDate-ს არ ითვალისწინებს — დაფა ფაქტს აჩვენებს).
 */
export async function deskSlotBoard(maxDays = 7): Promise<DeskSlotDay[]> {
  const today = todayTbilisi();
  const overrides = await listOverridesInRange(today, addDays(today, 13));
  const open: string[] = [];
  for (let i = 0; i < 14 && open.length < maxDays; i++) {
    const date = addDays(today, i);
    if (isDateOpen(date, overrides.get(date)?.isOpen)) open.push(date);
  }
  if (open.length === 0) return [];

  const settings = await getPricingSettings();
  const [counts, events] = await Promise.all([
    entryRemainingBySlot(open, settings, overrides),
    deskEventBookings(open),
  ]);

  return open.map((date) => ({
    date,
    isToday: date === today,
    slots: ENTRY_SLOTS.map((slot) => ({
      key: slot.key,
      label: slot.label,
      used: counts.get(date)?.dropinUsed[slot.key] ?? 0,
      capacity: resolveSlotCapacity(settings, date, overrides.get(date))[
        slot.key
      ],
      sameDay: overrides.get(date)?.sameDay[slot.key] ?? false,
      eventBooking: events.get(`${date}|${slot.key}`) ?? null,
    })),
  }));
}

/* ── ღონისძიების (სივრცის ერთიანი დაჯავშნის) კალენდარი ─────────── */

export type EventSlotOption = {
  date: string;
  slot: EntrySlotKey;
  /** „10:00–14:00" */
  slotLabel: string;
};

/**
 * ღონისძიების საჯავშნო (თარიღი, სლოტი) წყვილები. ხელმისაწვდომობა ორი
 * წყაროდან იკრიბება (2026-09-01):
 *  · **რეგულარული ფანჯარა** — ხვალიდან (ან bookingStartDate-იდან)
 *    bookingWindowDays კალენდარული დღე, სლოტები კვირის ბადით
 *    (pricing_settings.event_weekdays); დახურულ დღეს ბადე არ მოქმედებს
 *  · **ხელით გახსნილი შორეული თარიღები** — calendar_overrides.event_* = true
 *    120 დღემდე; ცხადი დროშა ჯაბნის ბადესაც და დღის დახურვასაც. ფანჯრის
 *    მიღმა კვირის ბადე **არ** ვრცელდება: იქ მხოლოდ ცხადად მონიშნული
 *    სლოტი იყიდება (თორემ ერთი შორეული თარიღის გახსნა მის სხვა სლოტებსაც
 *    გახსნიდა)
 * წყვილი იმალება, თუ სლოტზე უკვე დგას occupying ჯავშანი (ერთჯერადი
 * შესვლა ან სხვა ღონისძიება) — ჯვარედინი ბლოკის ეს მხარე. ონლაინ იყიდება
 * მხოლოდ ხვალიდან: დღევანდელი ღონისძიება ადმინის ხელით ეწყობა.
 */
export async function upcomingEventSlots(): Promise<EventSlotOption[]> {
  const [dropin, settings] = await Promise.all([
    getDropinSettings(),
    getPricingSettings(),
  ]);

  const today = todayTbilisi();
  const from = addDays(today, 1);
  // ISO-სტრიქონები სწორად დარდება <>-ით — max(ხვალ, გაყიდვის დაწყება)
  const configuredStart = dropin?.bookingStartDate ?? from;
  const start = configuredStart > from ? configuredStart : from;
  const windowDays = dropin?.bookingWindowDays ?? 14;

  const windowEnd = addDays(start, windowDays);
  const horizonEnd = addDays(today, BOOKING_HORIZON_DAYS);
  const overrides = await listOverridesInRange(
    from,
    windowEnd > horizonEnd ? windowEnd : horizonEnd,
  );

  const windowDates = new Set<string>();
  for (let i = 0; i < windowDays; i++) windowDates.add(addDays(start, i));
  /* ფანჯრის მიღმა ხელით გახსნილი თარიღიც უნდა ჩანდეს — ოღონდ მხოლოდ
     ცხადად მონიშნული სლოტით: კვირის ბადე ფანჯრის იქით არ ვრცელდება */
  const dates = new Set(windowDates);
  for (const [date, info] of overrides) {
    if (
      info.event.morning === true ||
      info.event.midday === true ||
      info.event.evening === true
    ) {
      dates.add(date);
    }
  }

  const open: { date: string; slot: EntrySlotKey }[] = [];
  for (const date of [...dates].sort()) {
    const override = overrides.get(date);
    for (const slot of ENTRY_SLOTS) {
      const isOpen = windowDates.has(date)
        ? resolveEventSlotOpen(date, slot.key, settings.eventWeekdays, override)
        : override?.event[slot.key] === true;
      if (isOpen) open.push({ date, slot: slot.key });
    }
  }
  if (open.length === 0) return [];
  const candidateDates = [...new Set(open.map((pair) => pair.date))];

  /* დაკავებული (თარიღი, სლოტი) წყვილები — dropin + space ერთად */
  const rows = await db
    .select({ date: bookings.bookingDate, start: bookings.startTime })
    .from(bookings)
    .where(
      and(
        inArray(bookings.itemType, ["dropin", "space"]),
        occupiesBookingCondition(),
        inArray(bookings.bookingDate, candidateDates),
      ),
    )
    .groupBy(bookings.bookingDate, bookings.startTime);
  const busy = new Set<string>();
  for (const row of rows) {
    const slot = slotByStartTime(row.start);
    if (slot) busy.add(`${row.date}|${slot.key}`);
  }

  return open
    .filter((pair) => !busy.has(`${pair.date}|${pair.slot}`))
    .map((pair) => ({
      date: pair.date,
      slot: pair.slot,
      slotLabel: slotByKey(pair.slot)?.label ?? pair.slot,
    }));
}
