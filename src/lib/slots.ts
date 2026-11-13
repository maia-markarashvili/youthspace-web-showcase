/**
 * შესვლის სლოტები — 4-საათიანი ფანჯრები.
 *
 * დღე სამ ზოლად იყოფა:
 *   10:00–14:00  საჯარო შესვლა (morning)
 *   14:00–18:00  საჯარო შესვლა (midday) — ძირითადად კლუბების დროა:
 *                გლობალური default 0-ია და იხსნება მხოლოდ იქ, სადაც
 *                რაოდენობა >0 გაიწერა (კვირის დღით ან კონკრეტული დღით)
 *   18:00–22:00  საჯარო შესვლა (evening)
 *
 * ცალკე `slots` ცხრილი სწორედ ის არის, რაც PRD §19-მა მოხსნა
 * (იხ. schema.ts-ის header); ჯავშნის სლოტი `bookings.start_time`-ით იკითხება.
 *
 * წმინდა მოდული — არა `server-only`: კლიენტის ფორმებიც იყენებს.
 */
import { isDateOpen } from "@/lib/calendar";

export const ENTRY_SLOTS = [
  { key: "morning", start: "10:00:00", end: "14:00:00", label: "10:00–14:00" },
  { key: "midday", start: "14:00:00", end: "18:00:00", label: "14:00–18:00" },
  { key: "evening", start: "18:00:00", end: "22:00:00", label: "18:00–22:00" },
] as const;

export const ENTRY_SLOT_KEYS = ["morning", "midday", "evening"] as const;

export type EntrySlot = (typeof ENTRY_SLOTS)[number];
export type EntrySlotKey = (typeof ENTRY_SLOT_KEYS)[number];

/** კლუბების ზოლი — ჯავშნის ობიექტი არაა, მხოლოდ ტექსტისთვის (= შუადღის სლოტი) */
export const CLUB_BAND = ENTRY_SLOTS.find((slot) => slot.key === "midday")!;

export function slotByKey(key: string): EntrySlot | undefined {
  return ENTRY_SLOTS.find((slot) => slot.key === key);
}

/**
 * ⚠ Postgres `time`-ს ჩაწერისას ნორმალიზებას უკეთებს და ყოველთვის
 * 'HH:MM:SS'-ს აბრუნებს, ჩვენ კი ზოგან 'HH:MM' ჩაგვიწერია — შედარება
 * პირველ ხუთ სიმბოლოზე ხდება.
 */
export function slotByStartTime(startTime: string): EntrySlot | undefined {
  const hhmm = startTime.slice(0, 5);
  return ENTRY_SLOTS.find((slot) => slot.start.slice(0, 5) === hhmm);
}

/** თითო სლოტის რიცხვი (ადგილები/დარჩენილი) — ერთი ფორმა ყველგან */
export type SlotCounts = Record<EntrySlotKey, number>;

export function emptySlotCounts(): SlotCounts {
  return { morning: 0, midday: 0, evening: 0 };
}

/* ── კვირის დღეების რაოდენობები ────────────────────────────────────
   pricing_settings.weekday_capacities jsonb: თითო დღეზე თითო სლოტის
   რაოდენობა. აკლია/null = გლობალურ default-ზე გადასვლა; 0 = სლოტი იმ
   კვირის დღეს დაკეტილია. კონკრეტული დღის override (calendar_overrides)
   ორივეს ჯაბნის. */

export const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type WeekdayCapacities = Partial<
  Record<WeekdayKey, Partial<Record<EntrySlotKey, number | null>>>
>;

/* getUTCDay(): 0=კვირა..6=შაბათი — date-სტრიქონი თბილისის კალენდარული
   დღეა, ამიტომ UTC-კვირის დღე ზუსტია (იხ. lib/calendar.ts-ის isWeekend) */
const UTC_DAY_TO_KEY: readonly WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

/** 'YYYY-MM-DD' → 'mon'..'sun' */
export function weekdayKeyFor(dateISO: string): WeekdayKey {
  return UTC_DAY_TO_KEY[new Date(`${dateISO}T00:00:00Z`).getUTCDay()];
}

/* ── ღონისძიების სლოტების კვირის ბადე ──────────────────────────────
   pricing_settings.event_weekdays jsonb: თითო კვირის დღეზე თითო სლოტის
   კი/არა. მხოლოდ მონიშნულები იწერება — აკლია/false = ის სლოტი იმ კვირის
   დღეს ღონისძიებად არ იყიდება. */

export type EventWeekdays = Partial<
  Record<WeekdayKey, Partial<Record<EntrySlotKey, boolean>>>
>;

/** სამმდგომარეობიანი დღიური გამონაკლისი (calendar_overrides.event_*) */
export type EventSlotOverride = {
  /** დღის ღიაობა — undefined = default წესი (შაბ-კვირა დაკეტილი) */
  isOpen?: boolean;
  /** null = ბადის მიხედვით, true = ხელით გახსნილი, false = ხელით დაკეტილი */
  event: Record<EntrySlotKey, boolean | null>;
};

/**
 * იყიდება თუ არა ეს სლოტი ღონისძიებად ამ დღეს — resolveSlotCapacity-ის
 * სარკე, სამსაფეხურიანი იერარქიით:
 *   1. კონკრეტული დღის ცხადი გამონაკლისი (კი/არა) — ჯაბნის ყველაფერს,
 *      მათ შორის დღის დახურვას (ხელით გახსნილი უქმე დღე)
 *   2. დახურული დღე — ღონისძიებაც არ იყიდება
 *   3. კვირის ბადე (default: არ იყიდება)
 *
 * ჯვარედინი ბლოკი (სლოტზე უკვე დგას შესვლის/სხვა ღონისძიების ჯავშანი) აქ
 * არ ითვლება — ის ჯავშნების მოთხოვნაა (queries/calendar.ts).
 */
export function resolveEventSlotOpen(
  dateISO: string,
  slot: EntrySlotKey,
  weekly: EventWeekdays | null,
  override?: EventSlotOverride,
): boolean {
  const explicit = override?.event[slot];
  if (explicit != null) return explicit;
  if (!isDateOpen(dateISO, override?.isOpen)) return false;
  return weekly?.[weekdayKeyFor(dateISO)]?.[slot] ?? false;
}
