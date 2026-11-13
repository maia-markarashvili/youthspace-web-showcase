"use server";

import { effectiveAnalyticsConsent } from "@/lib/analytics-consent-server";
import { quizAttributionFromForm } from "@/lib/quiz-attribution";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { PurchaseState } from "@/components/purchase/types";
import { resolveProfileId } from "@/lib/auth/purchase-profile";
import { db } from "@/lib/db";
import {
  CapacityError,
  createClubSubscription,
} from "@/lib/db/mutations/club-subscription";
import { clubs } from "@/lib/db/schema";
import {
  cardHoldExpiry,
  clearHold,
  startCardPayment,
  transferHoldExpiry,
} from "@/lib/db/mutations/payment";
import { ReferralError } from "@/lib/db/mutations/referral";
import { getPricingSettings } from "@/lib/db/queries/availability";
import { flittMode } from "@/lib/flitt";
import { notifyOrderPending } from "@/lib/notify-customer";
import { transferOtpGate } from "@/lib/otp";
import { checkRateLimit, clientIp, clientKey } from "@/lib/rate-limit";

/**
 * კლუბის ყიდვა (offline გადახდა) — **ერთი კლუბი ერთ ყიდვაზე**:
 * ადგილი იჯავშნება მაშინვე status='pending'-ით; მყიდველი იღებს orderRef კოდს
 * და რეკვიზიტებს, გადარიცხვის შემდეგ ადმინი ადასტურებს. არასავალდებულო
 * მეგობრის კოდი ფასდაკლებას ყიდვისთანავე ადებს.
 *
 * მთელი ლოგიკა (ფასი მხოლოდ pricing_settings-იდან, კაპასიტეტი grace-ფანჯრით,
 * რეფერალი, ბონუს-პასი, ტრანზაქცია) საზიარო createClubSubscription-შია —
 * იგივეს იყენებს ადმინის ხელით დამატებაც (/admin/orders/new).
 */

const REQUIRED = "ეს ველი აუცილებელია";
const INVALID_EMAIL = "მიუთითეთ სწორი ელფოსტა";
const TOO_MANY = "ძალიან ბევრი მცდელობა - სცადეთ ერთ წუთში.";
const GENERIC_ERROR = "დროებითი შეფერხებაა - სცადეთ ხელახლა ან მოგვწერეთ.";
const CONSENT_TERMS = "წესებსა და პირობებზე თანხმობა აუცილებელია";
const CONSENT_PRIVACY =
  "პერსონალურ მონაცემთა დაცვის წესებზე თანხმობა აუცილებელია";
const AGE_INVALID = "მიუთითე სწორი ასაკი";
const AGE_REQUIRED = "ასაკის მითითება აუცილებელია";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

const purchaseSchema = z.object({
  clubId: z.uuid("არასწორი კლუბის იდენტიფიკატორი"),
  name: z.string().trim().min(2, REQUIRED).max(120),
  phone: z.string().trim().min(5, REQUIRED).max(40),
  email: z.email(INVALID_EMAIL),
  /* ასაკი მხოლოდ landing.askAge-იან კლუბზეა სავალდებულო — აქ optional,
     სავალდებულოობა კლუბის ჩატვირთვის მერე მოწმდება. preprocess აუცილებელია:
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
  referralCode: z.string().trim().max(24).optional().or(z.literal("")),
  /* არასწორი/არარსებული მნიშვნელობა → გადმორიცხვა (უსაფრთხო default) */
  payMethod: z.enum(["card", "transfer"]).catch("transfer"),
  /* Server Function პირდაპირი POST-ითაც მიწვდომადია — თანხმობა აქაც მოწმდება */
  agreeTerms: z.literal("on", CONSENT_TERMS),
  agreePrivacy: z.literal("on", CONSENT_PRIVACY),
});

