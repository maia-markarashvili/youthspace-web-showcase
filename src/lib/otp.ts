import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { getAccount } from "@/lib/auth/account-session";
import { db } from "@/lib/db";
import { getSiteTexts } from "@/lib/db/queries/site-texts";
import {
  bookings,
  entryPasses,
  phoneVerifications,
  subscriptions,
  type PricingSettings,
} from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { maskPhone } from "@/lib/mask";
import { normalizePhoneDigits, toGeorgianMsisdn } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { REGISTRY, t } from "@/lib/site-texts";
import { fillTemplate, sendSms, smsConfigured } from "@/lib/sms";

/**
 * SMS-კოდით დადასტურება გადმორიცხვით ყიდვისას, **მხოლოდ უცნობი ნომრისთვის**
 * (§4) — არსებული (დადასტურებული) მომხმარებელი კოდს აღარ ითხოვს. ბარათით
 * გადახდაზე OTP საერთოდ არ ვრცელდება (Flitt თავად აკავშირებს ბარათს).
 *
 * ორსაფეხურიანი ნაკადი ერთი server action-ის შიგნით: პირველი გამოძახება
 * აგზავნის კოდს და აბრუნებს `status: "otp"`-ს + უკვე ვალიდირებულ
 * მნიშვნელობებს (`resume`); მეორე გამოძახება იმავე action-ს იმავე
 * `resume`-ს + `otpCode`-ს გადასცემს. სერვერი ორივეჯერ **ყველაფერს
 * თავიდან ვალიდაციას უკეთებს** — `resume` მხოლოდ UI-ის მოხერხებულობაა.
 */

const OTP_TTL_MINUTES = 10;
const TRUST_MINUTES = 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

export type OtpChallenge = {
  /** phone_verifications.id — step 2-ის hidden ველი */
  otpId: string;
  /** „5**** 22 33“ — ჩვენებისთვის, ნედლი ნომერი აქ არასდროსაა */
  phoneMasked: string;
  resendAfter: number;
  expiresAt: number;
  /** ვალიდირებული step-1 მნიშვნელობები, hidden input-ებად დასაბრუნებლად */
  resume: Record<string, string>;
};

export type OtpGateResult =
  /** `phoneProven` — ამ მოთხოვნაზე ნომრის **ფლობა** დამტკიცდა თუ არა.
   *  true მხოლოდ მაშინ, როცა კოდი რეალურად გაიარა (ან ბოლო 60 წუთში გაიარა,
   *  ან შესულია ამავე, დადასტურებული ნომრით). „ცნობილი მომხმარებელი"
   *  **არ** ითვლება: ნომრის ცოდნა ფლობა არ არის. */
  | { kind: "proceed"; phoneProven: boolean }
  | { kind: "challenge"; otp: OtpChallenge; fieldError?: string }
  | { kind: "blocked"; message: string };

/** ბარათის შეკვეთაზე ეს არასდროს გამოიძახება — მხოლოდ გადმორიცხვისას */
export function otpRequired(settings: PricingSettings): boolean {
  return settings.otpRequiredForTransfer && smsConfigured();
}

function hashCode(phone: string, code: string): string {
  const { SESSION_SECRET } = serverEnv();
  /* SESSION_SECRET ყოველთვის არსებობს admin-პანელისთვის საჭირო გარემოში;
     dev-ში ცარიელობისას მაინც სტაბილურ (თუმცა სუსტ) გასაღებს ვიყენებთ */
  return createHmac("sha256", SESSION_SECRET || "dev-only-insecure-fallback")
    .update(`${phone}:${code}`)
    .digest("hex");
}

/** SQL-ის იგივე პატერნი, რაც availability.ts-ის memberClubIdsForPhone-ს აქვს */
function phoneColMatches(column: unknown, digits: string) {
  return sql`right(regexp_replace(${column}, '\\D', '', 'g'), 9) = ${digits}`;
}

/**
 * უცნობი თუ არა — აქტიური წევრობა/დადასტურებული ჯავშანი/აქტიური პასი.
 * ⚠ `pending` არასდროს იძლევა გამონაკლისს — სწორედ pending-ია ის, რასაც
 * სპამერი ქმნის; ამ წესის შერბილება OTP-ის მთელ აზრს გააქარწყლებდა.
 */
