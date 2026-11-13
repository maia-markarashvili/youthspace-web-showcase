"use server";

import { and, count, eq, inArray, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/db/mutations/audit";
import {
  CapacityError,
  addOneMonth,
  cancelSubscriptionCascade,
} from "@/lib/db/mutations/club-subscription";
import {
  confirmBookingById,
  confirmPassById,
  confirmSubscriptionById,
} from "@/lib/db/mutations/confirm-order";
import { consumeCredit } from "@/lib/db/mutations/referral";
import {
  getPricingSettings,
  occupiesBookingCondition,
  occupiesSeatCondition,
} from "@/lib/db/queries/availability";
import { findOrderContact } from "@/lib/db/queries/contact";
import {
  bookings,
  courses,
  entryPasses,
  payments,
  referralCredits,
  subscriptions,
  visits,
} from "@/lib/db/schema";
import type { FormState } from "@/lib/form-state";
import { formatGel } from "@/lib/money";
import {
  notifyInstallmentDue,
  notifyOrderCodeReminder,
  notifyOwnerEvent,
} from "@/lib/notify-customer";
import {
  applyPercentDiscount,
  clubMonthlyPrice,
  effectivePrice,
  floorToWholeGel,
} from "@/lib/pricing";
import { slotByStartTime } from "@/lib/slots";
import { formatDateKa, subscriptionPhase } from "@/lib/subscription-rules";

/**
 * შეკვეთების CRM — ოფლაინ გადახდის დადასტურება/გაუქმება (bind-სტილი).
 * სტატუსის where-პირობები რბოლას გამორიცხავს: გაუქმებული ჩანაწერი
 * დადასტურებით ვერ „გაცოცხლდება". გაუქმება ადგილს ავტომატურად
 * ათავისუფლებს — მთვლელები მხოლოდ pending/active(confirmed) სტატუსებს ითვლიან.
 *
 * კლუბ-გამოწერას თან სდევს: ბონუს 4-შესვლიანი პასი (subscription_id-ით) და
 * რეფერალური კრედიტები — დადასტურება/გაუქმება/განახლება მათაც კასკადურად ეხება.
 * ⚠ მხოლოდ async ფუნქციების ექსპორტი.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESERVABLE_KINDS = ["subscription", "booking", "pass"] as const;
type ReservableKind = (typeof RESERVABLE_KINDS)[number];

/* ── ხელით დაკავება გადახდის გარეშე (§1.5) ─────────────────────
   status pending რჩება, holdExpiresAt null-დება (უვადოდ იკავებს),
   reservedAt/reservedNote კი აღნიშნავს, რომ ეს ჩვეულებრივი
   გადმორიცხვის მოლოდინი კი არა, ადმინის შეგნებული გამონაკლისია. */
export async function reserveWithoutPayment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  if (
    !UUID_RE.test(id) ||
    !RESERVABLE_KINDS.includes(kind as ReservableKind)
  ) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const patch = {
    holdExpiresAt: null,
    reservedAt: new Date(),
    reservedNote: note || null,
  };

  /* სამი ცხრილის ტიპი განსხვავებულია — db.update() union-ტიპს ვერ იღებს,
     ამიტომ განშტოება საჭიროა (იხ. cancelExpiredHolds იმავე პატერნით) */
  let updated: { id: string } | undefined;
  if (kind === "subscription") {
    [updated] = await db
      .update(subscriptions)
      .set(patch)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.status, "pending")))
      .returning({ id: subscriptions.id });
  } else if (kind === "booking") {
    const [row] = await db
      .update(bookings)
      .set(patch)
      .where(and(eq(bookings.id, id), eq(bookings.status, "pending")))
      .returning({
        id: bookings.id,
        itemType: bookings.itemType,
        orderRef: bookings.orderRef,
        bookingDate: bookings.bookingDate,
        startTime: bookings.startTime,
        peopleUpTo: bookings.peopleUpTo,
        amountGel: bookings.amountGel,
        buyerName: bookings.buyerName,
        buyerPhone: bookings.buyerPhone,
      });
    updated = row;
    /* ვადაგასული ჰოლდის ხელახლა დაკავებამ შეიძლება უკვე გაყიდულ სლოტს
       დაედოს - ღონისძიებაზე ეს ორმაგი ჯავშანია, ამიტომ მფლობელს ვწერთ */
    if (row?.itemType === "space") {
      const [clash] = await db
        .select({ orderRef: bookings.orderRef })
        .from(bookings)
        .where(
          and(
            inArray(bookings.itemType, ["dropin", "space"]),
            eq(bookings.bookingDate, row.bookingDate),
            eq(bookings.startTime, row.startTime),
            occupiesBookingCondition(),
            ne(bookings.id, row.id),
          ),
        )
        .limit(1);
      if (clash) {
        void notifyOwnerEvent({
          kind: "conflict",
          orderRef: row.orderRef,
          date: row.bookingDate,
          slot:
            slotByStartTime(row.startTime)?.label ?? row.startTime.slice(0, 5),
          peopleUpTo: row.peopleUpTo,
          amountTetri: row.amountGel,
          buyerName: row.buyerName,
          buyerPhone: row.buyerPhone,
          detail: `ხელით დაკავებისას სლოტზე სხვა ჯავშანიც აღმოჩნდა (${clash.orderRef}).`,
        });
      }
    }
  } else {
    [updated] = await db
      .update(entryPasses)
      .set(patch)
      .where(and(eq(entryPasses.id, id), eq(entryPasses.status, "pending")))
      .returning({ id: entryPasses.id });
  }

  if (!updated) {
    return {
      status: "error",
      message: "ჩანაწერი აღარ არის მოლოდინში - განაახლე გვერდი.",
    };
  }

  revalidatePath("/admin/orders");
  return { status: "success", message: "ადგილი დაკავებულია გადახდის გარეშე." };
}

