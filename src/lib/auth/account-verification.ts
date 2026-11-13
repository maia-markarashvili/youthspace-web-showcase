import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountVerifications } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { sendMail } from "@/lib/mail";
import { renderEmailHtml } from "@/lib/mail-template";
import { toGeorgianMsisdn } from "@/lib/phone";
import { siteConfig } from "@/lib/site-config";
import { sendSms } from "@/lib/sms";

/**
 * ანგარიშის ერთჯერადი კოდები (აქტივაცია / პაროლის აღდგენა / არხის ცვლილება) —
 * otp.ts-ის იგივე დისციპლინა account_verifications ცხრილზე:
 *  · ნედლი კოდი არასდროს ინახება (HMAC-SHA256), მაქს. 5 ცდა, TTL 15 წთ
 *  · per-account/per-IP დამცავები + lazy prune (cron არ გვაქვს)
 *  · redeem ერთი ატომური UPDATE-ია — ორმაგი დაჭერა ვერაფერს გააფუჭებს
 *
 * ⚠ **ერთი კოდი — ერთი არხი** (უსაფრთხოების აუდიტის შემდეგ, 2026-08-18).
 * ადრე კოდი ერთდროულად ორივე არხზე იგზავნებოდა და მისი შეყვანა მეილის
 * დადასტურებად ითვლებოდა. ეს მცდარი იყო: კოდის ფლობა **არაფერს ამტკიცებს
 * იმ არხზე, რომელიც ადამიანს არ წაუკითხავს**. თავდამსხმელი სხვის მეილს
 * თავის ნომერზე დაარეგისტრირებდა, კოდს SMS-ით მიიღებდა და სისტემა უცხო
 * მეილს დადასტურებულად ჩათვლიდა — სწორედ ეს დროშა კი კაბინეტში ძველ
 * (profile_id IS NULL) ყიდვებს ხსნის.
 *
 * ახლა: ჯერ **მეილი** (ანგარიშის უნიკალური იდენტიფიკატორი); მხოლოდ მისი
 * ჩავარდნისას — SMS. ერთდროულად ორივეზე არასდროს. შესაბამისად დასტურდება
 * ზუსტად ის ერთი არხი, რომლითაც კოდი რეალურად გავიდა.
 */

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

export type VerificationPurpose =
  | "activate"
  | "password_reset"
  | "phone_change"
  | "email_change";

/** HMAC-გასაღები კოდებისა და phone-key-ებისთვის — session.ts-ის იგივე fail-closed
 *  წესი: SESSION_SECRET-ის გარეშე შეცდომა (ადრე ჩუმად public fallback-ს იყენებდა) */
function verificationSecret(): string {
  const { SESSION_SECRET } = serverEnv();
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET აუცილებელია (account-verification)");
  }
  return SESSION_SECRET;
}

function hashCode(accountId: string, purpose: string, code: string): string {
  return createHmac("sha256", verificationSecret())
    .update(`${accountId}:${purpose}:${code}`)
    .digest("hex");
}

/** მიწოდების ტექსტები — user-visible: მოკლე ტირე, em dash არასდროს */
const SMS_TEXTS: Record<VerificationPurpose, (code: string) => string> = {
  activate: (code) =>
    `სივრცე: ანგარიშის დადასტურების კოდი ${code}. მოქმედებს 15 წუთი.`,
  password_reset: (code) =>
    `სივრცე: პაროლის აღდგენის კოდი ${code}. მოქმედებს 15 წუთი.`,
  phone_change: (code) =>
    `სივრცე: ნომრის დადასტურების კოდი ${code}. მოქმედებს 15 წუთი.`,
  email_change: (code) =>
    `სივრცე: ელფოსტის ცვლილების კოდი ${code}. მოქმედებს 15 წუთი.`,
};

const MAIL_SUBJECTS: Record<VerificationPurpose, string> = {
  activate: "სივრცე - ანგარიშის დადასტურება",
  password_reset: "სივრცე - პაროლის აღდგენა",
  phone_change: "სივრცე - ნომრის დადასტურება",
  email_change: "სივრცე - ელფოსტის ცვლილება",
};

function mailBody(purpose: VerificationPurpose, code: string): string {
  const action =
    purpose === "password_reset"
      ? "პაროლის აღსადგენად შეიყვანე ეს კოდი"
      : "დასადასტურებლად შეიყვანე ეს კოდი";
  return [
    "გამარჯობა!",
    "",
    `${action}: ${code}`,
    "კოდი მოქმედებს 15 წუთი.",
    "",
    "თუ ეს შენ არ ყოფილხარ, უბრალოდ უგულებელყავი ეს წერილი.",
    "",
    "სივრცე · youthspace.ge",
  ].join("\n");
}