export async function phoneIsKnownCustomer(phone: string): Promise<boolean> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length !== 9) return false;

  const [activeSub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        phoneColMatches(subscriptions.subscriberPhone, digits),
      ),
    )
    .limit(1);
  if (activeSub) return true;

  const [confirmedBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        phoneColMatches(bookings.buyerPhone, digits),
      ),
    )
    .limit(1);
  if (confirmedBooking) return true;

  const [activePass] = await db
    .select({ id: entryPasses.id })
    .from(entryPasses)
    .where(
      and(
        eq(entryPasses.status, "active"),
        phoneColMatches(entryPasses.buyerPhone, digits),
      ),
    )
    .limit(1);
  return !!activePass;
}

/** ბოლო 60 წუთში დადასტურებული ნომერი — მეორე ნივთის ყიდვისას SMS აღარ იხარჯება */
export async function phoneTrusted(phone: string): Promise<boolean> {
  const digits = normalizePhoneDigits(phone);
  const [row] = await db
    .select({ id: phoneVerifications.id })
    .from(phoneVerifications)
    .where(
      and(
        eq(phoneVerifications.phone, digits),
        gt(phoneVerifications.trustedUntil, new Date()),
      ),
    )
    .limit(1);
  return !!row;
}

/** დისციპლინა: ცარიელი, {code}-ის გარეშე ან ფაქტობრივად კოდის არ-შემცველი
 *  ტექსტი → default-ს უბრუნდება. ეს SMS არასდროს გამოირთვება. */
async function otpSmsBody(code: string): Promise<string> {
  const fallback =
    REGISTRY["sms.otp.code"]?.default ??
    "სივრცე: დადასტურების კოდი {code}. მოქმედებს 10 წუთი.";
  const texts = await getSiteTexts();
  const raw = t(texts, "sms.otp.code");

  if (!raw.trim() || raw === "sms.otp.code" || !raw.includes("{code}")) {
    return fillTemplate(fallback, { code });
  }
  const body = fillTemplate(raw, { code });
  return body.includes(code) ? body : fillTemplate(fallback, { code });
}

type StartResult =
  | { ok: true; otpId: string; resendAfter: number; expiresAt: number }
  | { ok: false; reason: "throttled" | "invalid_phone" | "send_failed" };

/** ახალი კოდის გაგზავნა — per-phone/per-IP დამცავებით და lazy-prune-ით */
async function startPhoneVerification(input: {
  phone: string;
  ip: string;
}): Promise<StartResult> {
  const digits = normalizePhoneDigits(input.phone);
  const msisdn = toGeorgianMsisdn(input.phone);
  if (!msisdn) return { ok: false, reason: "invalid_phone" };

  /* lazy prune — cron არ გვაქვს; ნდობის ფანჯარაშიც რომ იყოს, არ ვშლით */
  await db
    .delete(phoneVerifications)
    .where(
      and(
        sql`${phoneVerifications.createdAt} < now() - interval '2 days'`,
        sql`(${phoneVerifications.trustedUntil} is null or ${phoneVerifications.trustedUntil} < now())`,
      ),
    );

  const [lastByPhone] = await db
    .select({ createdAt: phoneVerifications.createdAt })
    .from(phoneVerifications)
    .where(eq(phoneVerifications.phone, digits))
    .orderBy(desc(phoneVerifications.createdAt))
    .limit(1);
  if (
    lastByPhone &&
    Date.now() - lastByPhone.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return { ok: false, reason: "throttled" };
  }

  const [recentByPhone] = await db
    .select({ n: count() })
    .from(phoneVerifications)
    .where(
      and(
        eq(phoneVerifications.phone, digits),
        sql`${phoneVerifications.createdAt} > now() - interval '15 minutes'`,
      ),
    );
  if ((recentByPhone?.n ?? 0) >= 3) return { ok: false, reason: "throttled" };

  const [recentByIp] = await db
    .select({ n: count() })
    .from(phoneVerifications)
    .where(
      and(
        eq(phoneVerifications.ip, input.ip),
        sql`${phoneVerifications.createdAt} > now() - interval '1 hour'`,
      ),
    );
  if ((recentByIp?.n ?? 0) >= 10) return { ok: false, reason: "throttled" };

  const code = String(randomInt(100_000, 1_000_000));
  const body = await otpSmsBody(code);
  /* otp:true — ubill-თან უმაღლესი პრიორიტეტი; მომხმარებელი ეკრანთან ელოდება */
  const sent = await sendSms(msisdn, body, { otp: true });
  if (!sent) return { ok: false, reason: "send_failed" };

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  const [row] = await db
    .insert(phoneVerifications)
    .values({
      phone: digits,
      codeHash: hashCode(digits, code),
      expiresAt,
      ip: input.ip,
    })
    .returning({ id: phoneVerifications.id });
  if (!row) return { ok: false, reason: "send_failed" };

  return {
    ok: true,
    otpId: row.id,
    resendAfter: Date.now() + RESEND_COOLDOWN_MS,
    expiresAt: expiresAt.getTime(),
  };
}

