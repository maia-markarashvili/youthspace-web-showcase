import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { serverEnv } from "@/lib/env";
import { toGel } from "@/lib/money";
import { toGeorgianMsisdn } from "@/lib/phone";
import { purchasePixelMeta } from "@/lib/pixel-meta";
import { siteConfig } from "@/lib/site-config";

/**
 * Meta Conversions API — სერვერული Purchase-ივენთი.
 *
 * რატომ: ბრაუზერის პიქსელი Purchase-ს ისვრის მხოლოდ ბარათით გადახდაზე
 * (/payment/status). გადმორიცხვით გაყიდვა ადმინის დადასტურებით სრულდება,
 * ბრაუზერის მიღმა — Meta-სთვის სრულიად უხილავი იქნებოდა. აქედან იგზავნება
 * ორივე გზა (Flitt-callback + ადმინი) confirm-order.ts-ის საერთო წერტილიდან.
 *
 * დედუპლიკაცია: event_id = `purchase-<orderRef>` — ბრაუზერის TrackPurchase-ის
 * იდენტური (meta-pixel.tsx), Meta ორივეს ერთ კონვერსიად თვლის.
 *
 * `META_CAPI_ACCESS_TOKEN`-ის გარეშე no-op, არასდროს throw-ობს (mail.ts-ის
 * პრინციპი) — გასაღები მხოლოდ Railway-შია, ლოკალურად ლოგი იბეჭდება.
 * `META_CAPI_TEST_CODE` (დროებითი, Events Manager → Test Events-ის კოდი) —
 * ივენთები მხოლოდ ტესტ-ტაბში ჩანს; შემოწმების შემდეგ ცვლადი უნდა მოიხსნას.
 */

/** იგივე ID, რაც კლიენტის პიქსელს (meta-pixel.tsx) — საჯაროა */
const PIXEL_ID = "4304539139799742";
const CAPI_ENDPOINT = `https://graph.facebook.com/v23.0/${PIXEL_ID}/events`;

/** Meta-ს user_data ჰეშირებული identifier-ებით — sha256, ნორმალიზებული */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashedUserData(input: {
  email?: string | null;
  phone?: string | null;
}): Record<string, string[]> {
  const data: Record<string, string[]> = {};
  const email = input.email?.trim().toLowerCase();
  if (email && email.includes("@")) data.em = [sha256(email)];
  if (input.phone) {
    /* Meta-ს ph ფორმატი: ციფრები ქვეყნის კოდით (995…) — toGeorgianMsisdn
       ზუსტად ამას აბრუნებს; უცხო ფორმატის ნომერი გამოტოვებულია */
    const msisdn = toGeorgianMsisdn(input.phone);
    if (msisdn) data.ph = [sha256(msisdn)];
  }
  return data;
}

/**
 * Purchase-ის ჩაყენება პასუხის შემდგომ რიგში (მფლობელის წესი, 2026-09-03):
 * Meta-ზე გაგზავნა webhook/action-ის პასუხის ᲨᲔᲛᲓᲔᲒ ეშვება (next/server
 * after) — ბანკის callback Meta-ს არასდროს ელოდება.
 */
export function queueCapiPurchase(
  input: Parameters<typeof sendCapiPurchase>[0],
): void {
  after(() => sendCapiPurchase(input));
}

/**
 * სერვერული Purchase — არასდროს throw-ობს და გადახდის ნაკადს ვერ შეაჩერებს.
 * true მხოლოდ რეალურ გაგზავნაზე. პირდაპირ ნუ გამოიძახებ მოთხოვნის
 * კონტექსტიდან — queueCapiPurchase გამოიყენე.
 */
export async function sendCapiPurchase(input: {
  orderRef: string;
  amountTetri: number;
  /** ეტაპი 5: მყიდველის თანხმობა ყიდვის მომენტიდან (analytics_consent სვეტი).
   *  false → ივენთი ᲡᲐᲔᲠᲗᲝᲓ არ იგზავნება: Meta identifier-ს (em/ph) ითხოვს,
   *  user_data-ს გარეშე Purchase-ს არ იღებს — „ბრაუზერში არა = სერვერიდანაც არა" */
  analyticsConsent: boolean;
  /** ადამიანური სახელი (content_name); ცარიელი → orderRef */
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  /** ქვიზის რეკომენდებული კლუბი (bookings/subscriptions.attribution) — იმავე
   *  გასაღებებით (source, quiz_club), რაც ბრაუზერის პიქსელს, რომ დედუპლიკაციის
   *  შემდეგ დარჩენილ Purchase-ს ქვიზის ნიშანი ყოველთვის ჰქონდეს */
  quizClub?: string | null;
}): Promise<boolean> {
  /* უფასო/პასით ჩანაწერი Purchase არ არის — დამცავი ბადე (ასეთი აქამდე
     ვერც მოაღწევდა: უფასო რეგისტრაცია pending-ს არ გადის) */
  if (input.amountTetri <= 0) return false;

  if (!input.analyticsConsent) {
    console.info(
      `[meta-capi] ${input.orderRef}: ანალიტიკის თანხმობა არ არის - Purchase გამოტოვებულია`,
    );
    return false;
  }

  const { META_CAPI_ACCESS_TOKEN, META_CAPI_TEST_CODE } = serverEnv();
  if (!META_CAPI_ACCESS_TOKEN) {
    /* production-შიც ხმამაღლა — ჩუმმა no-op-მა 2026-09-03-ს დიაგნოზი გაართულა */
    console.error(
      `[meta-capi] ტოკენი არ დგას - Purchase ${input.orderRef} (${toGel(input.amountTetri)} GEL) გამოტოვებულია`,
    );
    return false;
  }

  const userData = hashedUserData(input);
  if (Object.keys(userData).length === 0) {
    /* Meta identifier-ის გარეშე ივენთს არ იღებს */
    console.error(`[meta-capi] ${input.orderRef}: em/ph ვერ აიგო - გამოტოვებულია`);
    return false;
  }

  const meta = purchasePixelMeta(input.orderRef);
  const body: Record<string, unknown> = {
    access_token: META_CAPI_ACCESS_TOKEN,
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase-${input.orderRef}`,
        action_source: "website",
        event_source_url: `${siteConfig.url}/payment/status`,
        user_data: userData,
        custom_data: {
          value: toGel(input.amountTetri),
          currency: "GEL",
          content_name: input.title?.trim() || input.orderRef,
          content_ids: [meta.id],
          content_type: "product",
          content_category: meta.category,
          ...(input.quizClub
            ? { source: "quiz", quiz_club: input.quizClub }
            : {}),
        },
      },
    ],
  };
  if (META_CAPI_TEST_CODE) body.test_event_code = META_CAPI_TEST_CODE;

  try {
    const response = await fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[meta-capi] ${input.orderRef}: ${response.status} ${text.slice(0, 300)}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[meta-capi] ${input.orderRef}: გაგზავნა ჩავარდა`, error);
    return false;
  }
}