/**
 * SMS-fallback-ის per-**ნომრის** მუხრუჭი (§ აუდიტი): IP-ლიმიტი აქ არ გამოდგება,
 * რადგან IP თავდამსხმელის კონტროლშია, ნომერი კი — მსხვერპლის. ერთსა და იმავე
 * ნომერზე დღეში მაქს. 3 კოდი, ვისი ანგარიშიდანაც არ უნდა იყოს მოთხოვნა.
 * ნომერი ბაზაში ღიად არ ინახება — ვწერთ HMAC-ს (იგივე გასაღები, რაც კოდებს).
 */
const SMS_FALLBACK_DAILY_CAP = 3;

async function smsAllowedForPhone(msisdn: string): Promise<boolean> {
  const phoneKey = createHmac("sha256", verificationSecret())
    .update(`phone:${msisdn}`)
    .digest("hex");

  const [row] = await db
    .select({ n: count() })
    .from(accountVerifications)
    .where(
      and(
        eq(accountVerifications.smsPhoneKey, phoneKey),
        sql`${accountVerifications.createdAt} > now() - interval '24 hours'`,
      ),
    );
  if ((row?.n ?? 0) >= SMS_FALLBACK_DAILY_CAP) {
    console.warn("[account-code] SMS-ის დღიური ლიმიტი ამოიწურა ამ ნომერზე");
    return false;
  }
  return true;
}

/** ჩაწერისთვის — იგივე HMAC, რაც ლიმიტის დათვლისას */
function phoneKeyFor(msisdn: string | null): string | null {
  if (!msisdn) return null;
  return createHmac("sha256", verificationSecret())
    .update(`phone:${msisdn}`)
    .digest("hex");
}

export type SendCodeResult =
  | { ok: true; emailSent: boolean; smsSent: boolean }
  | { ok: false; reason: "throttled" | "not_delivered" };

/**
 * კოდის შექმნა + გაგზავნა ორივე არხზე. აბრუნებს რომელი არხით გავიდა
 * რეალურად; ორივეს ჩავარდნისას (მაგ. SMTP/SMS გამორთულია) — not_delivered,
 * dev-ში კი კოდი კონსოლში იწერება ლოკალური ტესტისთვის.
 */
