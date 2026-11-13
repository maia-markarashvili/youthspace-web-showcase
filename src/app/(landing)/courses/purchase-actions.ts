"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { quizAttributionFromForm } from "@/lib/quiz-attribution";
import { z } from "zod";
import { effectiveAnalyticsConsent } from "@/lib/analytics-consent-server";
import { resolveProfileId } from "@/lib/auth/purchase-profile";
import { courseHasEnded, todayTbilisi } from "@/lib/calendar";
import { db } from "@/lib/db";
import { orderRefExists } from "@/lib/db/mutations/club-subscription";
import {
  courseSeatsRemaining,
  getPricingSettings,
  memberClubIdsForPhone,
  occupiesBookingCondition,
} from "@/lib/db/queries/availability";
import {
  cardHoldExpiry,
  clearHold,
  startCardPayment,
  transferHoldExpiry,
} from "@/lib/db/mutations/payment";
import { bookings, courses } from "@/lib/db/schema";
import { flittMode } from "@/lib/flitt";
import {
  notifyOrderPending,
  notifyRegistrationConfirmed,
} from "@/lib/notify-customer";
import { generateUniqueOrderRef } from "@/lib/order-ref";
import { transferOtpGate } from "@/lib/otp";
import { normalizePhoneDigits } from "@/lib/phone";
import {
  courseDiscountForClubs,
  courseIsFree,
  coursePaymentPlans,
  resolveCoursePayPlan,
} from "@/lib/pricing";
import { checkRateLimit, clientIp, clientKey } from "@/lib/rate-limit";
import { formatDateKa } from "@/lib/subscription-rules";
import { ticketExpiry } from "@/lib/ticket-token";
import type { CoursePurchaseState } from "./types";

/**
 * კურსის ყიდვა (offline გადახდა): ადგილი მაშინვე იჯავშნება status='pending'-ით,
 * თანხა **მხოლოდ სერვერზე** ითვლება — base = sale ?? regular, მასზე კლუბის
 * წევრობის ფასდაკლება ტელეფონის ნომრით: კურსის club_discounts-იდან
 * მაქსიმალური დამთხვეული განაკვეთი.
 *
 * ⚠ Server Functions პირდაპირი POST-ითაც მისაწვდომია — ვალიდაცია, rate-limit
 * და კაპასიტეტის ხელახალი შემოწმება ტრანზაქციაში ყოველთვის აქ ხდება.
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_EMAIL = "მიუთითეთ სწორი ელფოსტა";
const CONSENT_TERMS = "წესებსა და პირობებზე თანხმობა აუცილებელია";
const CONSENT_PRIVACY =
  "პერსონალურ მონაცემთა დაცვის წესებზე თანხმობა აუცილებელია";
const AGE_INVALID = "მიუთითე სწორი ასაკი";
const AGE_REQUIRED = "ასაკის მითითება აუცილებელია";
const TOO_MANY = "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.";
const GENERIC_ERROR = "დროებითი შეფერხებაა - სცადეთ ხელახლა ან მოგვწერეთ.";
const SOLD_OUT = "ადგილები ამოიწურა";
const ALREADY_REGISTERED =
  "ამ ნომრით უკვე დარეგისტრირებული ხარ - შენი კოდი SMS-ით მიიღე, ჯავშანს ანგარიშში ნახავ.";


function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

/** ტრანზაქციაში კაპასიტეტის ჩავარდნის მარკერი — GENERIC-ისგან გასარჩევად */
class SoldOutError extends Error {}

/** უფასო ღონისძიებაზე იმავე ნომრით მეორედ რეგისტრაციის მარკერი */
class AlreadyRegisteredError extends Error {}

/** უფასოზე დუბლ-რეგისტრაციის შემოწმება — ნომრის ბოლო 9 ციფრით, ოკუპანტ
 *  ჯავშნებში. tx-გარეშეც გამოიძახება (მეგობრული შეცდომა sold-out-ზე ადრე)
 *  და ტრანზაქციაშიც (race-დაცვა) — where-პირობა ერთი და იგივეა. */
function freeDupeCondition(courseId: string, phone: string) {
  const digits = normalizePhoneDigits(phone);
  return and(
    eq(bookings.itemType, "course"),
    eq(bookings.itemId, courseId),
    occupiesBookingCondition(),
    sql`right(regexp_replace(${bookings.buyerPhone}, '\\D', '', 'g'), 9) = ${digits}`,
  );
}

