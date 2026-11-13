import "server-only";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { CustomerAccount } from "@/lib/auth/account-session";
import { canCancel } from "@/lib/booking-rules";
import {
  bookingCancelCheck,
  clubCancelCheck,
  passCancelCheck,
} from "@/lib/cancellation-rules";
import { db } from "@/lib/db";
import { cancelSubscriptionCascade } from "@/lib/db/mutations/club-subscription";
import { bookingItemTitle } from "@/lib/db/mutations/confirm-order";
import {
  buildOwnedBy,
  verifiedChannels,
} from "@/lib/db/queries/account-ownership";
import { occupiesBookingCondition } from "@/lib/db/queries/availability";
import {
  accountProfiles,
  bookings,
  clubs,
  courses,
  entryPasses,
  payments,
  subscriptions,
} from "@/lib/db/schema";
import { notifyOwnerEvent } from "@/lib/notify-customer";
import { slotByStartTime } from "@/lib/slots";
import { todayTbilisi } from "@/lib/calendar";

/**
 * კაბინეტიდან გაუქმება — ხელშეკრულების §2-ის წესით (cancellation-rules.ts).
 *
 * უსაფრთხოება: მფლობელობა ზუსტად იმავე ბმის წესით მოწმდება, რომლითაც
 * კაბინეტი ჩანაწერებს **აჩვენებს** (buildOwnedBy/verifiedChannels,
 * queries/account.ts) — ის უქმდება, რაც საკუთარ კაბინეტში ჩანს, მეტი
 * არაფერი. ვადა/პირობა სერვერზე ხელახლა მოწმდება, UI-ს არ ვენდობით.
 * ფული ავტომატურად არ ბრუნდება — action მფლობელს მეილით ახსენებს.
 */

export type SelfCancelKind = "club" | "pass" | "booking";

export type SelfCancelResult =
  | {
      ok: true;
      orderRef: string;
      itemTitle: string;
      buyerName: string;
      phone: string;
      email: string | null;
      amountTetri: number;
      /** დასაბრუნებელი თანხის არხი: card = Flitt-პორტალი, transfer = ბანკი,
       *  null = გადაუხდელი იყო (დასაბრუნებელი არაფერია) */
      refundChannel: "card" | "transfer" | null;
      maskedCard: string | null;
      /** ჯავშანი პასით იყო გაკეთებული? (0₾) — გათავისუფლების SMS-ისთვის */
      passId: string | null;
    }
  | { ok: false; message: string };

const NOT_FOUND = "ჩანაწერი ვერ მოიძებნა.";
const NOT_ELIGIBLE =
  "ამ ჩანაწერის ონლაინ გაუქმება ვეღარ ხერხდება - დაგვიკავშირდი.";
const ALREADY = "უკვე გაუქმებულია.";

/** ბოლო payment-რიგით ვიგებთ, საიდან დასაბრუნებელია თანხა */
async function refundInfo(
  orderRef: string,
  wasPaidOffline: boolean,
): Promise<{ refundChannel: "card" | "transfer" | null; maskedCard: string | null }> {
  if (orderRef) {
    const [pay] = await db
      .select({ status: payments.status, rawResponse: payments.rawResponse })
      .from(payments)
      .where(eq(payments.orderRef, orderRef))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    if (pay?.status === "paid") {
      const masked = (pay.rawResponse as Record<string, unknown> | null)
        ?.masked_card;
      return {
        refundChannel: "card",
        maskedCard: typeof masked === "string" ? masked : null,
      };
    }
  }
  return {
    refundChannel: wasPaidOffline ? "transfer" : null,
    maskedCard: null,
  };
}

