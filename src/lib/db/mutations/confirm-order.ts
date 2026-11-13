import "server-only";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  addOneMonth,
  effectiveStartDate,
} from "@/lib/db/mutations/club-subscription";
import { activateCreditsForReferee } from "@/lib/db/mutations/referral";
import { occupiesBookingCondition } from "@/lib/db/queries/availability";
import {
  bookings,
  clubs,
  courses,
  entryPasses,
  spaces,
  subscriptions,
} from "@/lib/db/schema";
import { queueCapiPurchase } from "@/lib/meta-capi";
import { quizClubFromAttribution } from "@/lib/quiz-attribution";
import { notifyOrderConfirmed, notifyOwnerEvent } from "@/lib/notify-customer";
import { slotByStartTime } from "@/lib/slots";
import { ticketExpiry } from "@/lib/ticket-token";

/**
 * შეკვეთის დადასტურება — **ერთი წყარო** ორი გამომძახებლისთვის:
 *  · ადმინის ღილაკი /admin/orders-ში (გადმორიცხვა);
 *  · Flitt-ის callback (ბარათით გადახდა).
 *
 * ადმინის action-ები `requireOwner()`-ით იწყება, რომელიც cookie-ს გარეშე
 * throw-ობს — ამიტომ callback მათ ვერ გამოიძახებდა და ლოგიკა აქ გამოვიდა.
 *
 * ⚠ იდემპოტენტობა: ყველა UPDATE-ს `status = 'pending'` პირობა აქვს და
 * `.returning()`-ს იყენებს — განმეორებითი callback 0 რიგს ცვლის, `false`
 * ბრუნდება და **მეორე SMS არ იგზავნება**. Flitt-ის retry-განრიგისთვის
 * (2, 60, 300, 600, 3600, 86400 წმ) ეს კრიტიკულია.
 */

export type OrderTarget =
  | {
      kind: "subscription";
      id: string;
      orderRef: string;
      status: string;
      amountTetri: number;
      phone: string;
      email: string | null;
      name: string;
      title: string;
      /** ქვიზის რეკომენდებული კლუბი (attribution.quiz_club) — Purchase-ს მიჰყვება */
      quizClub: string | null;
    }
  | {
      kind: "booking";
      id: string;
      orderRef: string;
      status: string;
      amountTetri: number;
      phone: string;
      email: string | null;
      name: string;
      title: string;
      quizClub: string | null;
    }
  | {
      kind: "pass";
      id: string;
      orderRef: string;
      status: string;
      amountTetri: number;
      phone: string;
      email: string | null;
      name: string;
      title: string;
      /** პასი ქვიზიდან არ იყიდება — ყოველთვის null */
      quizClub: null;
    };

/** ჯავშნის ადამიანური სათაური — კურსზე/სივრცეზე რეალური სახელით
 *  (ზოგადი „კურსი" დადასტურების SMS/მეილში გამოუსადეგარი იყო;
 *  subscription-ბრენჩი კლუბების სახელებს ისედაც ასე იღებს).
 *  self-cancel.ts-იც ამას იყენებს გაუქმების შეტყობინებაში. */
export async function bookingItemTitle(row: {
  itemType: string;
  itemId: string | null;
  spaceId: string | null;
  bookingDate: string;
}): Promise<string> {
  if (row.itemType === "course") {
    /* მხოლოდ სახელი, „კურსი"-პრეფიქსის გარეშე — ყველა შეხვედრა კურსი არაა
       (მფლობელის წესი, 2026-08-27) */
    if (row.itemId) {
      const [course] = await db
        .select({ title: courses.title })
        .from(courses)
        .where(eq(courses.id, row.itemId))
        .limit(1);
      if (course) return course.title;
    }
    return "ღონისძიება";
  }
  if (row.itemType === "space") {
    const spaceId = row.spaceId ?? row.itemId;
    const [space] = spaceId
      ? await db
          .select({ title: spaces.title })
          .from(spaces)
          .where(eq(spaces.id, spaceId))
          .limit(1)
      : [];
    return space
      ? `სივრცე „${space.title}“ - ${row.bookingDate}`
      : "სივრცის ჯავშანი";
  }
  return `შესვლა ${row.bookingDate}`;
}

/**
 * შეკვეთის პოვნა კოდით. **რიგითობა მნიშვნელოვანია**: კლუბის ყიდვა ორ რიგს
 * წერს ერთი და იმავე order_ref-ით (subscriptions + ბონუს entry_passes),
 * ამიტომ ჯერ გამოწერას ვეძებთ, პასების ძებნისას კი ბონუს-პასები
 * (`subscription_id IS NOT NULL`) გამოირიცხება.
 */
