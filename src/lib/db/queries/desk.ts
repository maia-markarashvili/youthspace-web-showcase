import "server-only";
import { and, asc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  getPricingSettings,
  passEntriesUsedByPass,
} from "@/lib/db/queries/availability";
import {
  bookings,
  courses,
  entryPasses,
  spaces,
  subscriptions,
  visits,
  type PricingSettings,
} from "@/lib/db/schema";
import { maskEmail, maskPhone } from "@/lib/mask";
import { ORDER_REF_PREFIXES } from "@/lib/order-ref";
import { normalizePhoneDigits } from "@/lib/phone";
import { formatDateKa, subscriptionPhase } from "@/lib/subscription-rules";
import {
  formatTimeKa,
  tbilisiDayStart,
  todayTbilisi,
} from "@/lib/calendar";

/**
 * რეგისტრატორის („reception") ეკრანის საკითხავი ფენა (§3.3) — აპლიკაციის
 * ერთადერთი ადგილი, სადაც ეს query-ები გამოიძახება. კრიტიკული პრინციპი:
 * **სრული ტელეფონი/მეილი აქ არასდროს SELECT-დება** - ნიღბები SQL-ის
 * მხარეს კი არა, JS-ში იწყობა წაკითხვისთანავე, ისე რომ ნედლი მნიშვნელობა
 * პროცესის მეხსიერებაშიც კი წამებით მეტ ხანს არ გაჩერდეს.
 */

/** მიღების ვერდიქტი კართან — მწვანე/ყვითელი/წითელი + მიზეზი */
export type DeskVerdict = {
  tone: "green" | "yellow" | "red";
  label: string;
};

export type DeskMatch = {
  kind: "subscription" | "booking" | "pass";
  id: string;
  orderRef: string;
  name: string;
  phoneMasked: string;
  emailMasked: string | null;
  /** „აქტიური - 2026-09-14-მდე" | „პასი: დარჩა 2/4" | „ჯავშანი 12 სექტემბერი 10:00-14:00" */
  entitlement: string;
  status: string;
  verdict: DeskVerdict;
  /** დღეს უკვე აღრიცხული ვიზიტი ამ ჩანაწერზე (ბოლო) — ორმაგი მიღების ბადე */
  visitedToday: { time: string; operator: string } | null;
  /** მონაწილის ასაკი (childAge) — მხოლოდ askAge-იანი ფორმებიდან; პასზე null */
  age: number | null;
};

const CODE_RE = new RegExp(`^(?:${ORDER_REF_PREFIXES.join("|")})-\\d{5}$`);

/** „crs-12345" → ["CRS-12345"]; მხოლოდ ციფრები → ყველა პრეფიქსის კანდიდატი
 *  (ძველი SIV-ის ჩათვლით) — პრეფიქსების შემოღების მერე „12345" ორაზროვანია
 *  (my/actions.ts-ის იგივე კონვენცია) */
export function deskCodeCandidates(raw: string): string[] {
  const code = raw.trim().toUpperCase();
  if (/^\d+$/.test(code)) {
    return ORDER_REF_PREFIXES.map((prefix) => `${prefix}-${code}`);
  }
  return [code];
}

export function isValidDeskCode(code: string): boolean {
  return CODE_RE.test(code);
}

export function isValidDeskPhone(phone: string): boolean {
  return normalizePhoneDigits(phone).length === 9;
}

/** ჯგუფის პრიორიტეტი დუბლირების მოხსნისას - ერთი orderRef, რამდენიმე
 *  ჩანაწერი (მაგ. კლუბის წევრობა + მისი ბონუს-პასი, იგივე კოდით,
 *  order-ref.ts-ის კომენტარის მიხედვით) → მხოლოდ ერთი ბარათი რჩება. */
const KIND_PRIORITY: Record<DeskMatch["kind"], number> = {
  subscription: 0,
  booking: 1,
  pass: 2,
};

/** სტატუსი, რომელიც კიდზე "აქტიურად" ითვლება - დანარჩენი ყველა (cancelled/
 *  expired/refunded) ქვედა, მუქი სექციაში ილაგება */
const ACTIVE_STATUSES: Record<DeskMatch["kind"], readonly string[]> = {
  subscription: ["pending", "active"],
  booking: ["pending", "confirmed"],
  pass: ["pending", "active"],
};

export type DeskSearchResult = {
  active: DeskMatch[];
  cancelled: DeskMatch[];
};