const purchaseSchema = z.object({
  courseId: z.uuid("კურსი ვერ განისაზღვრა - განაახლე გვერდი"),
  name: z.string().trim().min(2, REQUIRED).max(120),
  phone: z.string().trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL),
  /* ასაკი მხოლოდ landing.askAge-იან კურსზეა სავალდებულო — აქ optional,
     სავალდებულოობა კურსის ჩატვირთვის მერე მოწმდება. preprocess აუცილებელია:
     z.coerce.number() ცარიელ ""-ს 0-ად აქცევს */
  childAge: z.preprocess(
    (v) => (v == null || v === "" ? undefined : v),
    z.coerce
      .number(AGE_INVALID)
      .int(AGE_INVALID)
      .min(3, AGE_INVALID)
      .max(100, AGE_INVALID)
      .optional(),
  ),
  /* არასწორი/არარსებული მნიშვნელობა → გადმორიცხვა (უსაფრთხო default) */
  payMethod: z.enum(["card", "transfer"]).catch("transfer"),
  /* გადახდის ვარიანტი: განვადებიან კურსზე გვერდი დეფოლტად თვიურს აჩვენებს,
     ამიტომ დაკარგული ველის უსაფრთხო წაკითხვაც „monthly“-ა — ნაჩვენები ფასი
     და ჩამოჭრილი ფასი ვერ უნდა დაშორდეს. განვადების გარეშე კურსზე
     resolveCoursePayPlan ისედაც სრულ ფასს აბრუნებს */
  payPlan: z.enum(["full", "monthly"]).catch("monthly"),
  /* Server Function პირდაპირი POST-ითაც მიწვდომადია — თანხმობა აქაც მოწმდება */
  agreeTerms: z.literal("on", CONSENT_TERMS),
  agreePrivacy: z.literal("on", CONSENT_PRIVACY),
});