export async function findOrderByRef(
  orderRef: string,
): Promise<OrderTarget | null> {
  const [sub] = await db
    .select({
      id: subscriptions.id,
      orderRef: subscriptions.orderRef,
      status: subscriptions.status,
      amountTetri: subscriptions.amountGel,
      phone: subscriptions.subscriberPhone,
      email: subscriptions.subscriberEmail,
      name: subscriptions.subscriberName,
      clubIds: subscriptions.clubIds,
      attribution: subscriptions.attribution,
    })
    .from(subscriptions)
    .where(eq(subscriptions.orderRef, orderRef))
    .limit(1);

  if (sub) {
    const clubRows =
      sub.clubIds && sub.clubIds.length > 0
        ? await db
            .select({ title: clubs.title })
            .from(clubs)
            .where(inArray(clubs.id, sub.clubIds))
        : [];
    return {
      kind: "subscription",
      id: sub.id,
      orderRef,
      status: sub.status,
      amountTetri: sub.amountTetri,
      phone: sub.phone,
      email: sub.email,
      name: sub.name,
      title: clubRows.map((club) => club.title).join(", ") || "კლუბის წევრობა",
      quizClub: quizClubFromAttribution(sub.attribution),
    };
  }

  const [booking] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      amountTetri: bookings.amountGel,
      phone: bookings.buyerPhone,
      email: bookings.buyerEmail,
      name: bookings.buyerName,
      itemType: bookings.itemType,
      itemId: bookings.itemId,
      spaceId: bookings.spaceId,
      bookingDate: bookings.bookingDate,
      attribution: bookings.attribution,
    })
    .from(bookings)
    .where(eq(bookings.orderRef, orderRef))
    .limit(1);

  if (booking) {
    return {
      kind: "booking",
      id: booking.id,
      orderRef,
      status: booking.status,
      amountTetri: booking.amountTetri,
      phone: booking.phone,
      email: booking.email || null,
      name: booking.name,
      title: await bookingItemTitle(booking),
      quizClub: quizClubFromAttribution(booking.attribution),
    };
  }

  /* ბონუს-პასს თავისი გადახდა არ აქვს — მხოლოდ დამოუკიდებლად ნაყიდი პაკეტი */
  const [pass] = await db
    .select({
      id: entryPasses.id,
      status: entryPasses.status,
      amountTetri: entryPasses.amountGel,
      phone: entryPasses.buyerPhone,
      email: entryPasses.buyerEmail,
      name: entryPasses.buyerName,
    })
    .from(entryPasses)
    .where(
      and(
        eq(entryPasses.orderRef, orderRef),
        isNull(entryPasses.subscriptionId),
      ),
    )
    .limit(1);

  if (pass) {
    return {
      kind: "pass",
      id: pass.id,
      orderRef,
      status: pass.status,
      amountTetri: pass.amountTetri,
      phone: pass.phone,
      email: pass.email,
      name: pass.name,
      title: "4 შესვლის პაკეტი",
      quizClub: null,
    };
  }

  return null;
}

/** კლუბ-გამოწერის აქტივაცია (+ ბონუს-პასი და რეფერალური კრედიტი) */
export async function confirmSubscriptionById(id: string): Promise<boolean> {
  const [sub] = await db
    .select({
      clubIds: subscriptions.clubIds,
      phone: subscriptions.subscriberPhone,
      email: subscriptions.subscriberEmail,
      name: subscriptions.subscriberName,
      orderRef: subscriptions.orderRef,
      amountTetri: subscriptions.amountGel,
      analyticsConsent: subscriptions.analyticsConsent,
      attribution: subscriptions.attribution,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.status, "pending")))
    .limit(1);
  if (!sub) return false;

  const clubRows =
    sub.clubIds && sub.clubIds.length > 0
      ? await db
          .select({ startDate: clubs.startDate, title: clubs.title })
          .from(clubs)
          .where(inArray(clubs.id, sub.clubIds))
      : [];
  const periodEnd = addOneMonth(effectiveStartDate(clubRows));

  let activated = false;
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodEnd: periodEnd,
        holdExpiresAt: null,
      })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.status, "pending")))
      .returning({ id: subscriptions.id });
    if (!updated) return;
    activated = true;

    /* ბონუს-პასი აქტიურდება და placeholder-ვადა რეალურით იცვლება */
    await tx
      .update(entryPasses)
      .set({ status: "active", expiresAt: periodEnd, holdExpiresAt: null })
      .where(
        and(
          eq(entryPasses.subscriptionId, id),
          eq(entryPasses.status, "pending"),
        ),
      );

    /* მოწვეულის დადასტურება → მომყვანის კრედიტი ხელმისაწვდომი ხდება */
    await activateCreditsForReferee(tx, id);
  });

  if (activated) {
    /* fire-and-forget: notify* შიგნიდან არასდროს throw-ობს, ლოდინი კი
       Flitt-ის callback-პასუხს 10+ წამით აყოვნებდა და მათ timeout-ში
       ვეღარ ვეტეოდით (2026-08-27) */
    void notifyOrderConfirmed({
      phone: sub.phone,
      email: sub.email,
      name: sub.name,
      orderRef: sub.orderRef ?? "",
      itemTitle:
        clubRows.map((club) => club.title).join(", ") || "კლუბის წევრობა",
      ticket: { kind: "subscription", id, expiresAt: ticketExpiry({ kind: "subscription" }) },
    });
    /* სერვერული Purchase — ბრაუზერის პიქსელი გადმორიცხვის დადასტურებას ვერ
       ხედავს; ბარათზე event_id-ით დედუპლიკაცია (meta-capi.ts) */
    queueCapiPurchase({
      orderRef: sub.orderRef ?? "",
      amountTetri: sub.amountTetri,
      analyticsConsent: sub.analyticsConsent,
      title: clubRows.map((club) => club.title).join(", ") || "კლუბის წევრობა",
      email: sub.email,
      phone: sub.phone,
      quizClub: quizClubFromAttribution(sub.attribution),
    });
  }

  return activated;
}

