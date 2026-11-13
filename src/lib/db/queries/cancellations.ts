import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  clubs,
  courses,
  entryPasses,
  payments,
  spaces,
  subscriptions,
} from "@/lib/db/schema";

/**
 * გაუქმებული შეკვეთების ჟურნალი ადმინისთვის (/admin/cancellations) —
 * მომხმარებლის მიერ კაბინეტიდან გაუქმებულები აქ ცალკე ჩანს, რომ
 * მფლობელის მეილს არ იყოს დამოკიდებული თანხის დაბრუნების ნახვა.
 * ბონუს-პასები არ ჩანს - ისინი კლუბის გაუქმებას მიჰყვება და დუბლი იქნებოდა.
 */

export type CancellationRow = {
  key: string;
  kind: "club" | "booking" | "pass";
  title: string;
  orderRef: string;
  name: string;
  phone: string;
  amountTetri: number;
  /** null = ძველი ჩანაწერი (სვეტის დამატებამდე) */
  cancelledAt: Date | null;
  /** 'customer' | 'admin' | 'system' | null */
  cancelledBy: string | null;
  /** ბოლო payment-რიგის სტატუსი ('paid' = ბარათით დასაბრუნებელია,
   *  'refunded' = უკვე დაბრუნდა); null = ბარათის გადახდა არ ფიქსირდება */
  paymentStatus: string | null;
  /** სორტირებისთვის — cancelledAt ?? createdAt */
  sortKey: Date;
};