/* ── ვადაგასული ჰოლდების ერთიანი გაუქმება ──────────────────────
   ვადაგასული pending რიგი ისედაც აღარ იკავებს ადგილს (activeHoldCondition),
   მაგრამ ცხრილში ჩანს და ერევა — ეს ღილაკი მათ cancelled-ზე გადაჰყავს. */
export async function cancelExpiredHolds(
  kind: ReservableKind,
  _formData: FormData,
) {
  await requireOwner();

  if (kind === "subscription") {
    const expired = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "pending"),
          sql`${subscriptions.holdExpiresAt} is not null and ${subscriptions.holdExpiresAt} < now()`,
        ),
      );
    for (const row of expired) {
      /* იგივე კასკადი, რასაც ხელით გაუქმება იყენებს (club-subscription.ts) */
      await cancelSubscriptionCascade(row.id, "system");
    }
  } else if (kind === "booking") {
    await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "system",
      })
      .where(
        and(
          eq(bookings.status, "pending"),
          sql`${bookings.holdExpiresAt} is not null and ${bookings.holdExpiresAt} < now()`,
        ),
      );
  } else {
    await db
      .update(entryPasses)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "system",
      })
      .where(
        and(
          eq(entryPasses.status, "pending"),
          sql`${entryPasses.holdExpiresAt} is not null and ${entryPasses.holdExpiresAt} < now()`,
        ),
      );
  }

  revalidatePath("/admin/orders");
}

/* ── კოდის ხელახლა გაგზავნა SMS-ით (§1.7) — მომხმარებელს დაავიწყდა ── */
export async function resendOrderCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (
    !UUID_RE.test(id) ||
    !RESERVABLE_KINDS.includes(kind as ReservableKind)
  ) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const contact = await findOrderContact(kind as ReservableKind, id);
  if (!contact) {
    return { status: "error", message: "ჩანაწერი ვერ მოიძებნა." };
  }

  const result = await notifyOrderCodeReminder(contact);
  if (result.sms && result.email) {
    return { status: "success", message: "SMS და მეილი გაიგზავნა." };
  }
  if (result.sms) {
    return { status: "success", message: "SMS გაიგზავნა (მეილი არა)." };
  }
  if (result.email) {
    return { status: "success", message: "მეილი გაიგზავნა (SMS არა)." };
  }
  return {
    status: "error",
    message: "ვერცერთი არხით ვერ გაიგზავნა - შეამოწმე კონფიგურაცია.",
  };
}

/* ── კლუბ-გამოწერები ──────────────────────────────────────────── */

export async function confirmSubscription(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  /* ლოგიკა mutations/confirm-order.ts-შია — იმავეს Flitt-ის callback იძახებს */
  await confirmSubscriptionById(id);
  revalidatePath("/admin/orders");
}

