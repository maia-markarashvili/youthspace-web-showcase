import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  getPricingSettings,
  passEntriesUsed,
} from "@/lib/db/queries/availability";
import {
  bookings,
  courses,
  entryPasses,
  spaces,
  subscriptions,
} from "@/lib/db/schema";
import { formatDateKa, subscriptionPhase } from "@/lib/subscription-rules";
import type { TicketKind } from "@/lib/ticket-token";

/**
 * საჯარო QR-ბილეთის გვერდის საკითხავი ფენა — **მხოლოდ არა-PII ველები**:
 * ტელეფონი/ელფოსტა SELECT-შიც არ ზის (desk.ts-ის დისციპლინა), სახელიდან
 * მხოლოდ პირველი სიტყვა ბრუნდება. ბმული capability-URL-ია (ხელმოწერილი
 * ტოკენით), მაგრამ გაზიარების შემთხვევაშიც გასაჩენი არაფერია.
 */

export type TicketView = {
  title: string;
  firstName: string;
  orderRef: string;
  dateLabel: string | null;
  slotLabel: string | null;
  /** false = ჩანაწერი აღარ მოქმედებს - QR არ ჩანს */
  active: boolean;
  note: string | null;
};

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export async function getTicketView(
  kind: TicketKind,
  id: string,
): Promise<TicketView | null> {
  if (kind === "booking") {
    const [row] = await db
      .select({
        name: bookings.buyerName,
        orderRef: bookings.orderRef,
        status: bookings.status,
        itemType: bookings.itemType,
        itemId: bookings.itemId,
        spaceId: bookings.spaceId,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!row) return null;

    let title = "ერთჯერადი შესვლა";
    if (row.itemType === "course") {
      /* მხოლოდ სახელი, „კურსი"-პრეფიქსის გარეშე (ყველა შეხვედრა კურსი არაა) */
      const [course] = row.itemId
        ? await db
            .select({ title: courses.title })
            .from(courses)
            .where(eq(courses.id, row.itemId))
            .limit(1)
        : [];
      title = course?.title ?? "ღონისძიება";
    } else if (row.itemType === "space") {
      const spaceId = row.spaceId ?? row.itemId;
      const [space] = spaceId
        ? await db
            .select({ title: spaces.title })
            .from(spaces)
            .where(eq(spaces.id, spaceId))
            .limit(1)
        : [];
      title = space ? `სივრცე „${space.title}“` : "სივრცის ჯავშანი";
    }

    /* კურსზე bookingDate ყიდვის დღეა - ბილეთზე თარიღი არ იწერება */
    const showDate = row.itemType !== "course";
    return {
      title,
      firstName: firstWord(row.name),
      orderRef: row.orderRef,
      dateLabel: showDate
        ? formatDateKa(new Date(`${row.bookingDate}T12:00:00Z`))
        : null,
      slotLabel: showDate
        ? `${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}`
        : null,
      active: row.status === "pending" || row.status === "confirmed",
      note: row.status === "pending" ? "გადახდა ჯერ დაუდასტურებელია" : null,
    };
  }

  if (kind === "pass") {
    const [row] = await db
      .select({
        name: entryPasses.buyerName,
        orderRef: entryPasses.orderRef,
        status: entryPasses.status,
        entriesTotal: entryPasses.entriesTotal,
        expiresAt: entryPasses.expiresAt,
      })
      .from(entryPasses)
      .where(eq(entryPasses.id, id))
      .limit(1);
    if (!row) return null;

    const used = await passEntriesUsed(id);
    const remaining = Math.max(0, row.entriesTotal - used);
    const expired = row.expiresAt.getTime() <= Date.now();
    return {
      title: "შესვლების პასი",
      firstName: firstWord(row.name),
      orderRef: row.orderRef,
      dateLabel: null,
      slotLabel: null,
      active:
        (row.status === "pending" || row.status === "active") && !expired,
      note: `დარჩა ${remaining}/${row.entriesTotal} შესვლა · ვადა ${formatDateKa(row.expiresAt)}-მდე`,
    };
  }

  const [row] = await db
    .select({
      name: subscriptions.subscriberName,
      orderRef: subscriptions.orderRef,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  if (!row) return null;

  const settings = await getPricingSettings();
  const phase =
    row.status === "active"
      ? subscriptionPhase(row.currentPeriodEnd, settings.renewalGraceDays)
      : null;
  return {
    title: "კლუბის წევრობა",
    firstName: firstWord(row.name),
    orderRef: row.orderRef ?? "",
    dateLabel: null,
    slotLabel: null,
    active:
      row.status === "pending" ||
      (row.status === "active" && phase !== "expired"),
    note:
      row.status === "active" && row.currentPeriodEnd
        ? `მოქმედებს ${formatDateKa(row.currentPeriodEnd)}-მდე`
        : row.status === "pending"
          ? "გადახდა ჯერ დაუდასტურებელია"
          : null,
  };
}