export async function listCancellations(opts: {
  /** "customer" = მხოლოდ მომხმარებლის გაუქმებულები; null = ყველა */
  by?: "customer" | null;
  limit?: number;
} = {}): Promise<CancellationRow[]> {
  const limit = opts.limit ?? 100;
  const by = opts.by ?? null;

  const subWhere = by
    ? and(eq(subscriptions.status, "cancelled"), eq(subscriptions.cancelledBy, by))
    : eq(subscriptions.status, "cancelled");
  const bookingWhere = by
    ? and(eq(bookings.status, "cancelled"), eq(bookings.cancelledBy, by))
    : eq(bookings.status, "cancelled");
  const passWhere = and(
    by
      ? and(eq(entryPasses.status, "cancelled"), eq(entryPasses.cancelledBy, by))
      : eq(entryPasses.status, "cancelled"),
    isNull(entryPasses.subscriptionId),
  );

  const [subRows, bookingRows, passRows] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        orderRef: subscriptions.orderRef,
        name: subscriptions.subscriberName,
        phone: subscriptions.subscriberPhone,
        amountGel: subscriptions.amountGel,
        clubIds: subscriptions.clubIds,
        cancelledAt: subscriptions.cancelledAt,
        cancelledBy: subscriptions.cancelledBy,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(subWhere)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit),
    db
      .select({
        id: bookings.id,
        orderRef: bookings.orderRef,
        name: bookings.buyerName,
        phone: bookings.buyerPhone,
        amountGel: bookings.amountGel,
        itemType: bookings.itemType,
        itemId: bookings.itemId,
        spaceId: bookings.spaceId,
        bookingDate: bookings.bookingDate,
        cancelledAt: bookings.cancelledAt,
        cancelledBy: bookings.cancelledBy,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(bookingWhere)
      .orderBy(desc(bookings.createdAt))
      .limit(limit),
    db
      .select({
        id: entryPasses.id,
        orderRef: entryPasses.orderRef,
        name: entryPasses.buyerName,
        phone: entryPasses.buyerPhone,
        amountGel: entryPasses.amountGel,
        cancelledAt: entryPasses.cancelledAt,
        cancelledBy: entryPasses.cancelledBy,
        createdAt: entryPasses.createdAt,
      })
      .from(entryPasses)
      .where(passWhere)
      .orderBy(desc(entryPasses.createdAt))
      .limit(limit),
  ]);

  /* სათაურები ერთიანი batch-ებით */
  const clubIds = [...new Set(subRows.flatMap((row) => row.clubIds ?? []))];
  const courseIds = [
    ...new Set(
      bookingRows
        .filter((row) => row.itemType === "course" && row.itemId)
        .map((row) => row.itemId as string),
    ),
  ];
  const spaceIds = [
    ...new Set(
      bookingRows
        .filter((row) => row.itemType === "space")
        .map((row) => row.spaceId ?? row.itemId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const [clubRows, courseRows, spaceRows] = await Promise.all([
    clubIds.length
      ? db
          .select({ id: clubs.id, title: clubs.title })
          .from(clubs)
          .where(inArray(clubs.id, clubIds))
      : Promise.resolve([]),
    courseIds.length
      ? db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : Promise.resolve([]),
    spaceIds.length
      ? db
          .select({ id: spaces.id, title: spaces.title })
          .from(spaces)
          .where(inArray(spaces.id, spaceIds))
      : Promise.resolve([]),
  ]);
  const titleById = new Map<string, string>();
  for (const row of [...clubRows, ...courseRows, ...spaceRows]) {
    titleById.set(row.id, row.title);
  }

  const rows: CancellationRow[] = [
    ...subRows.map((row) => ({
      key: `club-${row.id}`,
      kind: "club" as const,
      title:
        (row.clubIds ?? [])
          .map((id) => titleById.get(id))
          .filter(Boolean)
          .join(", ") || "კლუბის წევრობა",
      orderRef: row.orderRef ?? "",
      name: row.name,
      phone: row.phone,
      amountTetri: row.amountGel,
      cancelledAt: row.cancelledAt,
      cancelledBy: row.cancelledBy,
      paymentStatus: null,
      sortKey: row.cancelledAt ?? row.createdAt,
    })),
    ...bookingRows.map((row) => ({
      key: `booking-${row.id}`,
      kind: "booking" as const,
      title:
        row.itemType === "course"
          ? ((row.itemId ? titleById.get(row.itemId) : null) ?? "ღონისძიება")
          : row.itemType === "space"
            ? `სივრცე „${titleById.get(row.spaceId ?? row.itemId ?? "") ?? "?"}“ · ${row.bookingDate}`
            : `ერთჯერადი შესვლა · ${row.bookingDate}`,
      orderRef: row.orderRef,
      name: row.name,
      phone: row.phone,
      amountTetri: row.amountGel,
      cancelledAt: row.cancelledAt,
      cancelledBy: row.cancelledBy,
      paymentStatus: null,
      sortKey: row.cancelledAt ?? row.createdAt,
    })),
    ...passRows.map((row) => ({
      key: `pass-${row.id}`,
      kind: "pass" as const,
      title: "შესვლების პაკეტი",
      orderRef: row.orderRef,
      name: row.name,
      phone: row.phone,
      amountTetri: row.amountGel,
      cancelledAt: row.cancelledAt,
      cancelledBy: row.cancelledBy,
      paymentStatus: null,
      sortKey: row.cancelledAt ?? row.createdAt,
    })),
  ]
    .sort((a, b) => b.sortKey.getTime() - a.sortKey.getTime())
    .slice(0, limit);

  /* ბოლო payment-სტატუსი კოდების მიხედვით — „დასაბრუნებელია/დაბრუნებულია" */
  const refs = [...new Set(rows.map((row) => row.orderRef).filter(Boolean))];
  if (refs.length) {
    const payRows = await db
      .select({ orderRef: payments.orderRef, status: payments.status })
      .from(payments)
      .where(inArray(payments.orderRef, refs))
      .orderBy(desc(payments.createdAt));
    const latest = new Map<string, string>();
    for (const pay of payRows) {
      if (!latest.has(pay.orderRef)) latest.set(pay.orderRef, pay.status);
    }
    for (const row of rows) {
      row.paymentStatus = latest.get(row.orderRef) ?? null;
    }
  }

  return rows;
}
