"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { effectiveAnalyticsConsent } from "@/lib/analytics-consent-server";
import { resolveProfileId } from "@/lib/auth/purchase-profile";
import { db } from "@/lib/db";
import { orderRefExists } from "@/lib/db/mutations/club-subscription";
import {
  cardHoldExpiry,
  startCardPayment,
  transferHoldExpiry,
} from "@/lib/db/mutations/payment";
import {
  getPricingSettings,
  memberClubIdsForPhone,
  occupiesBookingCondition,
} from "@/lib/db/queries/availability";
import { upcomingEventSlots } from "@/lib/db/queries/calendar";
import { listSpaces } from "@/lib/db/queries/catalog";
import { bookings } from "@/lib/db/schema";
import { flittMode } from "@/lib/flitt";
import { notifyOrderPending, notifyOwnerEvent } from "@/lib/notify-customer";
import { generateUniqueOrderRef } from "@/lib/order-ref";
import { transferOtpGate } from "@/lib/otp";
import {
  eventPeopleTiers,
  eventSlotPrice,
  eventTierByUpTo,
  eventTotalTetri,
} from "@/lib/pricing";
import { checkRateLimit, clientIp, clientKey } from "@/lib/rate-limit";
import { ENTRY_SLOT_KEYS, slotByKey } from "@/lib/slots";
import type { EventBookingState } from "./types";

/**
 * ღონისძიების (სივრცის ერთიანი დაჯავშნის) Server Action — purchaseSingleEntry-ის
 * სარკე. ფასი მთლიანად სერვერზე ითვლება: სლოტის ფასი (წევრისთვის — წევრის
 * ფასი, თუ გაწერილია; წევრობა ნომრით მოწმდება, კურსების ანალოგიურად) +
 * ხალხის საფეხურის დანამატი. სივრცე ერთადერთია — კლიენტისგან id არ მოდის,
 * სერვერი თავად წყვეტს (პირველი აქტიური რიგი).
 *
 * ⚠ Server Functions პირდაპირი POST-ითაც მისაწვდომია — ვალიდაცია, rate-limit,
 * საფეხურის და სლოტის შემოწმება ყოველთვის აქ ხდება; ექსკლუზიურობა ხელახლა
 * მოწმდება ტრანზაქციაში advisory ლოკის ქვეშ.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_EMAIL = "მიუთითეთ სწორი ელფოსტა";
const TOO_MANY = "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.";
const GENERIC_ERROR = "დროებითი შეფერხებაა - სცადეთ ხელახლა ან მოგვწერეთ.";
const CHECK_FIELDS = "შეამოწმეთ მონიშნული ველები.";
const SLOT_TAKEN = "ეს დრო უკვე დაიკავეს - აირჩიე სხვა დრო.";
const SLOT_UNAVAILABLE = "ეს დრო მიუწვდომელია - აირჩიე კალენდრიდან.";
const TIER_INVALID = "აირჩიე დამსწრეთა რაოდენობა";
const CONSENT_TERMS = "წესებსა და პირობებზე თანხმობა აუცილებელია";
const CONSENT_PRIVACY =
  "პერსონალურ მონაცემთა დაცვის წესებზე თანხმობა აუცილებელია";

const SLOT_TAKEN_SENTINEL = "__event_slot_taken__";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

const eventSchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(120),
  phone: z.string().trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL),
  date: z.string().regex(DATE_RE, "აირჩიე დღე და დრო"),
  slot: z.enum(ENTRY_SLOT_KEYS, { error: "აირჩიე დღე და დრო" }),
  /* საფეხურის ზღვარი — რიცხვად; კონკრეტულ საფეხურთან დამთხვევა ქვემოთ მოწმდება */
  peopleUpTo: z
    .string()
    .regex(/^\d{1,4}$/, TIER_INVALID)
    .transform(Number),
  note: z.string().trim().max(300).optional(),
  /* არასწორი/არარსებული მნიშვნელობა → გადმორიცხვა (უსაფრთხო default) */
  payMethod: z.enum(["card", "transfer"]).catch("transfer"),
  /* Server Function პირდაპირი POST-ითაც მიწვდომადია — თანხმობა აქაც მოწმდება */
  agreeTerms: z.literal("on", CONSENT_TERMS),
  agreePrivacy: z.literal("on", CONSENT_PRIVACY),
});

