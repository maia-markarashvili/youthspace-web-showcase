"use server";

import { and, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { effectiveAnalyticsConsent } from "@/lib/analytics-consent-server";
import { resolveProfileId } from "@/lib/auth/purchase-profile";
import { db } from "@/lib/db";
import { orderRefExists } from "@/lib/db/mutations/club-subscription";
import {
  getPricingSettings,
  occupiesBookingCondition,
  passEntriesUsed,
  resolveSlotCapacity,
} from "@/lib/db/queries/availability";
import {
  listOverridesInRange,
  upcomingEntrySlots,
} from "@/lib/db/queries/calendar";
import {
  cardHoldExpiry,
  clearHold,
  startCardPayment,
  transferHoldExpiry,
} from "@/lib/db/mutations/payment";
import { bookings, entryPasses } from "@/lib/db/schema";
import { flittMode } from "@/lib/flitt";
import {
  notifyBookingConfirmed,
  notifyOrderPending,
} from "@/lib/notify-customer";
import { generateUniqueOrderRef } from "@/lib/order-ref";
import { transferOtpGate } from "@/lib/otp";
import { effectivePrice } from "@/lib/pricing";
import { checkRateLimit, clientIp, clientKey } from "@/lib/rate-limit";
import { ENTRY_SLOT_KEYS, slotByKey } from "@/lib/slots";
import { ticketExpiry } from "@/lib/ticket-token";
import type { EntryState } from "./types";

/**
 * Drop-in შესვლების Server Actions (§5.4 — გაყიდვების მოდელი):
 *  · purchaseSingleEntry — ერთჯერადი შესვლა კონკრეტულ (დღე, სლოტი) წყვილზე
 *  · purchaseFourPack   — 4 შესვლის პასი (pending; ვადა pricing_settings-იდან)
 *  · bookWithPass       — აქტიური პასით სლოტის დაჯავშნა (confirmed, 0 ₾)
 *
 * შესვლა = 4-საათიანი სლოტი: 10:00–14:00 / 14:00–18:00 / 18:00–22:00
 * (შუა ზოლი ძირითადად კლუბებისაა — default 0-ით იხსნება მხოლოდ გაწერით).
 * კაპასიტეტი თითო სლოტს ცალკე აქვს — დღის override ?? კვირის დღე ??
 * გლობალური default (calendar_overrides / weekday_capacities).
 *
 * ⚠ Server Functions პირდაპირი POST-ითაც მისაწვდომია — ვალიდაცია, rate-limit
 * და კაპასიტეტის შემოწმება ყოველთვის აქ, სერვერზე ხდება. კაპასიტეტი ხელახლა
 * ითვლება ტრანზაქციის შიგნით (tx-ით), რომ პარალელური ყიდვები არ გადაიკვეთოს.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_EMAIL = "მიუთითეთ სწორი ელფოსტა";
const TOO_MANY = "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.";
const GENERIC_ERROR = "დროებითი შეფერხებაა - სცადეთ ხელახლა ან მოგვწერეთ.";
const CHECK_FIELDS = "შეამოწმეთ მონიშნული ველები.";
const SLOT_FULL = "ამ სლოტში ადგილები ამოიწურა - აირჩიე სხვა დრო.";
const SLOT_UNAVAILABLE = "ეს დრო მიუწვდომელია - აირჩიე კალენდრიდან.";
const CONSENT_TERMS = "წესებსა და პირობებზე თანხმობა აუცილებელია";
const CONSENT_PRIVACY =
  "პერსონალურ მონაცემთა დაცვის წესებზე თანხმობა აუცილებელია";

/** სენტინელები ტრანზაქციიდან ამოსაგდებად — გარეთ ცნობად შეცდომად ითარგმნება */
const CAPACITY_FULL_SENTINEL = "__dropin_capacity_full__";
const PASS_USED_UP_SENTINEL = "__dropin_pass_used_up__";

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * (დღე, სლოტი) ვალიდურია მხოლოდ საჯავშნო ფანჯრის ღია, თავისუფალ სიაში —
 * იგივე წყარო, რასაც გვერდი აჩვენებს (დახურული/სავსე სლოტი აქ არ მოდის).
 */
async function slotIsBookable(date: string, slot: string): Promise<boolean> {
  const options = await upcomingEntrySlots();
  return options.some((option) => option.date === date && option.slot === slot);
}

/** ამ დღის სლოტის ეფექტური ზღვარი (override ?? გლობალური) — tx-ის ლიმიტი */
async function slotCapacityFor(
  date: string,
  slot: (typeof ENTRY_SLOT_KEYS)[number],
): Promise<number> {
  const [settings, overrides] = await Promise.all([
    getPricingSettings(),
    listOverridesInRange(date, date),
  ]);
  return resolveSlotCapacity(settings, date, overrides.get(date))[slot];
}

/* ── ერთჯერადი შესვლა ─────────────────────────────────────────── */

const singleEntrySchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(120),
  phone: z.string().trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL),
  date: z.string().regex(DATE_RE, "აირჩიე დღე და დრო"),
  slot: z.enum(ENTRY_SLOT_KEYS, { error: "აირჩიე დღე და დრო" }),
  /* არასწორი/არარსებული მნიშვნელობა → გადმორიცხვა (უსაფრთხო default) */
  payMethod: z.enum(["card", "transfer"]).catch("transfer"),
  /* Server Function პირდაპირი POST-ითაც მიწვდომადია — თანხმობა აქაც მოწმდება */
  agreeTerms: z.literal("on", CONSENT_TERMS),
  agreePrivacy: z.literal("on", CONSENT_PRIVACY),
});

