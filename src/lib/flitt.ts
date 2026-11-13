import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { ORDER_REF_PREFIXES } from "@/lib/order-ref";

/**
 * Flitt (ქართული PSP) — ბარათით გადახდა.
 *
 * სატესტო და რეალური რეჟიმი **ერთსა და იმავე endpoint-ს** იყენებს; განსხვავება
 * მხოლოდ credentials-შია, ამიტომ გადართვა = ორი env-ცვლადის შეცვლა.
 * credentials-ის გარეშე `createCheckout` აბრუნებს null-ს და ბარათის ღილაკი
 * საიტზე საერთოდ არ ჩანს — გადმორიცხვის ნაკადი უცვლელად მუშაობს.
 *
 * თანხა: Flitt-ს `amount` მინორულ ერთეულებში სჭირდება, ანუ **თეთრებში** —
 * ჩვენი შენახული მნიშვნელობა უცვლელად გადადის (lib/money.ts).
 */

const CHECKOUT_URL = "https://pay.flitt.com/api/checkout/url";
const API_VERSION = "1.0.1";

/** რამდენ ხანს ძალაშია გადახდის ბმული (და ჩვენი ადგილის ჯავშანი) */
export const HOLD_MINUTES = 10;

/** Flitt-ის callback-ის წყარო-IP-ები (დოკუმენტაცია) — დამატებითი ფენა */
/** 45.154.88.64 დაფიქსირდა რეალურ callback-ებზე 2026-08-27-ს (Railway-ლოგი) */
export const FLITT_CALLBACK_IPS = [
  "54.154.216.60",
  "3.75.125.89",
  "45.154.88.64",
];

export type FlittMode = "off" | "preview" | "live";

/** ბარათის ღილაკის ხილვადობა: credentials + FLITT_MODE */
export function flittMode(): FlittMode {
  const { FLITT_MERCHANT_ID, FLITT_SECRET_KEY, FLITT_MODE } = serverEnv();
  if (!FLITT_MERCHANT_ID || !FLITT_SECRET_KEY) return "off";
  return FLITT_MODE === "live" ? "live" : "preview";
}

/**
 * ხელმოწერა: SHA1(secret | პარამეტრები ანბანურად, „|"-ით შეერთებული).
 * ცარიელი/null მნიშვნელობები **მთლიანად გამოირიცხება** (გამყოფიც არ ემატება).
 */
export function buildSignature(
  params: Record<string, string | number | undefined | null>,
  secretKey: string,
): string {
  const parts = Object.keys(params)
    .sort()
    .filter((key) => key !== "signature")
    .map((key) => params[key])
    .filter(
      (value): value is string | number =>
        value !== undefined && value !== null && String(value) !== "",
    )
    .map(String);

  return createHash("sha1")
    .update([secretKey, ...parts].join("|"))
    .digest("hex");
}

/**
 * callback-ის ხელმოწერის შემოწმება. `response_signature_string` **მხოლოდ
 * სატესტო რეჟიმში მოდის** — ორივე რეჟიმში ერთნაირად უნდა გამოირიცხოს,
 * თორემ რეალურზე გადასვლისას შემოწმება გატყდებოდა.
 */
export function verifyCallbackSignature(
  payload: Record<string, unknown>,
  secretKey: string,
): boolean {
  const received = payload.signature;
  if (typeof received !== "string" || received.length === 0) return false;

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "signature" || key === "response_signature_string") continue;
    if (value === undefined || value === null) continue;
    /* ჩადგმული ობიექტები/მასივები ხელმოწერაში არ მონაწილეობს */
    if (typeof value === "object") continue;
    params[key] = String(value);
  }

  const expected = buildSignature(params, secretKey);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Flitt-ის `order_id`-დან ჩვენი კოდის ამოღება. განმეორებით ცდაზე ბოლოში
 * „-2", „-3" ემატება (Flitt ერთსა და იმავე order_id-ს მეორედ არ იღებს).
 * პრეფიქსების სია order-ref.ts-იდან მოდის (ძველი SIV-ის ჩათვლით) —
 * ⚠ ეს callback-ის კარიბჭეა: აქ გამორჩენილი პრეფიქსი გადახდებს დაკარგავდა.
 */
const ORDER_ID_RE = new RegExp(
  `^((?:${ORDER_REF_PREFIXES.join("|")})-\\d+)(?:-\\d+)?$`,
);