export async function sendAccountCode(input: {
  accountId: string;
  purpose: VerificationPurpose;
  email: string;
  phone: string | null;
  ip: string;
}): Promise<SendCodeResult> {
  /* lazy prune — ვადაგასული/გამოყენებული 2 დღის შემდეგ იშლება */
  await db
    .delete(accountVerifications)
    .where(sql`${accountVerifications.createdAt} < now() - interval '2 days'`);

  const [last] = await db
    .select({ createdAt: accountVerifications.createdAt })
    .from(accountVerifications)
    .where(
      and(
        eq(accountVerifications.accountId, input.accountId),
        eq(accountVerifications.purpose, input.purpose),
      ),
    )
    .orderBy(desc(accountVerifications.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "throttled" };
  }

  const [recentByAccount] = await db
    .select({ n: count() })
    .from(accountVerifications)
    .where(
      and(
        eq(accountVerifications.accountId, input.accountId),
        sql`${accountVerifications.createdAt} > now() - interval '15 minutes'`,
      ),
    );
  if ((recentByAccount?.n ?? 0) >= 3) return { ok: false, reason: "throttled" };

  const [recentByIp] = await db
    .select({ n: count() })
    .from(accountVerifications)
    .where(
      and(
        eq(accountVerifications.ip, input.ip),
        sql`${accountVerifications.createdAt} > now() - interval '1 hour'`,
      ),
    );
  if ((recentByIp?.n ?? 0) >= 10) return { ok: false, reason: "throttled" };

  const code = String(randomInt(100_000, 1_000_000));

  const text = mailBody(input.purpose, code);
  const emailSent = await sendMail({
    to: input.email,
    subject: MAIL_SUBJECTS[input.purpose],
    text,
    /* იგივე ბრენდირებული გარსი, რაც ყიდვის წერილებს აქვს (notify-customer.ts) */
    html: renderEmailHtml({
      body: text,
      siteUrl: siteConfig.url,
      footer: `${siteConfig.name} · ${siteConfig.phone}\nეს წერილი ავტომატურადაა გაგზავნილი შენი ანგარიშის გამო.`,
    }),
  });

  /* SMS **მხოლოდ მაშინ**, თუ მეილი ვერ გავიდა (SMTP გამორთულია/ჩავარდა).
     ეს ერთდროულად ხურავს ორ ხვრელს: (1) არხის მცდარ დადასტურებას და
     (2) რეგისტრაციის უფასო SMS-რელედ გამოყენებას უცხო ნომრებზე. */
  let smsSent = false;
  if (!emailSent) {
    const msisdn = input.phone ? toGeorgianMsisdn(input.phone) : null;
    if (msisdn && (await smsAllowedForPhone(msisdn))) {
      /* otp:true — ავთენტიფიკაციის კოდი, ubill-თან უმაღლესი პრიორიტეტით */
      smsSent = await sendSms(msisdn, SMS_TEXTS[input.purpose](code), {
        otp: true,
      });
    }
  }

  /* dev-ში SMTP/SMS გამორთულია — კოდი კონსოლში იბეჭდება და მეილის არხად
     ითვლება, რომ ლოკალური ტესტი production-ის იდენტურად იქცეოდეს
     (production-ში ეს ტოტი არასდროს სრულდება: კოდი ლოგში არ ჩანს და
     მიუწოდებელი კოდი საერთოდ არ ინახება) */
  let deliveredByEmail = emailSent;
  if (!emailSent && !smsSent) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[account-code:dev] ${input.purpose} → ${code}`);
      deliveredByEmail = true;
    } else {
      return { ok: false, reason: "not_delivered" };
    }
  }

  await db.insert(accountVerifications).values({
    accountId: input.accountId,
    purpose: input.purpose,
    codeHash: hashCode(input.accountId, input.purpose, code),
    emailSent: deliveredByEmail,
    smsSent,
    /* per-ნომრის ლიმიტის მთვლელი; მხოლოდ მაშინ, როცა SMS მართლა გავიდა */
    smsPhoneKey: smsSent ? phoneKeyFor(toGeorgianMsisdn(input.phone ?? "")) : null,
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    ip: input.ip,
  });

  return { ok: true, emailSent: deliveredByEmail, smsSent };
}

export type RedeemCodeResult =
  | { status: "ok"; emailSent: boolean; smsSent: boolean }
  | { status: "wrong" }
  | { status: "dead" };

/**
 * ერთი ატომური UPDATE — consumed/expired/attempts პირობებით. წარმატებაზე
 * აბრუნებს, რომელი არხით იყო კოდი გაგზავნილი (verified-დროშების ზუსტი
 * მინიჭებisთვის: ორივე არხზე გაგზავნილი კოდი მხოლოდ მეილს ადასტურებს).
 */
export async function redeemAccountCode(input: {
  accountId: string;
  purpose: VerificationPurpose;
  code: string;
}): Promise<RedeemCodeResult> {
  const codeHash = hashCode(input.accountId, input.purpose, input.code.trim());

  const [updated] = await db
    .update(accountVerifications)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(accountVerifications.accountId, input.accountId),
        eq(accountVerifications.purpose, input.purpose),
        eq(accountVerifications.codeHash, codeHash),
        sql`${accountVerifications.consumedAt} is null`,
        sql`${accountVerifications.expiresAt} > now()`,
        sql`${accountVerifications.attempts} < ${MAX_ATTEMPTS}`,
      ),
    )
    .returning({
      emailSent: accountVerifications.emailSent,
      smsSent: accountVerifications.smsSent,
    });
  if (updated) {
    return { status: "ok", emailSent: updated.emailSent, smsSent: updated.smsSent };
  }

  /* არასწორი კოდი — ცდების მთვლელი ბოლო ცოცხალ ჩანაწერზე იზრდება */
  const [live] = await db
    .select({ id: accountVerifications.id, attempts: accountVerifications.attempts })
    .from(accountVerifications)
    .where(
      and(
        eq(accountVerifications.accountId, input.accountId),
        eq(accountVerifications.purpose, input.purpose),
        sql`${accountVerifications.consumedAt} is null`,
        sql`${accountVerifications.expiresAt} > now()`,
      ),
    )
    .orderBy(desc(accountVerifications.createdAt))
    .limit(1);
  if (!live) return { status: "dead" };

  const [bumped] = await db
    .update(accountVerifications)
    .set({ attempts: sql`${accountVerifications.attempts} + 1` })
    .where(eq(accountVerifications.id, live.id))
    .returning({ attempts: accountVerifications.attempts });

  if (!bumped || bumped.attempts >= MAX_ATTEMPTS) return { status: "dead" };
  return { status: "wrong" };
}