export async function purchaseClub(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  if (formData.get("company_website")) return { status: "success" };

  /* ფართო კარიბჭე — შეცდომით შევსებული ფორმებიც შედის, flood-ის საწინააღმდეგოდ */
  const key = await clientKey("club-purchase");
  if (!checkRateLimit(key, { limit: 10 })) {
    return { status: "error", message: TOO_MANY };
  }

  const parsed = purchaseSchema.safeParse({
    clubId: formData.get("clubId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    childAge: formData.get("childAge"),
    referralCode: formData.get("referralCode"),
    payMethod: formData.get("payMethod"),
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

  /* მკაცრი კარიბჭე — მხოლოდ ვალიდურ განაცხადებზე, წუთში 2 ერთი IP-დან */
  if (!checkRateLimit(`valid:${key}`, { limit: 2 })) {
    return { status: "error", message: TOO_MANY };
  }

  const wantsCard = parsed.data.payMethod === "card" && flittMode() !== "off";

  /* ნომრის ფლობა დამტკიცდა? — მხოლოდ ასეთ ყიდვას ერგება დაგროვილი
     რეფერალური კრედიტი (ბარათით ყიდვა OTP-ს არ გადის, ე.ი. false) */
  let phoneProven = false;

  try {
    /* ადმინის ტოგლი: ამ კლუბზე ასაკი სავალდებულოა — OTP-კარიბჭემდე, რომ
       მომხმარებელმა პირველივე ნაბიჯზე შეავსოს */
    if (parsed.data.childAge === undefined) {
      const [clubRow] = await db
        .select({ landing: clubs.landing })
        .from(clubs)
        .where(and(eq(clubs.id, parsed.data.clubId), eq(clubs.isActive, true)))
        .limit(1);
      if (clubRow?.landing?.askAge === true) {
        return {
          status: "error",
          message: "შეამოწმეთ მონიშნული ველები.",
          errors: { childAge: AGE_REQUIRED },
        };
      }
    }

    /* ქვიზიდან მოსული? — hidden ველები; ბაზამდე მხოლოდ ვალიდური slug გადის */
    const attribution = quizAttributionFromForm(
      formData.get("src"),
      formData.get("quizClub"),
    );

    const settings = await getPricingSettings();

    /* OTP მხოლოდ გადმორიცხვაზე და მხოლოდ უცნობი ნომრისთვის (§4) - ბარათზე
       Flitt თავად აკავშირებს ბარათს, ცალკე დადასტურება ზედმეტია */
    if (!wantsCard) {
      const gate = await transferOtpGate({
        settings,
        phone: parsed.data.phone,
        ip: await clientIp(),
        resume: {
          clubId: parsed.data.clubId,
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email,
          referralCode: parsed.data.referralCode || "",
          payMethod: "transfer",
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
      phoneProven = gate.phoneProven;
    }

    /* შესულ მომხმარებელზე ყიდვა პროფილს ებმება (სტუმარზე → null) */
    const profileId = await resolveProfileId({
      raw: formData.get("profileId"),
      fallback: {
        fullName: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
      },
    });

    const result = await createClubSubscription({
      clubId: parsed.data.clubId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      profileId,
      childAge: parsed.data.childAge ?? null,
      phoneProven,
      status: "pending",
      referralCode: parsed.data.referralCode || null,
      /* საჯარო ფორმაზე თანხმობა ცხადად მოინიშნა (სქემამ დაადასტურა) */
      termsAccepted: true,
      analyticsConsent: await effectiveAnalyticsConsent(),
      attribution,
      holdExpiresAt: wantsCard
        ? cardHoldExpiry()
        : transferHoldExpiry(settings.transferHoldHours),
    });

    /* ბარათზე გადამისამართება; ჩავარდნისას ჰოლდი იხსნება და
       ყიდვა ჩვეულებრივ, გადმორიცხვის ნაკადში რჩება */
    let redirectUrl: string | null = null;
    if (wantsCard) {
      redirectUrl = await startCardPayment({
        orderRef: result.orderRef,
        amountTetri: result.amountGel,
        description: result.title,
        email: parsed.data.email,
      });
      if (!redirectUrl) await clearHold(result.orderRef, "subscription");
    }

    /* ბარათით გადახდისას „გადმორიცხე" შეტყობინება ზედმეტია */
    if (!redirectUrl) {
      await notifyOrderPending({
        phone: parsed.data.phone,
        email: parsed.data.email,
        name: parsed.data.name,
        orderRef: result.orderRef,
        amountTetri: result.amountGel,
        itemTitle: result.title,
        bankRequisites: result.bankRequisites,
      });
    }

    return {
      status: "success",
      message: "ჯავშანი მიღებულია!",
      order: {
        orderRef: result.orderRef,
        amountTetri: result.amountGel,
        standardTetri: result.standardTetri,
        title: result.title,
        bankRequisites: result.bankRequisites,
        appliedDiscountPercent: result.appliedDiscountPercent,
        redirectUrl,
      },
    };
  } catch (error) {
    if (error instanceof ReferralError) {
      return {
        status: "error",
        message: error.message,
        errors: { referralCode: error.message },
      };
    }
    if (error instanceof CapacityError) {
      return { status: "error", message: error.message };
    }
    console.error("[club-purchase] ჩავარდა", error);
    return { status: "error", message: GENERIC_ERROR };
  }
}