/** orderRef-ით დაჯგუფება (§3 - „ერთ კოდზე მხოლოდ ერთი") + active/cancelled დაყოფა */
function groupAndClassify(matches: DeskMatch[]): DeskSearchResult {
  const byRef = new Map<string, DeskMatch>();
  for (const match of matches) {
    const key = match.orderRef || match.id;
    const existing = byRef.get(key);
    if (!existing || KIND_PRIORITY[match.kind] < KIND_PRIORITY[existing.kind]) {
      byRef.set(key, match);
    }
  }

  const active: DeskMatch[] = [];
  const cancelled: DeskMatch[] = [];
  for (const match of byRef.values()) {
    if (ACTIVE_STATUSES[match.kind].includes(match.status)) {
      active.push(match);
    } else {
      cancelled.push(match);
    }
  }
  return { active, cancelled };
}

/* ── select-ფორმები — საზიარო ძებნასა (findAtDesk) და PK-ჩატვირთვას
   (findAtDeskById) შორის, რომ ორივე ერთსა და იმავე ველებზე იდგეს ── */

const SUB_SELECT = {
  id: subscriptions.id,
  orderRef: subscriptions.orderRef,
  name: subscriptions.subscriberName,
  phone: subscriptions.subscriberPhone,
  email: subscriptions.subscriberEmail,
  status: subscriptions.status,
  currentPeriodEnd: subscriptions.currentPeriodEnd,
  childAge: subscriptions.childAge,
};

const BOOKING_SELECT = {
  id: bookings.id,
  orderRef: bookings.orderRef,
  name: bookings.buyerName,
  phone: bookings.buyerPhone,
  email: bookings.buyerEmail,
  status: bookings.status,
  itemType: bookings.itemType,
  itemId: bookings.itemId,
  spaceId: bookings.spaceId,
  bookingDate: bookings.bookingDate,
  startTime: bookings.startTime,
  endTime: bookings.endTime,
  childAge: bookings.childAge,
};

const PASS_SELECT = {
  id: entryPasses.id,
  orderRef: entryPasses.orderRef,
  name: entryPasses.buyerName,
  phone: entryPasses.buyerPhone,
  email: entryPasses.buyerEmail,
  status: entryPasses.status,
  entriesTotal: entryPasses.entriesTotal,
  expiresAt: entryPasses.expiresAt,
};

type SubRow = {
  id: string;
  orderRef: string | null;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  childAge: number | null;
};

type BookingRow = {
  id: string;
  orderRef: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  itemType: string;
  itemId: string | null;
  spaceId: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  childAge: number | null;
};

type PassRow = {
  id: string;
  orderRef: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  entriesTotal: number;
  expiresAt: Date;
};

/* ── რიგი → DeskMatch გადამყვანები (ვერდიქტიანად) ─────────────── */

function mapSubscription(row: SubRow, settings: PricingSettings): DeskMatch {
  const phase =
    row.status === "active" && row.currentPeriodEnd
      ? subscriptionPhase(row.currentPeriodEnd, settings.renewalGraceDays)
      : null;
  const entitlement =
    row.status === "pending"
      ? "წევრობა - გადახდის მოლოდინში"
      : row.status === "cancelled"
        ? "წევრობა - გაუქმებული"
        : phase === "active"
          ? `წევრობა აქტიურია - ${formatDateKa(row.currentPeriodEnd as Date)}-მდე`
          : phase === "grace"
            ? `წევრობა - გრეისში (${formatDateKa(row.currentPeriodEnd as Date)}-მდე გადახდილი)`
            : "წევრობა - ვადაგასული";
  const verdict: DeskVerdict =
    row.status === "pending"
      ? { tone: "yellow", label: "გადახდა დაუდასტურებელია" }
      : row.status !== "active"
        ? { tone: "red", label: "წევრობა არ არის აქტიური" }
        : phase === "expired"
          ? { tone: "red", label: "წევრობა ვადაგასულია" }
          : phase === "grace"
            ? { tone: "green", label: "მიღება შესაძლებელია (გრეისი - შეახსენე განახლება)" }
            : { tone: "green", label: "მიღება შესაძლებელია" };
  return {
    kind: "subscription",
    id: row.id,
    orderRef: row.orderRef ?? "",
    name: row.name,
    phoneMasked: maskPhone(row.phone),
    emailMasked: maskEmail(row.email),
    entitlement,
    status: row.status,
    verdict,
    visitedToday: null,
    age: row.childAge,
  };
}