export async function cancelSubscription(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  /* კასკადი (ბონუს-პასი + რეფერალური კრედიტები) საზიაროა კაბინეტთან —
     ლოგიკა club-subscription.ts-შია */
  await cancelSubscriptionCascade(id, "admin");

  revalidatePath("/admin/orders");
}

/**
 * განახლება +1 თვით (useActionState-სტილი — FormState ბრუნდება ფორმაში):
 *  · active/grace ფაზა — ახალი ვადა ძველი currentPeriodEnd-იდან ითვლება
 *    (უწყვეტობა), კაპასიტეტი არ მოწმდება — ადგილი ისედაც ამ წევრისაა;
 *  · expired ფაზა — ადგილი გათავისუფლებულია, ამიტომ ტრანზაქციაში ხელახლა
 *    მოწმდება კვოტა (საკუთარი ჩანაწერის გამორიცხვით) და ვადა დღეიდან ითვლება.
 * ორივე ფაზაში: ერთი available რეფერალური კრედიტი (თუ არის) იხარჯება და
 * ახალი თვის თანხა ფასდაკლებულია; ბონუს-პასი ახალ პერიოდზე 4 შესვლით
 * გადაიწერება (გამოუყენებელი ძველი შესვლები იწვება — მფლობელის არჩევანი).
 */
export async function renewSubscription(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("subscriptionId") ?? "").trim();
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი იდენტიფიკატორი." };
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);

  if (!sub || sub.planType !== "club" || sub.status !== "active") {
    return {
      status: "error",
      message: "ჩანაწერი ვერ მოიძებნა ან აღარ არის აქტიური - განაახლე გვერდი.",
    };
  }

  const settings = await getPricingSettings();
  const phase = subscriptionPhase(
    sub.currentPeriodEnd,
    settings.renewalGraceDays,
  );
  const baseTetri = effectivePrice(clubMonthlyPrice(settings));

  try {
    const outcome = await db.transaction(async (tx) => {
      /* expired — ადგილი შეიძლება სხვამ დაიკავა; კვოტა ხელახლა მოწმდება */
      if (phase === "expired") {
        for (const clubId of sub.clubIds ?? []) {
          const [row] = await tx
            .select({ n: count() })
            .from(subscriptions)
            .where(
              and(
                eq(subscriptions.planType, "club"),
                occupiesSeatCondition(settings),
                sql`${subscriptions.clubIds} @> ARRAY[${clubId}]::uuid[]`,
                sql`${subscriptions.id} <> ${sub.id}`,
              ),
            );
          if ((row?.n ?? 0) >= settings.clubSeatCapacity) {
            throw new CapacityError("კლუბის ადგილები ამოიწურა");
          }
        }
      }

      /* active/grace — უწყვეტობა: ახალი თვე ძველი ვადიდან, არა გადახდის დღიდან */
      const newEnd =
        phase === "expired"
          ? addOneMonth(new Date())
          : addOneMonth(sub.currentPeriodEnd ?? new Date());

      /* ერთი ფასდაკლებული თვე თითო მოყვანილ მეგობარზე — უძველესი available */
      const credit = await consumeCredit(tx, sub.id);
      const amountGel = credit
        ? floorToWholeGel(
            applyPercentDiscount(baseTetri, credit.discountPercent),
          )
        : baseTetri;

      await tx
        .update(subscriptions)
        .set({ currentPeriodEnd: newEnd, amountGel })
        .where(eq(subscriptions.id, sub.id));

      /* ბონუს-პასი ახალ პერიოდზე: entriesTotal სიცოცხლის მთვლელია —
         გამოყენებული + 4 ახალი; ძველი გამოუყენებელი იწვება */
      const [pass] = await tx
        .select({ id: entryPasses.id })
        .from(entryPasses)
        .where(eq(entryPasses.subscriptionId, sub.id))
        .limit(1);
      if (pass) {
        const [usedRow] = await tx
          .select({ n: count() })
          .from(bookings)
          .where(
            and(
              eq(bookings.passId, pass.id),
              occupiesBookingCondition(),
            ),
          );
        await tx
          .update(entryPasses)
          .set({
            entriesTotal: (usedRow?.n ?? 0) + 4,
            expiresAt: newEnd,
            status: "active",
          })
          .where(eq(entryPasses.id, pass.id));
      } else if (sub.orderRef) {
        /* ძველ (ბონუს-პასამდე შექმნილ) წევრს პასი პირველ განახლებაზე ეძლევა */
        await tx
          .insert(entryPasses)
          .values({
            orderRef: sub.orderRef,
            buyerName: sub.subscriberName,
            buyerPhone: sub.subscriberPhone,
            buyerEmail: sub.subscriberEmail || null,
            amountGel: 0,
            entriesTotal: 4,
            subscriptionId: sub.id,
            status: "active",
            expiresAt: newEnd,
          })
          .onConflictDoNothing({ target: entryPasses.orderRef });
      }

      return { newEnd, amountGel, discountPercent: credit?.discountPercent ?? 0 };
    });

    revalidatePath("/admin/orders");
    const discountNote =
      outcome.discountPercent > 0
        ? ` · მეგობრის ბონუსი −${outcome.discountPercent}% → ${formatGel(outcome.amountGel)}`
        : "";
    return {
      status: "success",
      message: `განახლდა - ვადა ${formatDateKa(outcome.newEnd)}-მდე${discountNote}`,
    };
  } catch (error) {
    if (error instanceof CapacityError) {
      return {
        status: "error",
        message: "ადგილი უკვე დაკავებულია - განახლება ვერ მოხერხდა",
      };
    }
    console.error("[orders] განახლება ჩავარდა", error);
    return {
      status: "error",
      message: "დროებითი შეფერხებაა - სცადე ხელახლა.",
    };
  }
}