export function parseOrderId(orderId: string): string | null {
  const match = ORDER_ID_RE.exec(orderId.trim());
  return match ? match[1] : null;
}

const STATUS_URL = "https://pay.flitt.com/api/status/order_id";

/**
 * შეკვეთის სტატუსის პირდაპირი კითხვა Flitt-ისგან — მოთხოვნას ჩვენ ვაწერთ
 * ხელს, ამიტომ პასუხი სანდოა callback-ის ხელმოწერისგან დამოუკიდებლად.
 * callback-ის fallback-არხია (route.ts): რეალურ callback-ებზე ხელმოწერის
 * ველების ნაკრები დოკუმენტაციას აცდენილია და ვერიფიკაცია ზოგჯერ ვერ გადის.
 */
export async function fetchOrderStatus(
  orderId: string,
): Promise<Record<string, unknown> | null> {
  const { FLITT_MERCHANT_ID, FLITT_SECRET_KEY } = serverEnv();
  if (!FLITT_MERCHANT_ID || !FLITT_SECRET_KEY) return null;

  const request: Record<string, string | number> = {
    version: API_VERSION,
    merchant_id: Number(FLITT_MERCHANT_ID),
    order_id: orderId,
  };
  request.signature = buildSignature(request, FLITT_SECRET_KEY);

  try {
    const response = await fetch(STATUS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request }),
      /* 7წმ და არა 10 — callback-პასუხის worst-case Flitt-ის ფანჯარაში ჩაეტიოს */
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) {
      console.error(`[flitt] status HTTP ${response.status}`);
      return null;
    }
    const body = (await response.json()) as {
      response?: Record<string, unknown>;
    };
    const result = body.response;
    if (!result || result.response_status !== "success") {
      console.error(
        `[flitt] status უარყოფილია: ${result?.error_code ?? "?"} ${result?.error_message ?? ""}`,
      );
      return null;
    }
    return result;
  } catch (error) {
    console.error("[flitt] status ჩავარდა", error);
    return null;
  }
}

export type CheckoutRequest = {
  orderRef: string;
  amountTetri: number;
  description: string;
  email?: string;
  /** სად დაბრუნდეს მომხმარებელი გადახდის შემდეგ */
  responseUrl: string;
  /** სად მოვიდეს ბანკის დამადასტურებელი შეტყობინება */
  callbackUrl: string;
};

/**
 * გადახდის სესიის შექმნა. აბრუნებს გადამისამართების URL-ს, ან null-ს —
 * credentials არ არის, ან Flitt-მა უარი თქვა (მიზეზი ლოგშია).
 * არასდროს throw-ობს: ყიდვა უკვე ჩაწერილია, გადახდა მოგვიანებითაც შეიძლება.
 */
export async function createCheckout(
  input: CheckoutRequest,
): Promise<{ checkoutUrl: string; paymentId: string | null } | null> {
  const { FLITT_MERCHANT_ID, FLITT_SECRET_KEY } = serverEnv();
  if (!FLITT_MERCHANT_ID || !FLITT_SECRET_KEY) return null;

  const request: Record<string, string | number> = {
    version: API_VERSION,
    order_id: input.orderRef,
    merchant_id: Number(FLITT_MERCHANT_ID),
    order_desc: input.description.slice(0, 1024),
    amount: input.amountTetri,
    currency: "GEL",
    lang: "ka",
    lifetime: HOLD_MINUTES * 60,
    response_url: input.responseUrl,
    server_callback_url: input.callbackUrl,
  };
  if (input.email) request.sender_email = input.email;

  request.signature = buildSignature(request, FLITT_SECRET_KEY);

  try {
    const response = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[flitt] checkout HTTP ${response.status}`);
      return null;
    }

    const body = (await response.json()) as {
      response?: {
        checkout_url?: string;
        payment_id?: string;
        response_status?: string;
        error_message?: string;
        error_code?: string;
      };
    };
    const result = body.response;

    if (result?.response_status !== "success" || !result.checkout_url) {
      console.error(
        `[flitt] checkout უარყოფილია: ${result?.error_code ?? "?"} ${result?.error_message ?? ""}`,
      );
      return null;
    }

    return {
      checkoutUrl: result.checkout_url,
      paymentId: result.payment_id ?? null,
    };
  } catch (error) {
    console.error("[flitt] checkout ჩავარდა", error);
    return null;
  }
}
