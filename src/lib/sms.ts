import "server-only";
import { serverEnv } from "@/lib/env";
import { maskPhone } from "@/lib/mask";
import { toGeorgianMsisdn } from "@/lib/phone";

/**
 * SMS-შეტყობინებები ubill.dev-ის API-ით.
 *
 * Fire-and-forget — ჩავარდნა მომხმარებლის ნაკადს **არ ბლოკავს** (ყიდვა უკვე
 * შესრულებულია; SMS მხოლოდ მოხერხებულობაა). `UBILL_API_KEY`/`UBILL_BRAND_ID`-ის
 * არარსებობისას no-op-ია, ამიტომ credentials-ის მოსვლამდე აპლიკაცია სრულად
 * მუშაობს — გასაღების ჩასმისთანავე კი შეტყობინებები ავტომატურად ირთვება.
 *
 * ხარჯის კონტროლი: თითო შეტყობინების ტექსტი site_texts-შია (sms.*) და
 * ადმინიდან რედაქტირდება. **ცარიელი ტექსტი = ეს SMS არ იგზავნება** —
 * ანუ ჩართვა/გამორთვა ადმინის პანელიდან ხდება, კოდის ცვლილების გარეშე.
 */

const API_URL = "https://api.ubill.dev/v1/sms/send";

/** UBILL_API_KEY/UBILL_BRAND_ID არსებობს? — flittMode()-ის იგივე პრინციპი */
export function smsConfigured(): boolean {
  const { UBILL_API_KEY, UBILL_BRAND_ID } = serverEnv();
  return Boolean(UBILL_API_KEY && UBILL_BRAND_ID);
}

/** ubill-ის statusID → ადამიანური მიზეზი (ლოგისთვის) */
const STATUS_MESSAGES: Record<number, string> = {
  0: "გაიგზავნა",
  10: "brandID ვერ მოიძებნა",
  20: "ნომრები ვერ მოიძებნა",
  30: "ტექსტი ცარიელია",
  40: "SMS ბალანსი არ არის საკმარისი",
  50: "ვალიდური ნომრები ვერ მოიძებნა",
  60: "sendTime-ის ფორმატი არასწორია",
  90: "JSON შეცდომა",
  99: "ზოგადი შეცდომა",
};

/**
 * შაბლონში {ცვლადების} ჩასმა — site_texts-ის იმავე კონვენციით, რაც
 * membership.referral.body-ს {percent}-ს აქვს.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (text, [token, value]) => text.replaceAll(`{${token}}`, value),
    template,
  );
}

/** გაგზავნის დეტალური შედეგი — ადმინის დიაგნოსტიკისთვის (ubill statusID/მიზეზი) */
export type SmsResult = {
  ok: boolean;
  /** ubill statusID (0 = გაიგზავნა), თუ API-მდე მივედით */
  statusID?: number;
  /** ადამიანური მიზეზი (წარუმატებლობისას) */
  reason?: string;
};

/** გაგზავნის დამატებითი პარამეტრები (ubill API) */
export type SmsOptions = {
  /** ერთჯერადი კოდი — ubill-თან უმაღლესი პრიორიტეტით მუშავდება.
   *  მხოლოდ ავთენტიფიკაციისთვის (აქტივაცია, პაროლის აღდგენა, ყიდვის დასტური). */
  otp?: boolean;
};

/**
 * ერთი SMS ერთ ნომერზე, **დეტალური შედეგით**. არასდროს throw-ობს.
 * `sendSms` ამის თხელი wrapper-ია (მხოლოდ `.ok`), ამიტომ არსებული
 * გამომძახებლები უცვლელია; დიაგნოსტიკა (admin Test) ამ ფუნქციას იყენებს.
 */
export async function sendSmsDetailed(
  phone: string,
  text: string,
  options?: SmsOptions,
): Promise<SmsResult> {
  const { UBILL_API_KEY, UBILL_BRAND_ID } = serverEnv();

  const body = text.trim();
  /* ცარიელი შაბლონი = ადმინმა ეს შეტყობინება გამორთო */
  if (!body) return { ok: false, reason: "ტექსტი ცარიელია (შაბლონი გამორთულია)" };

  const number = toGeorgianMsisdn(phone);
  if (!number) {
    /* PII: ლოგში ტელეფონი დანიღბულია */
    console.error(
      `[sms] ნომერი არავალიდურია, გაგზავნა გამოტოვდა: ${maskPhone(phone)}`,
    );
    return { ok: false, reason: "ნომერი არავალიდურია (995XXXXXXXXX ფორმატი)" };
  }

  if (!UBILL_API_KEY || !UBILL_BRAND_ID) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms:noop] → ${number}: ${body}`);
    }
    return {
      ok: false,
      reason: "SMS არ არის კონფიგურირებული (UBILL_API_KEY/UBILL_BRAND_ID აკლია)",
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        key: UBILL_API_KEY,
      },
      body: JSON.stringify({
        brandID: Number(UBILL_BRAND_ID),
        numbers: [number],
        text: body,
        /* ⚠ მხოლოდ ავთენტიფიკაციის კოდებზე — ubill-ის დოკუმენტაცია აფრთხილებს,
           რომ არასწორი გამოყენება მიწოდების შეზღუდვას იწვევს */
        ...(options?.otp ? { otp: true } : {}),
      }),
      /* ჩავარდნა UX-ს არ ბლოკავს */
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(`[sms] HTTP ${response.status} → ${maskPhone(number)}`);
      return { ok: false, reason: `ubill HTTP შეცდომა (${response.status})` };
    }

    const result = (await response.json()) as {
      statusID?: number;
      smsID?: number;
      message?: string;
    };

    if (result.statusID !== 0) {
      const reason =
        STATUS_MESSAGES[result.statusID ?? -1] ?? result.message ?? "უცნობი";
      console.error(`[sms] ვერ გაიგზავნა (${result.statusID}): ${reason}`);
      return { ok: false, statusID: result.statusID, reason };
    }

    return { ok: true, statusID: 0 };
  } catch (error) {
    console.error("[sms] გაგზავნა ჩავარდა", error);
    return { ok: false, reason: "ქსელის შეცდომა ან timeout (8წმ)" };
  }
}

/**
 * ერთი SMS ერთ ნომერზე. აბრუნებს true-ს მხოლოდ რეალურად გაგზავნისას
 * (no-op და ჩავარდნა false-ია, მაგრამ არასდროს throw-ობს).
 */
export async function sendSms(
  phone: string,
  text: string,
  options?: SmsOptions,
): Promise<boolean> {
  return (await sendSmsDetailed(phone, text, options)).ok;
}