export async function cancelOwnedItem(params: {
  account: CustomerAccount;
  kind: SelfCancelKind;
  id: string;
}): Promise<SelfCancelResult> {
  const { account, kind, id } = params;

  const profileRows = await db
    .select({ id: accountProfiles.id })
    .from(accountProfiles)
    .where(eq(accountProfiles.accountId, account.accountId));
  const ownedBy = buildOwnedBy({
    profileIds: profileRows.map((row) => row.id),
    ...verifiedChannels(account),
  });

  /* ── ჯავშანი: dropin / space / course ─────────────────────────── */
  if (kind === "booking") {
    const [row] = await db
      .select({
        id: bookings.id,
        orderRef: bookings.orderRef,
        status: bookings.status,
        itemType: bookings.itemType,
        itemId: bookings.itemId,
        spaceId: bookings.spaceId,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        peopleUpTo: bookings.peopleUpTo,
        buyerName: bookings.buyerName,
        buyerPhone: bookings.buyerPhone,
        buyerEmail: bookings.buyerEmail,
        amountGel: bookings.amountGel,
        passId: bookings.passId,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.id, id),
          ownedBy(bookings.profileId, bookings.buyerPhone, bookings.buyerEmail),
        ),
      )
      .limit(1);
    if (!row) return { ok: false, message: NOT_FOUND };

    /* კურსზე bookingDate ყიდვის დღეა - ვადა კურსის startDate-ით ითვლება */
    let usageStart: string | null = row.bookingDate;
    if (row.itemType === "course") {
      usageStart = null;
      if (row.itemId) {
        const [course] = await db
          .select({ startDate: courses.startDate })
          .from(courses)
          .where(eq(courses.id, row.itemId))
          .limit(1);
        usageStart = course?.startDate ?? null;
      }
    }
    if (!bookingCancelCheck(row.status, usageStart).cancellable) {
      return { ok: false, message: NOT_ELIGIBLE };
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "customer",
      })
      .where(
        and(
          eq(bookings.id, id),
          inArray(bookings.status, ["pending", "confirmed"]),
        ),
      )
      .returning({ id: bookings.id });
    if (!updated) return { ok: false, message: ALREADY };

    /* ღონისძიების გაუქმება სლოტს ხელახლა გასაყიდად ხსნის — მფლობელი
       მაშინვე იგებს (fire-and-forget, არასდროს throw-ობს) */
    if (row.itemType === "space") {
      void notifyOwnerEvent({
        kind: "cancelled",
        orderRef: row.orderRef,
        date: row.bookingDate,
        slot:
          slotByStartTime(row.startTime)?.label ?? row.startTime.slice(0, 5),
        peopleUpTo: row.peopleUpTo,
        amountTetri: row.amountGel,
        buyerName: row.buyerName,
        buyerPhone: row.buyerPhone,
      });
    }

    return {
      ok: true,
      orderRef: row.orderRef,
      itemTitle: await bookingItemTitle(row),
      buyerName: row.buyerName,
      phone: row.buyerPhone,
      email: row.buyerEmail || null,
      amountTetri: row.amountGel,
      passId: row.passId,
      /* პასით/0₾-იან ჯავშანზე დასაბრუნებელი არაფერია — ადრე აქ ტყუილი
         „transfer" ბრუნდებოდა და მფლობელს 0₾-ის refund-მეილი მიდიოდა */
      ...(row.passId !== null || row.amountGel === 0
        ? { refundChannel: null, maskedCard: null }
        : await refundInfo(row.orderRef, row.status === "confirmed")),
    };
  }

  /* ── კლუბ-გამოწერა ────────────────────────────────────────────── */
  if (kind === "club") {
    const [sub] = await db
      .select({
        id: subscriptions.id,
        orderRef: subscriptions.orderRef,
        status: subscriptions.status,
        clubIds: subscriptions.clubIds,
        amountGel: subscriptions.amountGel,
        name: subscriptions.subscriberName,
        phone: subscriptions.subscriberPhone,
        email: subscriptions.subscriberEmail,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, id),
          ownedBy(
            subscriptions.profileId,
            subscriptions.subscriberPhone,
            subscriptions.subscriberEmail,
          ),
        ),
      )
      .limit(1);
    if (!sub) return { ok: false, message: NOT_FOUND };

    const clubRows = sub.clubIds?.length
      ? await db
          .select({ title: clubs.title, startDate: clubs.startDate })
          .from(clubs)
          .where(inArray(clubs.id, sub.clubIds))
      : [];
    const check = clubCancelCheck(
      sub.status,
      clubRows.map((row) => row.startDate),
      todayTbilisi(),
    );
    if (!check.cancellable) {
      return {
        ok: false,
        message:
          "წევრობის სარგებლობა უკვე დაწყებულია - გაუქმებისთვის დაგვიკავშირდი.",
      };
    }

    const cancelled = await cancelSubscriptionCascade(sub.id, "customer");
    if (!cancelled) return { ok: false, message: ALREADY };

    return {
      ok: true,
      orderRef: sub.orderRef ?? "",
      itemTitle:
        clubRows.map((row) => row.title).join(", ") || "კლუბის წევრობა",
      buyerName: sub.name,
      phone: sub.phone,
      email: sub.email,
      amountTetri: sub.amountGel,
      passId: null,
      ...(await refundInfo(sub.orderRef ?? "", sub.status === "active")),
    };
  }

  /* ── ნაყიდი ოთხჯერადი პასი ────────────────────────────────────── */
  const [pass] = await db
    .select({
      id: entryPasses.id,
      orderRef: entryPasses.orderRef,
      status: entryPasses.status,
      subscriptionId: entryPasses.subscriptionId,
      expiresAt: entryPasses.expiresAt,
      amountGel: entryPasses.amountGel,
      name: entryPasses.buyerName,
      phone: entryPasses.buyerPhone,
      email: entryPasses.buyerEmail,
    })
    .from(entryPasses)
    .where(
      and(
        eq(entryPasses.id, id),
        ownedBy(
          entryPasses.profileId,
          entryPasses.buyerPhone,
          entryPasses.buyerEmail,
        ),
      ),
    )
    .limit(1);
  if (!pass) return { ok: false, message: NOT_FOUND };

  const expired = pass.expiresAt.getTime() <= Date.now();
  const today = todayTbilisi();

  /* პირველი-ვიზიტის წესი: შემდგარი ვიზიტი (bookingDate<=დღეს) კეტავს,
     მომავალი ჯავშანი ვადას აწესებს (უახლოესის წინა დღის 10:00) */
  const breakdownOf = async (
    q: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  ) => {
    const [row] = await q
      .select({
        consumed: sql<number>`count(*) filter (where ${bookings.bookingDate} <= ${today})::int`,
        earliestFuture: sql<
          string | null
        >`min(${bookings.bookingDate}) filter (where ${bookings.bookingDate} > ${today})`,
      })
      .from(bookings)
      .where(and(eq(bookings.passId, id), occupiesBookingCondition()));
    return {
      consumed: row?.consumed ?? 0,
      earliestFuture: row?.earliestFuture ?? null,
    };
  };

  const pre = await breakdownOf(db);
  const check = passCancelCheck(
    pass.status,
    expired,
    pre.consumed,
    pre.earliestFuture,
    pass.subscriptionId !== null,
  );
  if (!check.cancellable) {
    return {
      ok: false,
      message: pass.subscriptionId
        ? "ბონუს-პასი წევრობასთან ერთად უქმდება."
        : pre.consumed > 0
          ? "პასზე ვიზიტი უკვე შედგა - ონლაინ ვეღარ გაუქმდება."
          : NOT_ELIGIBLE,
    };
  }

  /* race-guard: ტრანზაქციაშივე ხელახლა მოწმდება - პარალელური დაჯავშნა
     და გაუქმება ერთდროულად ვერ ჩაივლის. მომავალი 0₾-იანი ჯავშნები
     კასკადით უქმდება (პასი რომ უქმდება, ცალკე ვეღარ იარსებებენ). */
  const outcome = await db.transaction(
    async (tx): Promise<"done" | "used" | "already"> => {
      const txState = await breakdownOf(tx);
      if (txState.consumed > 0) return "used";
      if (txState.earliestFuture && !canCancel(txState.earliestFuture)) {
        return "used";
      }
      await tx
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: "customer",
        })
        .where(
          and(
            eq(bookings.passId, id),
            inArray(bookings.status, ["pending", "confirmed"]),
            gt(bookings.bookingDate, today),
          ),
        );
      const [updated] = await tx
        .update(entryPasses)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: "customer",
        })
        .where(
          and(
            eq(entryPasses.id, id),
            inArray(entryPasses.status, ["pending", "active"]),
          ),
        )
        .returning({ id: entryPasses.id });
      return updated ? "done" : "already";
    },
  );
  if (outcome === "used") {
    return {
      ok: false,
      message: "პასზე ვიზიტი უკვე შედგა - ონლაინ ვეღარ გაუქმდება.",
    };
  }
  if (outcome === "already") return { ok: false, message: ALREADY };

  return {
    ok: true,
    orderRef: pass.orderRef,
    itemTitle: "შესვლების პაკეტი",
    buyerName: pass.name,
    phone: pass.phone,
    email: pass.email,
    amountTetri: pass.amountGel,
    passId: null,
    ...(await refundInfo(pass.orderRef, pass.status === "active")),
  };
}