export async function bookEventSlot(
  _prev: EventBookingState,
  formData: FormData,
): Promise<EventBookingState> {
  if (formData.get("company_website")) return { status: "success" };

  const key = await clientKey("event-booking");
  if (!checkRateLimit(key, { limit: 10 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = eventSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    date: String(formData.get("date") ?? ""),
    slot: String(formData.get("slot") ?? ""),
    peopleUpTo: String(formData.get("peopleUpTo") ?? ""),
    note: String(formData.get("note") ?? "") || undefined,
    payMethod: formData.get("payMethod"),
    /* null → "" — რომ ქართული მესიჯი ამოვიდეს და არა generic type error */
    agreeTerms: String(formData.get("agreeTerms") ?? ""),
    agreePrivacy: String(formData.get("agreePrivacy") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: CHECK_FIELDS,
      errors: fieldErrors(parsed.error),
    };
  }

  if (!checkRateLimit(`valid:${key}`, { limit: 2 })) {
    return { status: "error", message: TOO_MANY };
  }

  const { name, phone, email, date, slot, peopleUpTo, note } = parsed.data;
  const wantsCard = parsed.data.payMethod === "card" && flittMode() !== "off";
  const slotDef = slotByKey(slot);

  /* ერთიანი სივრცე — პირველი აქტიური რიგი (კლიენტს არ ვენდობით) */
  const [space] = await listSpaces();
  if (!space || !slotDef) {
    return { status: "error", message: SLOT_UNAVAILABLE };
  }

  const bookable = await upcomingEventSlots();
  if (!bookable.some((o) => o.date === date && o.slot === slot)) {
    return {
      status: "error",
      message: SLOT_UNAVAILABLE,
      errors: { date: SLOT_UNAVAILABLE },
    };
  }

  try {
    const settings = await getPricingSettings();

    const tier = eventTierByUpTo(eventPeopleTiers(settings), peopleUpTo);
    if (!tier) {
      return {
        status: "error",
        message: CHECK_FIELDS,
        errors: { peopleUpTo: TIER_INVALID },
      };
    }

    if (!wantsCard) {
      const gate = await transferOtpGate({
        settings,
        phone,
        ip: await clientIp(),
        resume: {
          name,
          phone,
          email,
          date,
          slot,
          peopleUpTo: String(peopleUpTo),
          note: note ?? "",
          payMethod: "transfer",
          /* არჩეული პროფილი OTP-ის მეორე ნაბიჯზეც უნდა შენარჩუნდეს */
          profileId: String(formData.get("profileId") ?? ""),
          /* თანხმობები უკვე ვალიდირებულია — მეორე submit-საც უნდა მიჰყვეს */
          agreeTerms: "on",
          agreePrivacy: "on",
        },
        otpId: String(formData.get("otpId") ?? "") || undefined,
        otpCode: String(formData.get("otpCode") ?? "") || undefined,
      });
      if (gate.kind === "challenge") {
        return {
          status: "otp",
          otp: gate.otp,
          errors: gate.fieldError ? { otpCode: gate.fieldError } : undefined,
        };
      }
      if (gate.kind === "blocked") {
        return { status: "error", message: gate.message };
      }
    }

    /* ფასი: წევრობა ნომრით (კურსების წესი) — მოქმედებს მხოლოდ სლოტის ნაწილზე */
    const memberClubIds = await memberClubIdsForPhone(phone, settings);
    const isMember = memberClubIds.length > 0;
    const prices = eventSlotPrice(settings, slot);
    const amountGel = eventTotalTetri(prices, tier, isMember);
    const isMemberPrice = isMember && prices.member !== null;

    const orderRef = await generateUniqueOrderRef(orderRefExists, "space");
  /* ეტაპი 5: ანალიტიკის თანხმობა ყიდვის მომენტში — შეკვეთას მიჰყვება */
  const analyticsConsent = await effectiveAnalyticsConsent();


    /* შესულ მომხმარებელზე ჯავშანი პროფილს ებმება (სტუმარზე → null) */
    const profileId = await resolveProfileId({
      raw: formData.get("profileId"),
      fallback: { fullName: name, phone, email },
    });

    await db.transaction(async (tx) => {
      /* (თარიღი, სლოტი)-ის advisory ლოკი — პარალელური მცდელობები რიგდება */
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${date} || '|' || ${slotDef.start}))`,
      );
      /* ექსკლუზიურობა: სლოტზე არც შესვლა და არც სხვა ღონისძიება არ უნდა იდგეს */
      const [row] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(bookings)
        .where(
          and(
            inArray(bookings.itemType, ["dropin", "space"]),
            eq(bookings.bookingDate, date),
            eq(bookings.startTime, slotDef.start),
            occupiesBookingCondition(),
          ),
        );
      if ((row?.n ?? 0) > 0) {
        throw new Error(SLOT_TAKEN_SENTINEL);
      }

      await tx.insert(bookings).values({
        orderRef,
        itemType: "space",
        spaceId: space.id,
        bookingDate: date,
        startTime: slotDef.start,
        endTime: slotDef.end,
        buyerName: name,
        buyerEmail: email,
        buyerPhone: phone,
        profileId,
        quantity: 1,
        peopleUpTo: tier.upTo,
        amountGel,
        isMemberPrice,
        status: "pending",
        /* ფორმაზე თანხმობა ცხადად მოინიშნა (სქემამ დაადასტურა) */
        termsAccepted: true,
        analyticsConsent,
        holdExpiresAt: wantsCard
          ? cardHoldExpiry()
          : transferHoldExpiry(settings.transferHoldHours),
        reservedNote: note || null,
      });
    });

    const title = `ღონისძიება ${date} ${slotDef.label}`;
    let redirectUrl: string | null = null;
    if (wantsCard) {
      redirectUrl = await startCardPayment({
        orderRef,
        amountTetri: amountGel,
        description: title,
        email,
      });
      /* checkout ვერ შეიქმნა → მყიდველი გადმორიცხვის ეკრანზე რჩება, ამიტომ
         ჰოლდიც გადმორიცხვისა უნდა იყოს. clearHold-ის null აქ საშიშია:
         ღონისძიება მთელ სლოტს კეტავს და უვადოდ დარჩებოდა დაკავებული */
      if (!redirectUrl) {
        await db
          .update(bookings)
          .set({ holdExpiresAt: transferHoldExpiry(settings.transferHoldHours) })
          .where(eq(bookings.orderRef, orderRef));
      }
    }

    if (!redirectUrl) {
      await notifyOrderPending({
        phone,
        email,
        name,
        orderRef,
        amountTetri: amountGel,
        itemTitle: title,
        bankRequisites: settings.bankRequisites,
      });
    }

    /* მფლობელი ყოველ ღონისძიების ჯავშანზე იგებს (შიგნით try/catch — ვერ ისვრის) */
    await notifyOwnerEvent({
      kind: "created",
      orderRef,
      date,
      slot: slotDef.label,
      peopleUpTo: tier.upTo,
      amountTetri: amountGel,
      buyerName: name,
      buyerPhone: phone,
    });

    return {
      status: "success",
      order: {
        orderRef,
        title,
        amountTetri: amountGel,
        bookingDate: date,
        bankRequisites: redirectUrl ? null : settings.bankRequisites,
        redirectUrl,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === SLOT_TAKEN_SENTINEL) {
      return {
        status: "error",
        message: SLOT_TAKEN,
        errors: { date: SLOT_TAKEN },
      };
    }
    console.error("[event-booking] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}