/** ჯავშნის დადასტურება (dropin / course / space) */
export async function confirmBookingById(id: string): Promise<boolean> {
  const [confirmed] = await db
    .update(bookings)
    .set({
      status: "confirmed",
      holdExpiresAt: null,
      /* განვადება: დადასტურება ნიშნავს, რომ პირველი თვე გადახდილია, ხოლო
         შემდეგი ვადა ერთი თვის მერეა — კურსის დაწყების თარიღიდან, თუ ჯერ
         არ დაწყებულა (იგივე წესი, რაც კლუბზე effectiveStartDate-ს აქვს:
         ვადამდე ყიდვისას მეორე თვე კურსის დაწყებამდე არ „დაჯდება“).
         იდემპოტენტურია: განმეორებით callback-ზე WHERE 0 რიგს პოულობს */
      monthsPaid: sql`case when ${bookings.planMonths} is null then ${bookings.monthsPaid} else 1 end`,
      planNextDueAt: sql`case when ${bookings.planMonths} is null then ${bookings.planNextDueAt} else greatest(now(), coalesce((select ${courses.startDate}::timestamptz from ${courses} where ${courses.id} = ${bookings.itemId}), now())) + interval '1 month' end`,
    })
    .where(and(eq(bookings.id, id), eq(bookings.status, "pending")))
    .returning({
      phone: bookings.buyerPhone,
      email: bookings.buyerEmail,
      name: bookings.buyerName,
      orderRef: bookings.orderRef,
      itemType: bookings.itemType,
      itemId: bookings.itemId,
      spaceId: bookings.spaceId,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      peopleUpTo: bookings.peopleUpTo,
      amountTetri: bookings.amountGel,
      planMonths: bookings.planMonths,
      analyticsConsent: bookings.analyticsConsent,
      attribution: bookings.attribution,
    });

  if (!confirmed) return false;

  const itemTitle = await bookingItemTitle(confirmed);
  /* განვადებაზე მყიდველმა უნდა დაინახოს, რომელი თვე დაიხურა. CAPI-ს
     სუფთა სათაური მიდის — ანალიტიკაში პროდუქტი ერთი უნდა დარჩეს */
  const notifyTitle = confirmed.planMonths
    ? `${itemTitle} - 1/${confirmed.planMonths} თვე`
    : itemTitle;

  /* fire-and-forget — იხ. confirmSubscriptionById-ის კომენტარი */
  queueCapiPurchase({
    orderRef: confirmed.orderRef,
    amountTetri: confirmed.amountTetri,
    analyticsConsent: confirmed.analyticsConsent,
    title: itemTitle,
    email: confirmed.email,
    phone: confirmed.phone,
    quizClub: quizClubFromAttribution(confirmed.attribution),
  });
  void notifyOrderConfirmed({
    phone: confirmed.phone,
    email: confirmed.email,
    name: confirmed.name,
    orderRef: confirmed.orderRef,
    itemTitle: notifyTitle,
    ticket: {
      kind: "booking",
      id,
      expiresAt: ticketExpiry({
        kind: "booking",
        itemType: confirmed.itemType,
        bookingDate: confirmed.bookingDate,
      }),
    },
  });

  /* ექსკლუზიურობის შემოწმება — დაგვიანებული გადახდა (hold გასული, სლოტი
     ხელახლა გაყიდული) კონფლიქტს აჩენს; შეკვეთა მაინც დასტურდება (ფული
     მიღებულია), მაგრამ მფლობელი ხმამაღლა იგებს. ორივე მიმართულება:
     დადასტურებული ღონისძიება უკვე დაკავებულ სლოტზე **და** დაგვიანებული
     შესვლა ღონისძიებით დაკავებულ სლოტზე. SELECT იმავე advisory-ლოკქვეშაა,
     რაც ჯავშნის ტრანზაქციებში - თორემ ჯერ დაუკომიტებელი ჩანაწერი გამოგვრჩებოდა */
  if (confirmed.itemType === "space" || confirmed.itemType === "dropin") {
    const slotLabel =
      slotByStartTime(confirmed.startTime)?.label ??
      confirmed.startTime.slice(0, 5);
    const clash = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${confirmed.bookingDate} || '|' || ${confirmed.startTime}))`,
      );
      const [row] = await tx
        .select({
          orderRef: bookings.orderRef,
          itemType: bookings.itemType,
        })
        .from(bookings)
        .where(
          and(
            inArray(bookings.itemType, ["dropin", "space"]),
            eq(bookings.bookingDate, confirmed.bookingDate),
            eq(bookings.startTime, confirmed.startTime),
            occupiesBookingCondition(),
            ne(bookings.id, id),
            /* შესვლის დადასტურებისას მხოლოდ ღონისძიება ითვლება კონფლიქტად:
               ერთმანეთის გვერდით მდგარი შესვლები ნორმაა (გაზიარებული პული) */
            ...(confirmed.itemType === "dropin"
              ? [eq(bookings.itemType, "space")]
              : []),
          ),
        )
        .limit(1);
      return row ?? null;
    });

    /* შესვლაზე მფლობელს მხოლოდ კონფლიქტისას ვწერთ (ჩვეულებრივი დადასტურება
       ხმაურს დაამატებდა); ღონისძიებაზე ორივე შემთხვევაში */
    if (confirmed.itemType === "space" || clash) {
      void notifyOwnerEvent({
        kind: clash ? "conflict" : "confirmed",
        orderRef: confirmed.orderRef,
        date: confirmed.bookingDate,
        slot: slotLabel,
        peopleUpTo: confirmed.peopleUpTo,
        amountTetri: confirmed.amountTetri,
        buyerName: confirmed.name,
        buyerPhone: confirmed.phone,
        detail: clash
          ? `სლოტზე სხვა ჯავშანიც დგას (${clash.orderRef}) - გადაწყვიტე: დაბრუნება ან გადატანა.`
          : undefined,
      });
    }
  }
  return true;
}

/** 4-შესვლიანი პაკეტის აქტივაცია */
export async function confirmPassById(id: string): Promise<boolean> {
  const [activated] = await db
    .update(entryPasses)
    .set({ status: "active", holdExpiresAt: null })
    .where(and(eq(entryPasses.id, id), eq(entryPasses.status, "pending")))
    .returning({
      phone: entryPasses.buyerPhone,
      email: entryPasses.buyerEmail,
      name: entryPasses.buyerName,
      orderRef: entryPasses.orderRef,
      expiresAt: entryPasses.expiresAt,
      amountTetri: entryPasses.amountGel,
      analyticsConsent: entryPasses.analyticsConsent,
    });

  if (!activated) return false;

  /* fire-and-forget — იხ. confirmSubscriptionById-ის კომენტარი */
  queueCapiPurchase({
    orderRef: activated.orderRef,
    amountTetri: activated.amountTetri,
    analyticsConsent: activated.analyticsConsent,
    title: "4 შესვლის პაკეტი",
    email: activated.email,
    phone: activated.phone,
  });
  void notifyOrderConfirmed({
    phone: activated.phone,
    email: activated.email,
    name: activated.name,
    orderRef: activated.orderRef,
    itemTitle: "4 შესვლის პაკეტი",
    ticket: {
      kind: "pass",
      id,
      expiresAt: ticketExpiry({ kind: "pass", expiresAt: activated.expiresAt }),
    },
  });
  return true;
}

/** ტიპის მიხედვით სწორი დადასტურება — callback-ისთვის */
export async function confirmOrderTarget(
  target: OrderTarget,
): Promise<boolean> {
  switch (target.kind) {
    case "subscription":
      return confirmSubscriptionById(target.id);
    case "booking":
      return confirmBookingById(target.id);
    case "pass":
      return confirmPassById(target.id);
  }
}