type RedeemResult =
  | { status: "ok" }
  | { status: "wrong"; expiresAt: number; resendAfter: number }
  | { status: "dead" }
  | { status: "phone_mismatch" };

/**
 * ერთი ატომური UPDATE — ორმაგი დაჭერა ვერაფერს გააფუჭებს. წარმატებაზე
 * `trustedUntil`-ს დაუყოვნებლივ აყენებს, რომ ჩაწერის ჩავარდნაზეც ხელახლა
 * ცდას SMS აღარ დასჭირდეს.
 */
async function redeemPhoneVerification(input: {
  otpId: string;
  phone: string;
  code: string;
}): Promise<RedeemResult> {
  const digits = normalizePhoneDigits(input.phone);

  const [row] = await db
    .select({
      phone: phoneVerifications.phone,
      expiresAt: phoneVerifications.expiresAt,
      createdAt: phoneVerifications.createdAt,
    })
    .from(phoneVerifications)
    .where(eq(phoneVerifications.id, input.otpId))
    .limit(1);
  if (!row) return { status: "dead" };
  if (row.phone !== digits) return { status: "phone_mismatch" };

  const codeHash = hashCode(digits, input.code.trim());
  const [updated] = await db
    .update(phoneVerifications)
    .set({
      verifiedAt: new Date(),
      trustedUntil: new Date(Date.now() + TRUST_MINUTES * 60_000),
    })
    .where(
      and(
        eq(phoneVerifications.id, input.otpId),
        eq(phoneVerifications.phone, digits),
        eq(phoneVerifications.codeHash, codeHash),
        sql`${phoneVerifications.verifiedAt} is null`,
        sql`${phoneVerifications.expiresAt} > now()`,
        sql`${phoneVerifications.attempts} < ${MAX_ATTEMPTS}`,
      ),
    )
    .returning({ id: phoneVerifications.id });
  if (updated) return { status: "ok" };

  const [bumped] = await db
    .update(phoneVerifications)
    .set({ attempts: sql`${phoneVerifications.attempts} + 1` })
    .where(eq(phoneVerifications.id, input.otpId))
    .returning({ attempts: phoneVerifications.attempts });

  if (!bumped || bumped.attempts >= MAX_ATTEMPTS) return { status: "dead" };
  return {
    status: "wrong",
    expiresAt: row.expiresAt.getTime(),
    resendAfter: row.createdAt.getTime() + RESEND_COOLDOWN_MS,
  };
}

const BLOCKED_MESSAGES: Record<
  Exclude<StartResult, { ok: true }>["reason"],
  string
> = {
  invalid_phone: "ტელეფონის ნომერი არასწორია.",
  throttled: "კოდი უკვე გაიგზავნა - სცადე ცოტა ხანში, ან აირჩიე ბარათით გადახდა.",
  send_failed:
    "კოდი ვერ გაიგზავნა - სცადე ხელახლა ან გააგრძელე ბარათით გადახდა.",
};

/**
 * შესული (დადასტურებული) მომხმარებელი კოდს აღარ ითხოვს (§20) — ანგარიში
 * `active` ხდება მხოლოდ მეილის ან ტელეფონის დადასტურების შემდეგ, ანუ ზუსტად
 * ის შემოწმება, რასაც OTP ემსახურება, უკვე გავლილია. სტუმარზე ეს არ ვრცელდება:
 * ყიდვის SMS ფორმაში **ჩაწერილ** ნომერზე მიდის და `pending` ადგილს იჭერს,
 * ამიტომ ანონიმური მოთხოვნა კოდით რჩება დაცული.
 *
 * ⚠ ლიმიტი: ერთი ანგარიშიდან საათში 5 გამოტოვება. ამოწურვისას **არ ვბლოკავთ** —
 * ჩვეულებრივ OTP-ზე ბრუნდება. ეს ზღუდავს იაფად შექმნილი ანგარიშით SMS-ის
 * მასობრივ დაგზავნას (ხარჯი მფლობელისაა), ბოროტმოქმედება კი ანგარიშზეა მიბმული
 * და მფლობელს გამორთვა შეუძლია.
 */
