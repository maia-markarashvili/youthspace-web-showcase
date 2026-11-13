import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, entryPasses, subscriptions } from "@/lib/db/schema";
import { ticketExpiry, type TicketRef } from "@/lib/ticket-token";

/**
 * ერთი ჩანაწერის საკონტაქტო მონაცემები ID-ით — გამომწერისთვის (SMS/მეილი
 * ნამდვილად ეგზავნება, ამიტომ ნედლი მნიშვნელობებია, `desk.ts`-ის ნიღბების
 * საწინააღმდეგოდ). საზიარო `/admin/orders`-ის „კოდის გაგზავნა"-სა და
 * `/admin/desk`-ს შორის — ორივეს იგივე სამი ცხრილი სჭირდება.
 * `ticket` თან მოჰყვება, რომ შეხსენების მეილში QR-ბილეთის ბმულიც ჩაჯდეს.
 */
export type OrderContact = {
  phone: string;
  email: string | null;
  name: string;
  orderRef: string;
  ticket: TicketRef;
};

export async function findOrderContact(
  kind: "subscription" | "booking" | "pass",
  id: string,
): Promise<OrderContact | null> {
  if (kind === "subscription") {
    const [row] = await db
      .select({
        phone: subscriptions.subscriberPhone,
        email: subscriptions.subscriberEmail,
        name: subscriptions.subscriberName,
        orderRef: subscriptions.orderRef,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    if (!row) return null;
    return {
      ...row,
      orderRef: row.orderRef ?? "",
      ticket: {
        kind: "subscription",
        id,
        expiresAt: ticketExpiry({ kind: "subscription" }),
      },
    };
  }
  if (kind === "booking") {
    const [row] = await db
      .select({
        phone: bookings.buyerPhone,
        email: bookings.buyerEmail,
        name: bookings.buyerName,
        orderRef: bookings.orderRef,
        itemType: bookings.itemType,
        bookingDate: bookings.bookingDate,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!row) return null;
    return {
      phone: row.phone,
      email: row.email,
      name: row.name,
      orderRef: row.orderRef,
      ticket: {
        kind: "booking",
        id,
        expiresAt: ticketExpiry({
          kind: "booking",
          itemType: row.itemType,
          bookingDate: row.bookingDate,
        }),
      },
    };
  }
  const [row] = await db
    .select({
      phone: entryPasses.buyerPhone,
      email: entryPasses.buyerEmail,
      name: entryPasses.buyerName,
      orderRef: entryPasses.orderRef,
      expiresAt: entryPasses.expiresAt,
    })
    .from(entryPasses)
    .where(eq(entryPasses.id, id))
    .limit(1);
  if (!row) return null;
  return {
    phone: row.phone,
    email: row.email,
    name: row.name,
    orderRef: row.orderRef,
    ticket: {
      kind: "pass",
      id,
      expiresAt: ticketExpiry({ kind: "pass", expiresAt: row.expiresAt }),
    },
  };
}
