import "server-only";
import { serverEnv } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

/**
 * ტრანზაქციული ელფოსტა — Resend HTTP API (443 პორტი).
 *
 * ⚠ SMTP-ის ნაცვლად (2026-08-19): Railway ბლოკავს გამავალ SMTP-პორტებს
 * (25/465/587) spam-ის საწინააღმდეგოდ, ამიტომ nodemailer/SMTP იქიდან
 * `ETIMEDOUT (CONN)`-ს იძლევა — მეილი არასდროს გადიოდა. HTTP-API კი
 * (SMS/ubill-ის მსგავსად) 443-ზეა და მუშაობს. hostedemail (webmail/შემომავალი)
 * უცვლელი რჩება — ვცვლით მხოლოდ **გამგზავნ** არხს.
 *
 * `RESEND_API_KEY`-ის გარეშე no-op, არასდროს throw-ობს (sms.ts-ის პრინციპი).
 * `from`-ის დომენი Resend-ში დადასტურებული უნდა იყოს (youthspace.ge, DNS/DKIM).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** მეილის გაგზავნა კონფიგურირებულია? — ბარათის flittMode()-ის იგივე პრინციპი */
export function mailConfigured(): boolean {
  return Boolean(serverEnv().RESEND_API_KEY);
}

/**
 * ერთი წერილი. აბრუნებს true-ს მხოლოდ რეალურად გაგზავნისას
 * (no-op და ჩავარდნა false-ია, მაგრამ არასდროს throw-ობს).
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** დამატებითი SMTP-ჰედერები (მაგ. List-Unsubscribe დაგზავნისას) */
  headers?: Record<string, string>;
}): Promise<boolean> {
  const to = input.to.trim();
  if (!to || !to.includes("@")) return false;
  if (!input.subject.trim() || !input.text.trim()) return false;

  const { RESEND_API_KEY, MAIL_FROM, MAIL_REPLY_TO } = serverEnv();
  if (!RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      /* ტექსტიც იბეჭდება — ლოკალურად QR-ბილეთის ბმული მხოლოდ აქ ჩანს */
      console.info(`[mail:noop] → ${to}: ${input.subject}\n${input.text}`);
    }
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM || `${siteConfig.name} <${siteConfig.email}>`,
        reply_to: MAIL_REPLY_TO || siteConfig.email,
        to: [to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[mail] Resend HTTP ${response.status}: ${body.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[mail] გაგზავნა ჩავარდა", error);
    return false;
  }
}
