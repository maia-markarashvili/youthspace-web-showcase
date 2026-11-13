import "server-only";
import { and, desc, eq, gte, inArray, lt, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  courses,
  entryPasses,
  spaces,
  subscriptions,
  visits,
} from "@/lib/db/schema";
import { formatTimeKa, tbilisiDateISO } from "@/lib/calendar";

/**
 * ვიზიტების ჟურნალის საკითხავი ფენა — მხოლოდ owner-ისთვის
 * (/admin/visits გვერდი + /admin/export/visits, ორივე verifyOwner),
 * ამიტომ სრული სახელი დასაშვებია (orders-გვერდის იგივე დონე);
 * ტელეფონი/მეილი აქაც არ ჩანს.
 */

export type VisitRow = {
  id: string;
  /** ვიზიტის დღე თბილისით - 'YYYY-MM-DD' (სრული ექსპორტისთვის) */
  dateISO: string;
  time: string;
  itemLabel: string;
  orderRef: string;
  name: string;
  operator: string;
  method: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** ერთი დღის ჟურნალი (გვერდი: limit 200; ექსპორტი მეტს ითხოვს) */
export async function listVisits(
  dateISO: string,
  limit = 200,
): Promise<VisitRow[]> {
  const start = new Date(`${dateISO}T00:00:00+04:00`);
  const end = new Date(start.getTime() + DAY_MS);
  return queryVisits(
    and(gte(visits.createdAt, start), lt(visits.createdAt, end)),
    limit,
  );
}

/** სრული ისტორია (ექსპორტი) — უახლესები პირველ რიგებში */
export async function listAllVisits(limit = 10_000): Promise<VisitRow[]> {
  return queryVisits(undefined, limit);
}

async function queryVisits(
  where: SQL | undefined,
  limit: number,
): Promise<VisitRow[]> {
  const rows = await db
    .select({
      id: visits.id,
      createdAt: visits.createdAt,
      adminEmail: visits.adminEmail,
      method: visits.method,
      bookingId: visits.bookingId,
      passId: visits.passId,
      bookingRef: bookings.orderRef,
      bookingName: bookings.buyerName,
      bookingItemType: bookings.itemType,
      bookingItemId: bookings.itemId,
      bookingSpaceId: bookings.spaceId,
      passRef: entryPasses.orderRef,
      passName: entryPasses.buyerName,
      subRef: subscriptions.orderRef,
      subName: subscriptions.subscriberName,
    })
    .from(visits)
    .leftJoin(bookings, eq(visits.bookingId, bookings.id))
    .leftJoin(entryPasses, eq(visits.passId, entryPasses.id))
    .leftJoin(subscriptions, eq(visits.subscriptionId, subscriptions.id))
    .where(where)
    .orderBy(desc(visits.createdAt))
    .limit(limit);

  /* კურსის/სივრცის სათაურები ერთიანი batch-ით */
  const courseIds = rows
    .filter((row) => row.bookingItemType === "course" && row.bookingItemId)
    .map((row) => row.bookingItemId as string);
  const spaceIds = rows
    .filter((row) => row.bookingItemType === "space")
    .map((row) => row.bookingSpaceId ?? row.bookingItemId)
    .filter((value): value is string => Boolean(value));

  const [courseRows, spaceRows] = await Promise.all([
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
  ]);
  const titleById = new Map<string, string>();
  for (const row of [...courseRows, ...spaceRows]) {
    titleById.set(row.id, row.title);
  }

  return rows.map((row) => {
    let itemLabel = "კლუბის წევრობა";
    let orderRef = row.subRef ?? "";
    let name = row.subName ?? "";
    if (row.bookingId) {
      itemLabel =
        row.bookingItemType === "course"
          ? `კურსი „${titleById.get(row.bookingItemId ?? "") ?? "?"}“`
          : row.bookingItemType === "space"
            ? `სივრცე „${titleById.get(row.bookingSpaceId ?? row.bookingItemId ?? "") ?? "?"}“`
            : "ერთჯერადი შესვლა";
      orderRef = row.bookingRef ?? "";
      name = row.bookingName ?? "";
    } else if (row.passId) {
      itemLabel = "პასით შესვლა";
      orderRef = row.passRef ?? "";
      name = row.passName ?? "";
    }
    return {
      id: row.id,
      dateISO: tbilisiDateISO(row.createdAt),
      time: formatTimeKa(row.createdAt),
      itemLabel,
      orderRef,
      name,
      operator: row.adminEmail,
      method: row.method,
    };
  });
}