export async function purchaseSingleEntry(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  if (formData.get("company_website")) return { status: "success" };

  const key = await clientKey("dropin-single");
  if (!checkRateLimit(key, { limit: 10 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = singleEntrySchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    date: String(formData.get("date") ?? ""),
    slot: String(formData.get("slot") ?? ""),
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

  const { name, phone, email, date, slot } = parsed.data;
  const wantsCard = parsed.data.payMethod === "card" && flittMode() !== "off";
  const slotDef = slotByKey(slot);

  if (!slotDef || !(await slotIsBookable(date, slot))) {
    return {
      status: "error",
      message: SLOT_UNAVAILABLE,
      errors: { date: SLOT_UNAVAILABLE },
    };
  }

  try {
    const [settings, capacity] = await Promise.all([
      getPricingSettings(),
      slotCapacityFor(date, slot),
    ]);

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

    const amountGel = effectivePrice({
      standard: settings.singleEntryPrice,
      sale: settings.saleSingleEntryPrice,
    });
    const orderRef = await generateUniqueOrderRef(orderRefExists, "entry");
  /* ეტაპი 5: ანალიტიკის თანხმობა ყიდვის მომენტში — შეკვეთას მიჰყვება */
  const analyticsConsent = await effectiveAnalyticsConsent();


    /* შესულ მომხმარებელზე ყიდვა პროფილს ებმება (სტუმარზე → null) */
    const profileId = await resolveProfileId({
      raw: formData.get("profileId"),
      fallback: { fullName: name, phone, email },
    });

    await db.transaction(async (tx) => {
      /* (თარიღი, სლოტი)-ის advisory ლოკი — პარალელური ჯავშნები (შესვლა
         ან ღონისძიება) რიგდება და count-then-insert რბოლა ქრება */
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${date} || '|' || ${slotDef.start}))`,
      );
      /* კაპასიტეტი ხელახლა tx-ით — ამ სლოტის ჯავშნები + ღონისძიება
         (itemType='space'): ღონისძიება მთელ სლოტს კეტავს */
      const [row] = await tx
        .select({
          n: sql<number>`coalesce(sum(${bookings.quantity}), 0)::int`,
          hasEvent: sql<boolean>`coalesce(bool_or(${bookings.itemType} = 'space'), false)`,
        })
        .from(bookings)
        .where(
          and(
            inArray(bookings.itemType, ["dropin", "space"]),
            eq(bookings.bookingDate, date),
            eq(bookings.startTime, slotDef.start),
            occupiesBookingCondition(),
          ),
        );
      if (row?.hasEvent || (row?.n ?? 0) >= capacity) {
        throw new Error(CAPACITY_FULL_SENTINEL);
      }

      await tx.insert(bookings).values({
        orderRef,
        itemType: "dropin",
        bookingDate: date,
        startTime: slotDef.start,
        endTime: slotDef.end,
        buyerName: name,
        buyerEmail: email,
        buyerPhone: phone,
        profileId,
        amountGel,
        status: "pending",
        /* ფორმაზე თანხმობა ცხადად მოინიშნა (სქემამ დაადასტურა) */
        termsAccepted: true,
        analyticsConsent,
        holdExpiresAt: wantsCard
          ? cardHoldExpiry()
          : transferHoldExpiry(settings.transferHoldHours),
      });
    });

    const title = `ერთჯერადი შესვლა ${date} ${slotDef.label}`;
    let redirectUrl: string | null = null;
    if (wantsCard) {
      redirectUrl = await startCardPayment({
        orderRef,
        amountTetri: amountGel,
        description: title,
        email,
      });
      if (!redirectUrl) await clearHold(orderRef, "booking");
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

    return {
      status: "success",
      message: redirectUrl
        ? "ადგილი დაჯავშნილია - გადამისამართდები გადახდაზე."
        : "ადგილი დაჯავშნილია - დაასრულე გადახდა გადარიცხვით.",
      order: {
        orderRef,
        amountTetri: amountGel,
        title: `ერთჯერადი შესვლა · ${slotDef.label}`,
        bankRequisites: settings.bankRequisites,
        bookingDate: date,
        redirectUrl,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === CAPACITY_FULL_SENTINEL) {
      return {
        status: "error",
        message: SLOT_FULL,
        errors: { date: SLOT_FULL },
      };
    }
    console.error("[dropin-single] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}

/* ── 4 შესვლის პაკეტი ─────────────────────────────────────────── */

const fourPackSchema = z.object({
  name: z.string().trim().min(2, REQUIRED).max(120),
  phone: z.string().trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL),
  /* არასწორი/არარსებული მნიშვნელობა → გადმორიცხვა (უსაფრთხო default) */
  payMethod: z.enum(["card", "transfer"]).catch("transfer"),
  /* Server Function პირდაპირი POST-ითაც მიწვდომადია — თანხმობა აქაც მოწმდება */
  agreeTerms: z.literal("on", CONSENT_TERMS),
  agreePrivacy: z.literal("on", CONSENT_PRIVACY),
});

export async function purchaseFourPack(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  if (formData.get("company_website")) return { status: "success" };

  const key = await clientKey("dropin-pack");
  if (!checkRateLimit(key, { limit: 10 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = fourPackSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
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

  const { name, phone, email } = parsed.data;
  const wantsCard = parsed.data.payMethod === "card" && flittMode() !== "off";

  try {
    const settings = await getPricingSettings();

    if (!wantsCard) {
      const gate = await transferOtpGate({
        settings,
        phone,
        ip: await clientIp(),
        resume: {
          name,
          phone,
          email,
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

    const amountGel = effectivePrice({
      standard: settings.fourPackPrice,
      sale: settings.saleFourPackPrice,
    });
    const orderRef = await generateUniqueOrderRef(orderRefExists, "pass4");
  /* ეტაპი 5: ანალიტიკის თანხმობა ყიდვის მომენტში — შეკვეთას მიჰყვება */
  const analyticsConsent = await effectiveAnalyticsConsent();

    const expiresAt = new Date(
      Date.now() + settings.fourPackValidityDays * DAY_MS,
    );

    /* შესულ მომხმარებელზე ყიდვა პროფილს ებმება (სტუმარზე → null) */
    const profileId = await resolveProfileId({
      raw: formData.get("profileId"),
      fallback: { fullName: name, phone, email },
    });

    await db.insert(entryPasses).values({
      orderRef,
      buyerName: name,
      buyerPhone: phone,
      buyerEmail: email,
      profileId,
      amountGel,
      entriesTotal: 4,
      status: "pending",
      analyticsConsent,
      expiresAt,
      holdExpiresAt: wantsCard
        ? cardHoldExpiry()
        : transferHoldExpiry(settings.transferHoldHours),
    });

    let redirectUrl: string | null = null;
    if (wantsCard) {
      redirectUrl = await startCardPayment({
        orderRef,
        amountTetri: amountGel,
        description: "4 შესვლის პაკეტი",
        email,
      });
      if (!redirectUrl) await clearHold(orderRef, "pass");
    }

    if (!redirectUrl) {
      await notifyOrderPending({
        phone,
        email,
        name,
        orderRef,
        amountTetri: amountGel,
        itemTitle: "4 შესვლის პაკეტი",
        bankRequisites: settings.bankRequisites,
      });
    }

    return {
      status: "success",
      message: `პასი გააქტიურდება გადახდის დადასტურების შემდეგ - 4 შესვლა, მოქმედებს ყიდვიდან ${settings.fourPackValidityDays} დღე.`,
      order: {
        orderRef,
        amountTetri: amountGel,
        title: "4 შესვლის პაკეტი",
        bankRequisites: settings.bankRequisites,
        redirectUrl,
      },
    };
  } catch (error) {
    console.error("[dropin-pack] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}

/* ── პასით დაჯავშნა ───────────────────────────────────────────── */

const passBookingSchema = z.object({
  phone: z.string().trim().min(5, REQUIRED).max(40),
  code: z
    .string()
    .trim()
    .min(4, REQUIRED)
    .max(20)
    .transform((value) => value.toUpperCase()),
  date: z.string().regex(DATE_RE, "აირჩიე დღე და დრო"),
  slot: z.enum(ENTRY_SLOT_KEYS, { error: "აირჩიე დღე და დრო" }),
});

export async function bookWithPass(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  if (formData.get("company_website")) return { status: "success" };

  /* bookWithPass უკვე ფლობილ პასს ითხოვს — ცალკე მკაცრი კარიბჭე არ სჭირდება */
  if (!checkRateLimit(await clientKey("dropin-pass"), { limit: 5 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = passBookingSchema.safeParse({
    phone: String(formData.get("phone") ?? ""),
    code: String(formData.get("code") ?? ""),
    date: String(formData.get("date") ?? ""),
    slot: String(formData.get("slot") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: CHECK_FIELDS,
      errors: fieldErrors(parsed.error),
    };
  }

  const { phone, code, date, slot } = parsed.data;
  const slotDef = slotByKey(slot);

  if (!slotDef || !(await slotIsBookable(date, slot))) {
    return {
      status: "error",
      message: SLOT_UNAVAILABLE,
      errors: { date: SLOT_UNAVAILABLE },
    };
  }

  try {
    const capacity = await slotCapacityFor(date, slot);

    const [pass] = await db
      .select()
      .from(entryPasses)
      .where(
        and(eq(entryPasses.orderRef, code), eq(entryPasses.buyerPhone, phone)),
      )
      .limit(1);

    if (!pass) {
      return {
        status: "error",
        message: "პასი ვერ მოიძებნა - შეამოწმე კოდი და ტელეფონის ნომერი.",
        errors: { code: "კოდი და ნომერი ერთმანეთს არ ემთხვევა" },
      };
    }
    if (pass.status === "pending") {
      return {
        status: "error",
        message:
          "პასი ჯერ გადახდის დადასტურებას ელოდება - გადარიცხვის შემდეგ ადმინი გაააქტიურებს.",
      };
    }
    if (pass.status !== "active") {
      return { status: "error", message: "ეს პასი აღარ არის აქტიური." };
    }
    if (pass.expiresAt.getTime() <= Date.now()) {
      return {
        status: "error",
        message: "პასს ვადა გაუვიდა - შესვლები აღარ მოქმედებს.",
      };
    }

    const usedSoFar = await passEntriesUsed(pass.id);
    if (usedSoFar >= pass.entriesTotal) {
      return { status: "error", message: "პასის შესვლები ამოწურულია." };
    }

    const orderRef = await generateUniqueOrderRef(orderRefExists, "entry");
    let usedBefore = usedSoFar;
    let bookingId: string | null = null;

    await db.transaction(async (tx) => {
      /* იგივე advisory ლოკი, რაც ერთჯერადზე/ღონისძიებაზე — რბოლის დაცვა */
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${date} || '|' || ${slotDef.start}))`,
      );
      const [capRow] = await tx
        .select({
          n: sql<number>`coalesce(sum(${bookings.quantity}), 0)::int`,
          hasEvent: sql<boolean>`coalesce(bool_or(${bookings.itemType} = 'space'), false)`,
        })
        .from(bookings)
        .where(
          and(
            inArray(bookings.itemType, ["dropin", "space"]),
            eq(bookings.bookingDate, date),
            eq(bookings.startTime, slotDef.start),
            occupiesBookingCondition(),
          ),
        );
      if (capRow?.hasEvent || (capRow?.n ?? 0) >= capacity) {
        throw new Error(CAPACITY_FULL_SENTINEL);
      }

      // პასის გამოყენება ხელახლა tx-ით — პარალელური ჯავშნის race-ის წინააღმდეგ
      const [usedRow] = await tx
        .select({ n: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.passId, pass.id),
            occupiesBookingCondition(),
          ),
        );
      usedBefore = usedRow?.n ?? 0;
      if (usedBefore >= pass.entriesTotal) {
        throw new Error(PASS_USED_UP_SENTINEL);
      }

      const [created] = await tx
        .insert(bookings)
        .values({
          orderRef,
          itemType: "dropin",
          passId: pass.id,
          bookingDate: date,
          startTime: slotDef.start,
          endTime: slotDef.end,
          buyerName: pass.buyerName,
          buyerEmail: pass.buyerEmail ?? "",
          buyerPhone: pass.buyerPhone,
          /* პასით დაჯავშნილი შესვლა იმავე პროფილს ებმება, რასაც თავად პასი -
             თორემ კაბინეტში პასი გამოჩნდებოდა, მისი შესვლები კი აღარ */
          profileId: pass.profileId,
          amountGel: 0,
          status: "confirmed",
        })
        .returning({ id: bookings.id });
      bookingId = created?.id ?? null;
    });

    const remaining = Math.max(0, pass.entriesTotal - usedBefore - 1);

    await notifyBookingConfirmed({
      phone: pass.buyerPhone,
      email: pass.buyerEmail,
      name: pass.buyerName,
      orderRef,
      date,
      slot: slotDef.label,
      remaining,
      ticket: bookingId
        ? {
            kind: "booking",
            id: bookingId,
            expiresAt: ticketExpiry({
              kind: "booking",
              itemType: "dropin",
              bookingDate: date,
            }),
          }
        : null,
    });

    return {
      status: "success",
      message: `ჯავშანი დადასტურდა - პასზე დაგრჩა ${remaining} შესვლა.`,
      order: {
        orderRef,
        amountTetri: 0,
        title: `შესვლა პასით · ${slotDef.label}`,
        bankRequisites: null,
        bookingDate: date,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === CAPACITY_FULL_SENTINEL) {
      return {
        status: "error",
        message: SLOT_FULL,
        errors: { date: SLOT_FULL },
      };
    }
    if (error instanceof Error && error.message === PASS_USED_UP_SENTINEL) {
      return { status: "error", message: "პასის შესვლები ამოწურულია." };
    }
    console.error("[dropin-pass] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}