/* ── ჯავშნები (dropin / course) ───────────────────────────────── */

export async function confirmBooking(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  await confirmBookingById(id);
  revalidatePath("/admin/orders");
}

/* ── კურსის განვადება: თვეების ხელით აღრიცხვა + შეხსენება ──────────
   ავტომატური ჩამოჭრა არ არსებობს (MVP-ის არჩევანი, იგივე რაც კლუბზე):
   მყიდველი ონლაინ მხოლოდ პირველ თვეს იხდის, დანარჩენს ადმინი აღრიცხავს
   და SMS-ით ახსენებს. ვადა ძველი ვადიდან იზრდება — უწყვეტობა, როგორც
   renewSubscription-ში. */

export async function markCourseInstallmentMonth(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const id = String(formData.get("bookingId") ?? "").trim();
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი იდენტიფიკატორი." };
  }
  /* „down" — შემთხვევით დაჭერის გასწორება; იატაკი 1 (პირველი თვე
     დადასტურებისას გადაიხადა და უკან ვეღარ წაიშლება) */
  const up = String(formData.get("direction") ?? "up") !== "down";

  const [updated] = await db
    .update(bookings)
    .set(
      up
        ? {
            monthsPaid: sql`least(${bookings.monthsPaid} + 1, ${bookings.planMonths})`,
            planNextDueAt: sql`case when ${bookings.monthsPaid} + 1 >= ${bookings.planMonths} then null else coalesce(${bookings.planNextDueAt}, now()) + interval '1 month' end`,
          }
        : {
            monthsPaid: sql`greatest(${bookings.monthsPaid} - 1, 1)`,
            planNextDueAt: sql`case when ${bookings.monthsPaid} <= 1 then ${bookings.planNextDueAt} when ${bookings.planNextDueAt} is null then now() else ${bookings.planNextDueAt} - interval '1 month' end`,
          },
    )
    .where(
      and(
        eq(bookings.id, id),
        eq(bookings.status, "confirmed"),
        sql`${bookings.planMonths} is not null`,
      ),
    )
    .returning({
      orderRef: bookings.orderRef,
      monthsPaid: bookings.monthsPaid,
      planMonths: bookings.planMonths,
    });

  if (!updated) {
    return {
      status: "error",
      message: "განვადებიანი, დადასტურებული ჯავშანი ვერ მოიძებნა - განაახლე გვერდი.",
    };
  }

  await logAudit({
    session,
    action: "orders.installmentMonth",
    targetType: "booking",
    targetId: id,
    detail: {
      orderRef: updated.orderRef,
      monthsPaid: updated.monthsPaid,
      planMonths: updated.planMonths,
    },
  });
  revalidatePath("/admin/orders");
  return {
    status: "success",
    message: `გადახდილია ${updated.monthsPaid}/${updated.planMonths}.`,
  };
}