export async function purchaseCourse(
  _prev: CoursePurchaseState,
  formData: FormData,
): Promise<CoursePurchaseState> {
  if (formData.get("company_website")) return { status: "success" };

  const key = await clientKey("course-purchase");
  if (!checkRateLimit(key, { limit: 10 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = purchaseSchema.safeParse({
    courseId: formData.get("courseId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    childAge: formData.get("childAge"),
    payMethod: formData.get("payMethod"),
    payPlan: formData.get("payPlan"),
    /* null → "" — რომ ქართული მესიჯი ამოვიდეს და არა generic type error */
    agreeTerms: String(formData.get("agreeTerms") ?? ""),
    agreePrivacy: String(formData.get("agreePrivacy") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "შეამოწმეთ მონიშნული ველები.",
      errors: fieldErrors(parsed.error),
    };
  }

  if (!checkRateLimit(`valid:${key}`, { limit: 2 })) {
    return { status: "error", message: TOO_MANY };
  }

  const { courseId, name, phone, email } = parsed.data;

  try {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.isActive, true)))
      .limit(1);

    if (!course) {
      return {
        status: "error",
        message: "კურსი ვერ მოიძებნა - განაახლე გვერდი და სცადე თავიდან.",
      };
    }

    /* დასრულებულ კურსზე რეგისტრაცია დაუშვებელია — UI ფორმას მალავს,
       მაგრამ server action პირდაპირი POST-ითაც მიწვდომადია */
    if (courseHasEnded(course)) {
      return {
        status: "error",
        message: "ეს კურსი დასრულებულია - ახალი ნაკადის გამოცხადებას სიახლეებში ნახავ.",
      };
    }

    /* ადმინის ტოგლი „მიღება დასრულებულია" — იგივე მიზეზით სერვერზეც */
    if (course.registrationClosed) {
      return {
        status: "error",
        message: "ამ კურსზე მიღება დასრულებულია.",
      };
    }

    /* ადმინის ტოგლი: ამ კურსზე ასაკი სავალდებულოა — OTP-კარიბჭემდე, რომ
       მომხმარებელმა პირველივე ნაბიჯზე შეავსოს */
    if (course.landing?.askAge === true && parsed.data.childAge === undefined) {
      return {
        status: "error",
        message: "შეამოწმეთ მონიშნული ველები.",
        errors: { childAge: AGE_REQUIRED },
      };
    }

    /* უფასოზე ჯერ დუბლ-შემოწმება, მერე sold-out — უკვე დარეგისტრირებულმა
       სავსე ღონისძიებაზეც თავისი ზუსტი შეტყობინება უნდა მიიღოს */
    const freeCourse = courseIsFree(course);
    if (freeCourse) {
      const [dupe] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(freeDupeCondition(course.id, phone))
        .limit(1);
      if (dupe) return { status: "error", message: ALREADY_REGISTERED };
    }

    const seatsLeft = await courseSeatsRemaining(course.id, course.capacity);
    if (seatsLeft !== null && seatsLeft <= 0) {
      return { status: "error", message: SOLD_OUT };
    }

    /* უფასოზე ბარათის გზა იკეტება — 0-იანი Flitt-გადახდა არ არსებობს;
       ყოველთვის transfer/OTP ბილიკი */
    const wantsCard =
      parsed.data.payMethod === "card" && flittMode() !== "off" && !freeCourse;

    /* ქვიზიდან მოსული? — hidden ველები; ბაზამდე მხოლოდ ვალიდური slug გადის */
    const attribution = quizAttributionFromForm(
      formData.get("src"),
      formData.get("quizClub"),
    );

    const settings = await getPricingSettings();

    if (!wantsCard) {
      const gate = await transferOtpGate({
        settings,
        phone,
        ip: await clientIp(),
        resume: {
          courseId,
          name,
          phone,
          email,
          payMethod: "transfer",
          /* ⚠ არჩეული გეგმაც უნდა გაჰყვეს მეორე submit-ს, თორემ თვიური
             ჩუმად ერთიანად გადაიქცევა (OtpStep ყველა გასაღებს hidden-ად აბრუნებს) */
          payPlan: parsed.data.payPlan,
          /* არჩეული პროფილი OTP-ის მეორე ნაბიჯზეც უნდა შენარჩუნდეს */
          profileId: String(formData.get("profileId") ?? ""),
          /* ქვიზის კონტექსტიც მეორე submit-ს უნდა მიჰყვეს */
          src: attribution ? "quiz" : "",
          quizClub: attribution?.quiz_club ?? "",
          /* თანხმობები/ასაკი უკვე ვალიდირებულია — მეორე submit-საც უნდა
             მიჰყვეს, თორემ სქემა ჩააგდებს ("" → preprocess → undefined) */
          agreeTerms: "on",
          agreePrivacy: "on",
          childAge:
            parsed.data.childAge !== undefined
              ? String(parsed.data.childAge)
              : "",
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

    const memberClubIds = await memberClubIdsForPhone(phone, settings);
    const discountPercent = courseDiscountForClubs(
      memberClubIds,
      course.clubDiscounts,
    );
    /* ორივე ვარიანტი ერთი ფუნქციით — ზუსტად ის, რასაც გვერდი/checker აჩვენებს */
    const plans = coursePaymentPlans(course, discountPercent);
    const chosen = resolveCoursePayPlan(plans, parsed.data.payPlan);
    const standardTetri = chosen.standardTetri;
    /* ⚠ ეს თანხა პირდაპირ Flitt-ს გადაეცემა და bookings.amount_gel-ში ჯდება:
       განვადებაზე ეს **პირველი თვეა**, არასდროს გეგმის ჯამი */
    const amountTetri = chosen.chargeTetri;
    /* გადასახდელი 0 (უფასო ღონისძიება ან 100%-იანი ფასდაკლება) → გადახდის
       ნაბიჯები გამოტოვებულია და ადგილი მაშინვე დადასტურებულია */
    const isFree = amountTetri === 0;
    /* განვადებაზე ამონაწერშიც და SMS-შიც ჩანდეს, რომ ეს პირველი თვეა */
    const paidItemTitle = chosen.planMonths
      ? `${course.title} - პირველი თვე (1/${chosen.planMonths})`
      : course.title;
    const orderRef = await generateUniqueOrderRef(orderRefExists, "course");
  /* ეტაპი 5: ანალიტიკის თანხმობა ყიდვის მომენტში — შეკვეთას მიჰყვება,
     CAPI user_data მხოლოდ true-ზე გაიგზავნება */
  const analyticsConsent = await effectiveAnalyticsConsent();


    /* შესულ მომხმარებელზე ყიდვა პროფილს ებმება (სტუმარზე → null) */
    const profileId = await resolveProfileId({
      raw: formData.get("profileId"),
      fallback: { fullName: name, phone, email },
    });

    let bookingId: string | null = null;

    await db.transaction(async (tx) => {
      /* უფასოზე დუბლ-რეგისტრაციის race-დაცვა (ადრეული შემოწმება ზემოთაა):
         ერთი ნომრით ერთ ღონისძიებაზე ერთი ჯავშანი. ფასიანზე dedupe
         განზრახ არაა — pending-ს ადმინი აკურირებს */
      if (isFree) {
        const [dupe] = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(freeDupeCondition(course.id, phone))
          .limit(1);
        if (dupe) throw new AlreadyRegisteredError();
      }

      /* კაპასიტეტის ხელახალი დათვლა **ტრანზაქციაშივე** — race-ის თავიდან
         ასაცილებლად (availability-ის helper-ები module-scope db-ს იყენებენ) */
      if (course.capacity !== null) {
        const [row] = await tx
          .select({ n: count() })
          .from(bookings)
          .where(
            and(
              eq(bookings.itemType, "course"),
              eq(bookings.itemId, course.id),
              occupiesBookingCondition(),
            ),
          );
        if ((row?.n ?? 0) >= course.capacity) throw new SoldOutError();
      }

      const [created] = await tx
        .insert(bookings)
        .values({
          orderRef,
          itemType: "course",
          itemId: course.id,
          bookingDate: todayTbilisi(),
          startTime: "00:00",
          endTime: "00:00",
          buyerName: name,
          buyerEmail: email,
          buyerPhone: phone,
          profileId,
          childAge: parsed.data.childAge ?? null,
          amountGel: amountTetri,
          /* განვადება: თვეების რაოდენობა ჯავშანზე „იყინება“. monthsPaid/
             planNextDueAt default-ზე რჩება — pending-ზე ჯერ არაფერია გადახდილი */
          planMonths: chosen.planMonths,
          status: isFree ? "confirmed" : "pending",
          holdExpiresAt: isFree
            ? null
            : wantsCard
              ? cardHoldExpiry()
              : transferHoldExpiry(settings.transferHoldHours),
          termsAccepted: true,
          analyticsConsent,
          attribution,
        })
        .returning({ id: bookings.id });
      bookingId = created?.id ?? null;
    });

    let redirectUrl: string | null = null;
    if (wantsCard && !isFree) {
      redirectUrl = await startCardPayment({
        orderRef,
        amountTetri,
        description: paidItemTitle,
        email,
      });
      if (!redirectUrl) await clearHold(orderRef, "booking");
    }

    if (isFree) {
      await notifyRegistrationConfirmed({
        phone,
        email,
        name,
        orderRef,
        itemTitle: course.title,
        date: course.startDate
          ? formatDateKa(new Date(`${course.startDate}T12:00:00Z`))
          : null,
        ticket: bookingId
          ? {
              kind: "booking",
              id: bookingId,
              expiresAt: ticketExpiry({
                kind: "booking",
                itemType: "course",
                bookingDate: todayTbilisi(),
              }),
            }
          : null,
      });
    } else if (!redirectUrl) {
      await notifyOrderPending({
        phone,
        email,
        name,
        orderRef,
        amountTetri,
        itemTitle: paidItemTitle,
        bankRequisites: settings.bankRequisites,
      });
    }

    return {
      status: "success",
      order: {
        orderRef,
        amountTetri,
        standardTetri,
        discountPercent,
        planMonths: chosen.planMonths,
        planTotalTetri: chosen.planTotalTetri,
        title: course.title,
        /* free-ზე რეკვიზიტები success-ეკრანზე ვერასდროს გამოჩნდება */
        bankRequisites: isFree ? null : settings.bankRequisites,
        redirectUrl,
      },
    };
  } catch (error) {
    if (error instanceof SoldOutError) {
      return { status: "error", message: SOLD_OUT };
    }
    if (error instanceof AlreadyRegisteredError) {
      return { status: "error", message: ALREADY_REGISTERED };
    }
    console.error("[course-purchase] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}