async function accountVerifiedBypass(
  phone: string,
): Promise<{ phoneProven: boolean } | null> {
  const account = await getAccount();
  if (!account || account.status !== "active") return null;
  if (
    !checkRateLimit(`otp-skip:${account.accountId}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
  ) {
    return null;
  }

  /* ნომრის ფლობა მხოლოდ მაშინაა დამტკიცებული, თუ ანგარიშს ეს **კონკრეტული**
     ნომერი აქვს დადასტურებული. სხვისი ნომრით ყიდვისას კოდი აღარ ეკითხება
     (UX), მაგრამ ნომერზე მიბმული უფლებები (რეფერალური კრედიტი) არ ერგება. */
  const proven =
    account.phoneVerifiedAt !== null &&
    !!account.phone &&
    normalizePhoneDigits(account.phone) === normalizePhoneDigits(phone);

  return { phoneProven: proven };
}

/**
 * საერთო ფენა გადმორიცხვის OTP-გეიტების (`transferOtpGate`, §4) ქვეშ —
 * განსხვავებულია მხოლოდ "საჭიროა თუ არა" პირობა, ორივეს იგივე known-customer/
 * 60-წუთიანი trust bypass და SMS-გაგზავნის/გადამოწმების ლოგიკა აქვს.
 */
async function phoneVerificationGate(input: {
  required: boolean;
  phone: string;
  ip: string;
  resume: Record<string, string>;
  otpId?: string;
  otpCode?: string;
}): Promise<OtpGateResult> {
  if (!input.required) return { kind: "proceed", phoneProven: false };

  const bypass = await accountVerifiedBypass(input.phone);
  if (bypass) return { kind: "proceed", phoneProven: bypass.phoneProven };

  /* ⚠ „ცნობილი ნომერი" ფლობას **არ** ამტკიცებს — ნომრის ცოდნა საკმარისია */
  if (await phoneIsKnownCustomer(input.phone)) {
    return { kind: "proceed", phoneProven: false };
  }
  /* ბოლო 60 წუთში კოდი რეალურად გაიარა → ფლობა დამტკიცებულია */
  if (await phoneTrusted(input.phone)) {
    return { kind: "proceed", phoneProven: true };
  }

  if (input.otpId && input.otpCode) {
    const result = await redeemPhoneVerification({
      otpId: input.otpId,
      phone: input.phone,
      code: input.otpCode,
    });
    /* კოდი სწორად შეიყვანა — ნომრის ფლობა ახლახან დამტკიცდა */
    if (result.status === "ok") return { kind: "proceed", phoneProven: true };
    if (result.status === "wrong") {
      return {
        kind: "challenge",
        fieldError: "კოდი არასწორია - სცადე ხელახლა.",
        otp: {
          otpId: input.otpId,
          phoneMasked: maskPhone(input.phone),
          resendAfter: result.resendAfter,
          expiresAt: result.expiresAt,
          resume: input.resume,
        },
      };
    }
    /* "dead" (ცდები ამოეწურა/ვადა გავიდა/უკვე გამოყენებულია) და
       "phone_mismatch" (კოდი სხვა ნომერზე მოვიდა) ორივე ახალი კოდის
       გაგზავნით წყდება - ქვემოთ გრძელდება */
  }

  const started = await startPhoneVerification({ phone: input.phone, ip: input.ip });
  if (!started.ok) {
    return { kind: "blocked", message: BLOCKED_MESSAGES[started.reason] };
  }
  return {
    kind: "challenge",
    otp: {
      otpId: started.otpId,
      phoneMasked: maskPhone(input.phone),
      resendAfter: started.resendAfter,
      expiresAt: started.expiresAt,
      resume: input.resume,
    },
  };
}

/**
 * ერთადერთი შესასვლელი, რომელსაც ყიდვის action-ები იძახებენ. `resume`
 * step-1-ის უკვე ვალიდირებული (zod-ით გატარებული) ველებია — ისევე
 * გადაეცემა ფორმას, რომ hidden input-ებად დაბრუნდეს.
 */
export async function transferOtpGate(input: {
  settings: PricingSettings;
  phone: string;
  ip: string;
  resume: Record<string, string>;
  otpId?: string;
  otpCode?: string;
}): Promise<OtpGateResult> {
  return phoneVerificationGate({ ...input, required: otpRequired(input.settings) });
}