/** შეხსენება ხელით — ღილაკი ადმინში; sms.installment.due (ცარიელი = არ იგზავნება) */
export async function sendInstallmentReminder(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwner();

  const id = String(formData.get("bookingId") ?? "").trim();
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი იდენტიფიკატორი." };
  }

  const [row] = await db
    .select({
      orderRef: bookings.orderRef,
      phone: bookings.buyerPhone,
      email: bookings.buyerEmail,
      name: bookings.buyerName,
      amountTetri: bookings.amountGel,
      planMonths: bookings.planMonths,
      monthsPaid: bookings.monthsPaid,
      nextDueAt: bookings.planNextDueAt,
      title: courses.title,
    })
    .from(bookings)
    .leftJoin(courses, eq(courses.id, bookings.itemId))
    .where(and(eq(bookings.id, id), eq(bookings.status, "confirmed")))
    .limit(1);

  if (!row?.planMonths) {
    return {
      status: "error",
      message: "განვადებიანი, დადასტურებული ჯავშანი ვერ მოიძებნა.",
    };
  }
  if (row.monthsPaid >= row.planMonths) {
    return { status: "error", message: "ყველა თვე გადახდილია - შესახსენებელი აღარაა." };
  }

  const result = await notifyInstallmentDue({
    phone: row.phone,
    email: row.email,
    name: row.name,
    orderRef: row.orderRef,
    itemTitle: row.title ?? "კურსი",
    amountTetri: row.amountTetri,
    monthsPaid: row.monthsPaid,
    planMonths: row.planMonths,
    dueDate: row.nextDueAt ? formatDateKa(row.nextDueAt) : "",
  });

  if (result.sms && result.email) {
    return { status: "success", message: "SMS და მეილი გაიგზავნა." };
  }
  if (result.sms) {
    return { status: "success", message: "SMS გაიგზავნა (მეილი არა)." };
  }
  if (result.email) {
    return { status: "success", message: "მეილი გაიგზავნა (SMS არა)." };
  }
  return {
    status: "error",
    message: "ვერცერთი არხით ვერ გაიგზავნა - შეამოწმე შაბლონები და კონფიგურაცია.",
  };
}

export async function cancelBooking(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  const [cancelled] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: "admin" })
    .where(
      and(
        eq(bookings.id, id),
        inArray(bookings.status, ["pending", "confirmed"]),
      ),
    )
    .returning({
      itemType: bookings.itemType,
      orderRef: bookings.orderRef,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      peopleUpTo: bookings.peopleUpTo,
      amountGel: bookings.amountGel,
      buyerName: bookings.buyerName,
      buyerPhone: bookings.buyerPhone,
    });
  /* ღონისძიების გაუქმება სლოტს ხელახლა გასაყიდად ხსნის — მფლობელი იგებს */
  if (cancelled?.itemType === "space") {
    void notifyOwnerEvent({
      kind: "cancelled",
      orderRef: cancelled.orderRef,
      date: cancelled.bookingDate,
      slot:
        slotByStartTime(cancelled.startTime)?.label ??
        cancelled.startTime.slice(0, 5),
      peopleUpTo: cancelled.peopleUpTo,
      amountTetri: cancelled.amountGel,
      buyerName: cancelled.buyerName,
      buyerPhone: cancelled.buyerPhone,
    });
  }
  revalidatePath("/admin/orders");
}

/* ── 4-ჯერადი პასები ──────────────────────────────────────────── */

export async function confirmPass(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  await confirmPassById(id);
  revalidatePath("/admin/orders");
}

export async function cancelPass(id: string, _formData: FormData) {
  await requireOwner();
  if (!UUID_RE.test(id)) return;

  await db
    .update(entryPasses)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: "admin" })
    .where(
      and(
        eq(entryPasses.id, id),
        inArray(entryPasses.status, ["pending", "active"]),
      ),
    );
  revalidatePath("/admin/orders");
}

/* ── შეკვეთის სრული წაშლა ─────────────────────────────────────────
   2026-08-30 (მფლობელის გადაწყვეტილება): ადმინს ნებისმიერი შეკვეთის
   წაშლა შეუძლია, სტატუსის მიუხედავად - ტრანზაქციაში ჯერ იშლება ყველა
   დამოკიდებული ჩანაწერი (ვიზიტები, გადახდები, კრედიტები, ბონუს-პასები
   და მათი ჯავშნები; FK-ები NO ACTION-ია), მერე თავად შეკვეთა. კვალად
   რჩება მხოლოდ audit-ჩანაწერი (orders.delete). FormState ბრუნდება
   (useActionState) - შეცდომა მომხმარებელს ცხადად უნდა დაანახოს. */