function mapBooking(row: BookingRow, titleById: Map<string, string>): DeskMatch {
  const dateLabel = `${formatDateKa(new Date(`${row.bookingDate}T12:00:00Z`))} · ${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}`;
  /* კურსზე bookingDate ყიდვის დღეა და არა ვიზიტისა — თარიღი არ ჩანს */
  const noun =
    row.itemType === "course"
      ? `კურსი „${titleById.get(row.itemId ?? "") ?? "?"}“`
      : row.itemType === "space"
        ? `სივრცე „${titleById.get(row.spaceId ?? row.itemId ?? "") ?? "?"}“`
        : "ჯავშანი";
  const withDate = row.itemType === "course" ? noun : `${noun} - ${dateLabel}`;
  const entitlement =
    row.status === "pending"
      ? `${withDate} · გადახდის მოლოდინში`
      : row.status === "confirmed"
        ? `${withDate} · დადასტურებულია`
        : row.status === "cancelled"
          ? `${noun} - გაუქმებული`
          : `${noun} - ${row.status}`;
  const verdict: DeskVerdict =
    row.status === "pending"
      ? { tone: "yellow", label: "გადახდა დაუდასტურებელია - ჯერ დაადასტურე" }
      : row.status !== "confirmed"
        ? { tone: "red", label: "ჯავშანი არ არის აქტიური" }
        : row.itemType === "course" || row.bookingDate === todayTbilisi()
          ? { tone: "green", label: "მიღება შესაძლებელია" }
          : {
              tone: "yellow",
              label: `ჯავშანი სხვა თარიღზეა - ${formatDateKa(new Date(`${row.bookingDate}T12:00:00Z`))}`,
            };
  return {
    kind: "booking",
    id: row.id,
    orderRef: row.orderRef,
    name: row.name,
    phoneMasked: maskPhone(row.phone),
    emailMasked: maskEmail(row.email),
    entitlement,
    status: row.status,
    verdict,
    visitedToday: null,
    age: row.childAge,
  };
}

function mapPass(row: PassRow, used: number): DeskMatch {
  const remaining = Math.max(0, row.entriesTotal - used);
  const expired =
    row.status === "expired" || row.expiresAt.getTime() <= Date.now();
  const entitlement =
    row.status === "pending"
      ? "პასი - გადახდის მოლოდინში"
      : row.status === "cancelled"
        ? "პასი - გაუქმებული"
        : expired
          ? "პასი - ვადაგასული"
          : `პასი აქტიურია - დარჩა ${remaining}/${row.entriesTotal}, ვადა ${formatDateKa(row.expiresAt)}-მდე`;
  const verdict: DeskVerdict =
    row.status === "pending"
      ? { tone: "yellow", label: "გადახდა დაუდასტურებელია" }
      : row.status !== "active"
        ? { tone: "red", label: "პასი არ არის აქტიური" }
        : expired
          ? { tone: "red", label: "პასი ვადაგასულია" }
          : remaining <= 0
            ? { tone: "red", label: "შესვლები ამოწურულია" }
            : {
                tone: "green",
                label: `მიღება შესაძლებელია - დარჩა ${remaining}/${row.entriesTotal}`,
              };
  return {
    kind: "pass",
    id: row.id,
    orderRef: row.orderRef,
    name: row.name,
    phoneMasked: maskPhone(row.phone),
    emailMasked: maskEmail(row.email),
    entitlement,
    status: row.status,
    verdict,
    visitedToday: null,
    age: null,
  };
}

/* ── საერთო აწყობა: სათაურები + პასის ნაშთები + დღევანდელი ვიზიტები ── */

async function buildMatches(
  subRows: SubRow[],
  bookingRows: BookingRow[],
  passRows: PassRow[],
  settings: PricingSettings,
): Promise<DeskMatch[]> {
  const courseIds = bookingRows
    .filter((row) => row.itemType === "course" && row.itemId)
    .map((row) => row.itemId as string);
  const spaceIds = bookingRows
    .filter((row) => row.itemType === "space")
    .map((row) => row.spaceId ?? row.itemId)
    .filter((value): value is string => Boolean(value));

  const [courseRows, spaceRows, usedByPass] = await Promise.all([
    courseIds.length > 0
      ? db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : Promise.resolve([]),
    spaceIds.length > 0
      ? db
          .select({ id: spaces.id, title: spaces.title })
          .from(spaces)
          .where(inArray(spaces.id, spaceIds))
      : Promise.resolve([]),
    passEntriesUsedByPass(passRows.map((row) => row.id)),
  ]);

  const titleById = new Map<string, string>();
  for (const row of [...courseRows, ...spaceRows]) {
    titleById.set(row.id, row.title);
  }

  const matches: DeskMatch[] = [
    ...subRows.map((row) => mapSubscription(row, settings)),
    ...bookingRows.map((row) => mapBooking(row, titleById)),
    ...passRows.map((row) => mapPass(row, usedByPass.get(row.id) ?? 0)),
  ];

  await attachVisitsToday(matches);
  return matches;
}

/** დღევანდელი ვიზიტების მინიშნება ბარათებზე — ერთი query ყველა სამიზნეზე */
async function attachVisitsToday(matches: DeskMatch[]): Promise<void> {
  const idsByKind: Record<DeskMatch["kind"], string[]> = {
    subscription: [],
    booking: [],
    pass: [],
  };
  for (const match of matches) idsByKind[match.kind].push(match.id);

  const conditions = [];
  if (idsByKind.booking.length > 0) {
    conditions.push(inArray(visits.bookingId, idsByKind.booking));
  }
  if (idsByKind.pass.length > 0) {
    conditions.push(inArray(visits.passId, idsByKind.pass));
  }
  if (idsByKind.subscription.length > 0) {
    conditions.push(inArray(visits.subscriptionId, idsByKind.subscription));
  }
  if (conditions.length === 0) return;

  const rows = await db
    .select({
      bookingId: visits.bookingId,
      passId: visits.passId,
      subscriptionId: visits.subscriptionId,
      adminEmail: visits.adminEmail,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .where(and(gte(visits.createdAt, tbilisiDayStart()), or(...conditions)))
    .orderBy(asc(visits.createdAt));

  /* asc-რიგით ბოლო ჩანაწერი „იმარჯვებს" — ბარათზე უახლესი დრო ჩანს */
  const byKey = new Map<string, { time: string; operator: string }>();
  for (const row of rows) {
    const key = row.bookingId
      ? `booking:${row.bookingId}`
      : row.passId
        ? `pass:${row.passId}`
        : `subscription:${row.subscriptionId}`;
    byKey.set(key, {
      time: formatTimeKa(row.createdAt),
      operator: row.adminEmail,
    });
  }
  for (const match of matches) {
    match.visitedToday = byKey.get(`${match.kind}:${match.id}`) ?? null;
  }
}

/**
 * ზუსტი ძებნა კოდით ან ტელეფონით — LIKE/პრეფიქსული ძებნა განზრახ არ არსებობს
 * (ნომრების მოსაპარად გამოსადეგი იქნებოდა ავტორიზებული, დაუცველი როლისთვის).
 */
export async function findAtDesk(
  input: { kind: "code"; codes: string[] } | { kind: "phone"; phone: string },
): Promise<DeskSearchResult> {
  const settings = await getPricingSettings();

  /* ციფრებით ძებნისას codes რამდენიმე კანდიდატია (თითო პრეფიქსზე ერთი) —
     ზუსტი მატჩი მაინც მაქს. ერთი იქნება, კოდები უნიკალურია */
  const subWhere =
    input.kind === "code"
      ? inArray(subscriptions.orderRef, input.codes)
      : sql`right(regexp_replace(${subscriptions.subscriberPhone}, '\\D', '', 'g'), 9) = ${normalizePhoneDigits(input.phone)}`;
  const bookingWhere =
    input.kind === "code"
      ? inArray(bookings.orderRef, input.codes)
      : sql`right(regexp_replace(${bookings.buyerPhone}, '\\D', '', 'g'), 9) = ${normalizePhoneDigits(input.phone)}`;
  const passWhere =
    input.kind === "code"
      ? inArray(entryPasses.orderRef, input.codes)
      : sql`right(regexp_replace(${entryPasses.buyerPhone}, '\\D', '', 'g'), 9) = ${normalizePhoneDigits(input.phone)}`;

  const [subRows, bookingRows, passRows] = await Promise.all([
    db.select(SUB_SELECT).from(subscriptions).where(subWhere),
    db.select(BOOKING_SELECT).from(bookings).where(bookingWhere),
    db.select(PASS_SELECT).from(entryPasses).where(passWhere),
  ]);

  const results = await buildMatches(subRows, bookingRows, passRows, settings);
  return groupAndClassify(results);
}

/**
 * ერთი ჩანაწერი PK-ით — QR-სკანის ჩამტვირთავი. იგივე ფორმა/ნიღბები/
 * ვერდიქტი, რაც ძებნის ბარათს აქვს.
 */
export async function findAtDeskById(
  kind: DeskMatch["kind"],
  id: string,
): Promise<DeskMatch | null> {
  const settings = await getPricingSettings();

  if (kind === "subscription") {
    const [row] = await db
      .select(SUB_SELECT)
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    if (!row) return null;
    const matches = await buildMatches([row], [], [], settings);
    return matches[0] ?? null;
  }
  if (kind === "booking") {
    const [row] = await db
      .select(BOOKING_SELECT)
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!row) return null;
    const matches = await buildMatches([], [row], [], settings);
    return matches[0] ?? null;
  }
  const [row] = await db
    .select(PASS_SELECT)
    .from(entryPasses)
    .where(eq(entryPasses.id, id))
    .limit(1);
  if (!row) return null;
  const matches = await buildMatches([], [], [row], settings);
  return matches[0] ?? null;
}