/** ჯავშნების შვილები (visits, payments) — deletePass/deleteSubscription-იც
 *  იყენებს ბონუს/პასის ჯავშნებზე */
async function deleteBookingChildren(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  bookingIds: string[],
) {
  if (bookingIds.length === 0) return;
  await tx.delete(visits).where(inArray(visits.bookingId, bookingIds));
  await tx.delete(payments).where(inArray(payments.bookingId, bookingIds));
}

/** პასების სრული ჯაჭვის წაშლა tx-ში: ჯავშნები შვილებით → პასების
 *  visits/payments → პასები */
async function deletePassesCascade(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  passIds: string[],
) {
  if (passIds.length === 0) return;
  const passBookings = await tx
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.passId, passIds));
  await deleteBookingChildren(
    tx,
    passBookings.map((row) => row.id),
  );
  await tx.delete(bookings).where(inArray(bookings.passId, passIds));
  await tx.delete(visits).where(inArray(visits.passId, passIds));
  await tx.delete(payments).where(inArray(payments.passId, passIds));
  await tx.delete(entryPasses).where(inArray(entryPasses.id, passIds));
}

export async function deleteSubscription(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const [sub] = await db
    .select({ orderRef: subscriptions.orderRef })
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  if (!sub) {
    return { status: "error", message: "შეკვეთა ვერ მოიძებნა." };
  }

  await db.transaction(async (tx) => {
    /* ბონუს-პასები მთელი ჯაჭვით */
    const bonusPasses = await tx
      .select({ id: entryPasses.id })
      .from(entryPasses)
      .where(eq(entryPasses.subscriptionId, id));
    await deletePassesCascade(
      tx,
      bonusPasses.map((row) => row.id),
    );
    /* რეფერალური კრედიტები — ეს გამოწერა მომყვანიც შეიძლება იყოს და მოყვანილიც */
    await tx
      .delete(referralCredits)
      .where(
        or(
          eq(referralCredits.referrerSubscriptionId, id),
          eq(referralCredits.refereeSubscriptionId, id),
        ),
      );
    await tx.delete(visits).where(eq(visits.subscriptionId, id));
    await tx.delete(payments).where(eq(payments.subscriptionId, id));
    await tx.delete(subscriptions).where(eq(subscriptions.id, id));
  });

  await logAudit({
    session,
    action: "orders.delete",
    targetType: "subscription",
    targetId: id,
    detail: { orderRef: sub.orderRef },
  });
  revalidatePath("/admin/orders");
  return { status: "success", message: "წაიშალა." };
}

export async function deleteBooking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const [row] = await db
    .select({ orderRef: bookings.orderRef })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!row) {
    return { status: "error", message: "ჯავშანი ვერ მოიძებნა." };
  }

  await db.transaction(async (tx) => {
    await deleteBookingChildren(tx, [id]);
    await tx.delete(bookings).where(eq(bookings.id, id));
  });

  await logAudit({
    session,
    action: "orders.delete",
    targetType: "booking",
    targetId: id,
    detail: { orderRef: row.orderRef },
  });
  revalidatePath("/admin/orders");
  return { status: "success", message: "წაიშალა." };
}

export async function deletePass(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireOwner();

  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) {
    return { status: "error", message: "არასწორი მოთხოვნა." };
  }

  const [row] = await db
    .select({
      orderRef: entryPasses.orderRef,
      subscriptionId: entryPasses.subscriptionId,
    })
    .from(entryPasses)
    .where(eq(entryPasses.id, id))
    .limit(1);
  if (!row) {
    return { status: "error", message: "პასი ვერ მოიძებნა." };
  }
  /* ბონუს-პასი კლუბის შეკვეთის ნაწილია - ცალკე კი არა, კლუბთან ერთად იშლება */
  if (row.subscriptionId) {
    return {
      status: "error",
      message: "კლუბის ბონუს-პასი კლუბ-შეკვეთიდან იმართება.",
    };
  }

  await db.transaction(async (tx) => {
    await deletePassesCascade(tx, [id]);
  });

  await logAudit({
    session,
    action: "orders.delete",
    targetType: "pass",
    targetId: id,
    detail: { orderRef: row.orderRef },
  });
  revalidatePath("/admin/orders");
  return { status: "success", message: "წაიშალა." };
}
